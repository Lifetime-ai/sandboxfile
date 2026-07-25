import { readFile, readdir } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import process from "node:process";
import Ajv2020 from "ajv/dist/2020.js";
import { parse } from "yaml";

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

async function readYaml(path) {
  return parse(await readFile(path, "utf8"));
}

const cases = JSON.parse(
  await readFile(resolve(root, "conformance/cases.json"), "utf8")
);
let failures = 0;

for (const testCase of cases) {
  const path = resolve(root, "conformance", testCase.file);
  const errors = validate(await readYaml(path));
  const actualValid = errors.length === 0;

  if (actualValid !== testCase.valid) {
    console.error(
      `${testCase.file}: expected valid=${testCase.valid}, received ${JSON.stringify(errors)}`
    );
    failures += 1;
    continue;
  }

  if (!testCase.valid && !errors.some((error) => error.code === testCase.code)) {
    console.error(
      `${testCase.file}: expected ${testCase.code}, received ${JSON.stringify(errors)}`
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
    `conformance passed: ${cases.length} fixtures and ${exampleFiles.length} examples`
  );
}
