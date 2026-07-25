import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import process from "node:process";
import { compileFromFile } from "json-schema-to-typescript";

const root = resolve(import.meta.dirname, "..");
const checkOnly = process.argv.includes("--check");
const bannerComment = `/**
 * Generated from the normative SandboxFile JSON Schema.
 * Do not edit directly. Run \`pnpm generate\`.
 */`;

const targets = [
  {
    input: "spec/v1alpha1/SandboxFile.schema.json",
    output: "packages/typescript/src/generated/SandboxFile.ts"
  },
  {
    input: "spec/v1alpha1/SandboxFile.lock.schema.json",
    output: "packages/typescript/src/generated/SandboxFileLock.ts"
  }
];

let stale = false;

for (const target of targets) {
  const generated = await compileFromFile(resolve(root, target.input), {
    bannerComment,
    additionalProperties: false,
    enableConstEnums: false,
    format: true,
    style: {
      bracketSpacing: true,
      printWidth: 100,
      semi: true,
      singleQuote: false,
      tabWidth: 2,
      trailingComma: "none",
      useTabs: false
    }
  });

  const outputPath = resolve(root, target.output);

  if (checkOnly) {
    let current = "";
    try {
      current = await readFile(outputPath, "utf8");
    } catch {
      // A missing output is stale.
    }

    if (current !== generated) {
      console.error(`${target.output} is stale. Run pnpm generate.`);
      stale = true;
    }
  } else {
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, generated, "utf8");
    console.log(`generated ${target.output}`);
  }
}

if (stale) {
  process.exitCode = 1;
}
