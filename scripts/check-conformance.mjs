import { readFile, readdir, stat } from "node:fs/promises";
import { extname, join, posix, relative, resolve } from "node:path";
import process from "node:process";
import Ajv2020 from "ajv/dist/2020.js";
import { parseAllDocuments } from "yaml";
import {
  digestContextEntries,
  digestSandboxFile
} from "./canonicalize.mjs";

const root = resolve(import.meta.dirname, "..");
const manifestSchema = JSON.parse(
  await readFile(resolve(root, "spec/v1alpha1/SandboxFile.schema.json"), "utf8")
);
const lockSchema = JSON.parse(
  await readFile(resolve(root, "spec/v1alpha1/SandboxFile.lock.schema.json"), "utf8")
);

const ajv = new Ajv2020({
  allErrors: true,
  strict: true
});
const validateManifestSchema = ajv.compile(manifestSchema);
const validateLockSchema = ajv.compile(lockSchema);

function schemaValidatorFor(document) {
  if (document?.kind === "SandboxLock") {
    return validateLockSchema;
  }
  return validateManifestSchema;
}

function schemaErrors(validator) {
  return (validator.errors ?? []).map((error) => ({
    code: "SCHEMA",
    path: error.instancePath || "/",
    message: error.message ?? error.keyword
  }));
}

function parseCpu(value) {
  if (value.endsWith("m")) {
    return Number(value.slice(0, -1));
  }
  return Number(value) * 1000;
}

function parseStorage(value) {
  const match = /^([1-9][0-9]*)(Ki|Mi|Gi|Ti)$/.exec(value);
  if (!match) {
    return Number.NaN;
  }
  const factors = {
    Ki: 1024,
    Mi: 1024 ** 2,
    Gi: 1024 ** 3,
    Ti: 1024 ** 4
  };
  return Number(match[1]) * factors[match[2]];
}

function semanticErrors(document) {
  if (document.kind === "SandboxLock") {
    const errors = [];
    const repositoryNames = new Set();
    for (const repository of document.sources?.repositories ?? []) {
      if (repositoryNames.has(repository.name)) {
        errors.push({
          code: "SF1106",
          path: "/sources/repositories",
          message: `duplicate resolved repository name '${repository.name}'`
        });
      }
      repositoryNames.add(repository.name);
    }
    return errors;
  }

  if (document.kind !== "Sandbox") {
    return [];
  }

  const errors = [];
  const secretName =
    /(?:^|_)(?:api_?key|access_?key|credential|password|private_?key|secret|token)(?:_|$)/i;

  for (const name of Object.keys(document.environment?.env ?? {})) {
    if (secretName.test(name)) {
      errors.push({
        code: "SF1001",
        path: `/environment/env/${name}`,
        message: "secret-bearing variables are forbidden; use a logical credential request"
      });
    }
  }

  const tasks = document.tasks ?? {};
  for (const [name, task] of Object.entries(tasks)) {
    for (const dependency of task.dependsOn ?? []) {
      if (!(dependency in tasks)) {
        errors.push({
          code: "SF1002",
          path: `/tasks/${name}/dependsOn`,
          message: `unknown task dependency '${dependency}'`
        });
      }
    }
  }

  const visiting = new Set();
  const visited = new Set();
  const cycleTasks = new Set();

  function visit(name) {
    if (visiting.has(name)) {
      cycleTasks.add(name);
      return;
    }
    if (visited.has(name) || !(name in tasks)) {
      return;
    }

    visiting.add(name);
    for (const dependency of tasks[name].dependsOn ?? []) {
      visit(dependency);
    }
    visiting.delete(name);
    visited.add(name);
  }

  for (const name of Object.keys(tasks)) {
    visit(name);
  }

  if (cycleTasks.size > 0) {
    errors.push({
      code: "SF1003",
      path: "/tasks",
      message: "task dependency graph contains a cycle"
    });
  }

  const repositoryNames = new Set();
  for (const repository of document.sources?.repositories ?? []) {
    if (repositoryNames.has(repository.name)) {
      errors.push({
        code: "SF1004",
        path: "/sources/repositories",
        message: `duplicate repository name '${repository.name}'`
      });
    }
    repositoryNames.add(repository.name);
  }

  const sourcePaths = [];
  if (document.sources?.primary) {
    sourcePaths.push({
      name: "primary",
      path: posix.normalize(document.sources.primary.path)
    });
  }
  for (const repository of document.sources?.repositories ?? []) {
    sourcePaths.push({
      name: repository.name,
      path: posix.normalize(repository.path)
    });
  }
  for (let left = 0; left < sourcePaths.length; left += 1) {
    for (let right = left + 1; right < sourcePaths.length; right += 1) {
      const leftPath = sourcePaths[left].path;
      const rightPath = sourcePaths[right].path;
      if (
        leftPath === rightPath ||
        leftPath.startsWith(`${rightPath}/`) ||
        rightPath.startsWith(`${leftPath}/`)
      ) {
        errors.push({
          code: "SF1006",
          path: "/sources",
          message: `source destinations '${sourcePaths[left].name}' and '${sourcePaths[right].name}' overlap`
        });
      }
    }
  }

  const credentialNames = new Set();
  for (const credential of document.credentials ?? []) {
    if (credentialNames.has(credential.name)) {
      errors.push({
        code: "SF1007",
        path: "/credentials",
        message: `duplicate credential request name '${credential.name}'`
      });
    }
    credentialNames.add(credential.name);
  }

  const ranges = [
    {
      path: "/resources/cpu",
      range: document.resources?.cpu,
      parse: parseCpu
    },
    {
      path: "/resources/memory",
      range: document.resources?.memory,
      parse: parseStorage
    }
  ];

  for (const item of ranges) {
    if (
      item.range?.request &&
      item.range?.limit &&
      item.parse(item.range.request) > item.parse(item.range.limit)
    ) {
      errors.push({
        code: "SF1005",
        path: item.path,
        message: "resource request exceeds limit"
      });
    }
  }

  return errors;
}

function validate(document) {
  const validator = schemaValidatorFor(document);
  if (!validator(document)) {
    return schemaErrors(validator);
  }
  return semanticErrors(document);
}

function sourceMatches(manifestSource, lockedSource) {
  if (!manifestSource || !lockedSource || manifestSource.type !== lockedSource.type) {
    return false;
  }
  if (
    manifestSource.path !== lockedSource.path ||
    (manifestSource.access ?? "read-write") !==
      (lockedSource.access ?? "read-write")
  ) {
    return false;
  }
  if (manifestSource.type === "context") {
    return true;
  }
  return (
    manifestSource.url === lockedSource.url &&
    (manifestSource.ref ?? null) === (lockedSource.requestedRef ?? null)
  );
}

function lockPairErrors(manifest, lock) {
  const errors = [];

  if (manifest.metadata.name !== lock.metadata.name) {
    errors.push({
      code: "SF1101",
      path: "/metadata/name",
      message: "lock metadata name does not match the manifest"
    });
  }

  if (digestSandboxFile(manifest) !== lock.metadata.sandboxFileDigest) {
    errors.push({
      code: "SF1102",
      path: "/metadata/sandboxFileDigest",
      message: "lock digest does not match the canonical manifest"
    });
  }

  if (manifest.environment.image !== lock.environment.image.reference) {
    errors.push({
      code: "SF1103",
      path: "/environment/image/reference",
      message: "locked image reference does not match the manifest"
    });
  }

  const manifestPrimary = manifest.sources?.primary;
  const lockedPrimary = lock.sources?.primary;
  if (
    Boolean(manifestPrimary) !== Boolean(lockedPrimary) ||
    (manifestPrimary && !sourceMatches(manifestPrimary, lockedPrimary))
  ) {
    errors.push({
      code: "SF1104",
      path: "/sources/primary",
      message: "locked primary source does not match the manifest"
    });
  }

  const manifestRepositories = new Map(
    (manifest.sources?.repositories ?? []).map((repository) => [
      repository.name,
      repository
    ])
  );
  const lockedRepositories = new Map(
    (lock.sources?.repositories ?? []).map((repository) => [
      repository.name,
      repository
    ])
  );
  const repositoryNames = new Set([
    ...manifestRepositories.keys(),
    ...lockedRepositories.keys()
  ]);
  if (
    manifestRepositories.size !== lockedRepositories.size ||
    [...repositoryNames].some(
      (name) =>
        !sourceMatches(
          manifestRepositories.get(name),
          lockedRepositories.get(name)
        )
    )
  ) {
    errors.push({
      code: "SF1105",
      path: "/sources/repositories",
      message: "locked additional sources do not exactly match the manifest"
    });
  }

  return errors;
}

async function readYaml(path) {
  const file = await stat(path);
  if (file.size > 1024 * 1024) {
    throw new Error("document exceeds the 1 MiB conformance limit");
  }
  const documents = parseAllDocuments(await readFile(path, "utf8"), {
    maxAliasCount: 50,
    schema: "core",
    uniqueKeys: true
  });
  if (documents.length !== 1) {
    throw new Error("expected exactly one YAML or JSON document");
  }
  if (documents[0].errors.length > 0 || documents[0].warnings.length > 0) {
    throw new Error(
      [...documents[0].errors, ...documents[0].warnings]
        .map((error) => error.message)
        .join("; ")
    );
  }
  return documents[0].toJS({ maxAliasCount: 50 });
}

async function validateCase(testCase) {
  try {
    if (testCase.file) {
      return validate(
        await readYaml(resolve(root, "conformance", testCase.file))
      );
    }

    const manifest = await readYaml(
      resolve(root, "conformance", testCase.manifest)
    );
    const lock = await readYaml(resolve(root, "conformance", testCase.lock));
    const manifestErrors = validate(manifest);
    const lockErrors = validate(lock);
    if (manifestErrors.length > 0 || lockErrors.length > 0) {
      return [...manifestErrors, ...lockErrors];
    }
    return lockPairErrors(manifest, lock);
  } catch (error) {
    return [
      {
        code: "PARSE",
        path: "/",
        message: error instanceof Error ? error.message : String(error)
      }
    ];
  }
}

const cases = JSON.parse(
  await readFile(resolve(root, "conformance/cases.json"), "utf8")
);
let failures = 0;

const referencedFixtures = new Set(
  cases.flatMap((testCase) =>
    [testCase.file, testCase.manifest, testCase.lock].filter(Boolean)
  )
);
const fixtureDirectories = [
  resolve(root, "conformance/valid"),
  resolve(root, "conformance/invalid")
];
for (const directory of fixtureDirectories) {
  for (const path of await walk(directory)) {
    if (![".yaml", ".yml", ".json"].includes(extname(path))) {
      continue;
    }
    const fixture = relative(resolve(root, "conformance"), path);
    if (!referencedFixtures.has(fixture)) {
      console.error(`${fixture}: conformance fixture is not listed in cases.json`);
      failures += 1;
    }
  }
}

for (const testCase of cases) {
  const errors = await validateCase(testCase);
  const actualValid = errors.length === 0;

  if (actualValid !== testCase.valid) {
    console.error(
      `${testCase.file ?? `${testCase.manifest} + ${testCase.lock}`}: expected valid=${testCase.valid}, received ${JSON.stringify(errors)}`
    );
    failures += 1;
    continue;
  }

  if (!testCase.valid && !errors.some((error) => error.code === testCase.code)) {
    console.error(
      `${testCase.file ?? `${testCase.manifest} + ${testCase.lock}`}: expected ${testCase.code}, received ${JSON.stringify(errors)}`
    );
    failures += 1;
  }
}

const digestVectors = JSON.parse(
  await readFile(resolve(root, "conformance/digests.json"), "utf8")
);
for (const vector of digestVectors.manifests) {
  const actual = digestSandboxFile(
    await readYaml(resolve(root, "conformance", vector.file))
  );
  if (actual !== vector.digest) {
    console.error(
      `${vector.file}: expected digest ${vector.digest}, received ${actual}`
    );
    failures += 1;
  }
}
for (const vector of digestVectors.contexts) {
  const actual = digestContextEntries(vector.entries);
  if (actual !== vector.digest) {
    console.error(
      `context digest: expected ${vector.digest}, received ${actual}`
    );
    failures += 1;
  }
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(path)));
    } else {
      files.push(path);
    }
  }
  return files;
}

const exampleFiles = (await walk(resolve(root, "examples"))).filter((path) => {
  const name = path.split("/").at(-1);
  return name === "SandboxFile" || name === "SandboxFile.lock";
});

for (const path of exampleFiles) {
  const errors = validate(await readYaml(path));
  if (errors.length > 0) {
    console.error(`${path}: example is invalid: ${JSON.stringify(errors)}`);
    failures += 1;
  }
}

const schemaFiles = [
  resolve(root, "spec/v1alpha1/SandboxFile.schema.json"),
  resolve(root, "spec/v1alpha1/SandboxFile.lock.schema.json")
];
for (const path of schemaFiles) {
  if (extname(path) !== ".json") {
    console.error(`${path}: schemas must use JSON`);
    failures += 1;
  }
}

if (failures > 0) {
  console.error(`${failures} conformance check(s) failed.`);
  process.exitCode = 1;
} else {
  console.log(
    `conformance passed: ${cases.length} fixtures, ${exampleFiles.length} examples, and ${digestVectors.manifests.length + digestVectors.contexts.length} digest vectors`
  );
}
