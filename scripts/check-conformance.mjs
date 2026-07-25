import { readFile, readdir } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";
import process from "node:process";
import {
  digestContextEntries,
  digestSandboxFile,
  parseSandboxFile,
  validateDocument,
  validateLockPair
} from "../packages/validator/src/index.js";

const root = resolve(import.meta.dirname, "..");

async function readYaml(path) {
  return parseSandboxFile(await readFile(path, "utf8"));
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(path)));
    else files.push(path);
  }
  return files;
}

async function validateCase(testCase) {
  try {
    if (testCase.file) {
      return validateDocument(
        await readYaml(resolve(root, "conformance", testCase.file))
      );
    }
    const manifest = await readYaml(
      resolve(root, "conformance", testCase.manifest)
    );
    const lock = await readYaml(resolve(root, "conformance", testCase.lock));
    return validateLockPair(manifest, lock);
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
for (const directory of [
  resolve(root, "conformance/valid"),
  resolve(root, "conformance/invalid")
]) {
  for (const path of await walk(directory)) {
    if (![".yaml", ".yml", ".json"].includes(extname(path))) continue;
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
  const display = testCase.file ?? `${testCase.manifest} + ${testCase.lock}`;

  if (actualValid !== testCase.valid) {
    console.error(
      `${display}: expected valid=${testCase.valid}, received ${JSON.stringify(errors)}`
    );
    failures += 1;
  } else if (
    !testCase.valid &&
    !errors.some((error) => error.code === testCase.code)
  ) {
    console.error(
      `${display}: expected ${testCase.code}, received ${JSON.stringify(errors)}`
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
for (const vector of digestVectors.invalidContexts ?? []) {
  try {
    digestContextEntries(vector.entries);
    console.error(`invalid context '${vector.name}' unexpectedly produced a digest`);
    failures += 1;
  } catch {
    // Expected: invalid context entry lists fail closed.
  }
}

let exampleCount = 0;
for (const directoryEntry of await readdir(resolve(root, "examples"), {
  withFileTypes: true
})) {
  if (!directoryEntry.isDirectory()) continue;
  const exampleDirectory = resolve(root, "examples", directoryEntry.name);
  const files = await readdir(exampleDirectory);
  if (!files.includes("SandboxFile")) continue;

  const manifest = await readYaml(resolve(exampleDirectory, "SandboxFile"));
  exampleCount += 1;
  const manifestErrors = validateDocument(manifest);
  if (manifestErrors.length > 0) {
    console.error(
      `${directoryEntry.name}/SandboxFile: invalid example: ${JSON.stringify(manifestErrors)}`
    );
    failures += 1;
  }

  if (files.includes("SandboxFile.lock")) {
    const lock = await readYaml(resolve(exampleDirectory, "SandboxFile.lock"));
    exampleCount += 1;
    const pairErrors = validateLockPair(manifest, lock);
    if (pairErrors.length > 0) {
      console.error(
        `${directoryEntry.name}/SandboxFile.lock: invalid example pair: ${JSON.stringify(pairErrors)}`
      );
      failures += 1;
    }
  }
}

if (failures > 0) {
  console.error(`${failures} conformance check(s) failed.`);
  process.exitCode = 1;
} else {
  console.log(
    `conformance passed: ${cases.length} fixtures, ${exampleCount} examples, and ${digestVectors.manifests.length + digestVectors.contexts.length + (digestVectors.invalidContexts?.length ?? 0)} digest vectors`
  );
}
