import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import process from "node:process";

const root = resolve(import.meta.dirname, "..");
const temporaryDirectory = await mkdtemp(join(tmpdir(), "sandboxfile-pack-"));
const npm = process.platform === "win32" ? "npm.cmd" : "npm";

const packages = [
  {
    name: "@sandboxfile/schema",
    cwd: root,
    expected: [
      "LICENSE",
      "README.md",
      "SPECIFICATION.md",
      "package.json",
      "spec/v1alpha1/SandboxFile.lock.schema.json",
      "spec/v1alpha1/SandboxFile.schema.json",
      "spec/v1alpha1/canonicalization.md",
      "spec/v1alpha1/compatibility.md",
      "spec/v1alpha1/sandboxfile.md"
    ]
  },
  {
    name: "@sandboxfile/types",
    cwd: resolve(root, "packages/typescript"),
    clean: resolve(root, "packages/typescript/dist"),
    expected: [
      "LICENSE",
      "README.md",
      "dist/generated/SandboxFile.d.ts",
      "dist/generated/SandboxFile.js",
      "dist/generated/SandboxFileLock.d.ts",
      "dist/generated/SandboxFileLock.js",
      "dist/index.d.ts",
      "dist/index.js",
      "package.json"
    ]
  }
];

let failed = false;

try {
  const rootLicense = await readFile(resolve(root, "LICENSE"), "utf8");
  const typesLicense = await readFile(
    resolve(root, "packages/typescript/LICENSE"),
    "utf8"
  );
  if (rootLicense !== typesLicense) {
    console.error("@sandboxfile/types: LICENSE must match the repository license");
    failed = true;
  }

  for (const packageConfig of packages) {
    if (packageConfig.clean) {
      await rm(packageConfig.clean, { recursive: true, force: true });
    }

    const result = spawnSync(npm, ["pack", "--dry-run", "--json"], {
      cwd: packageConfig.cwd,
      encoding: "utf8",
      env: {
        ...process.env,
        NPM_CONFIG_CACHE: join(temporaryDirectory, "cache"),
        npm_config_cache: join(temporaryDirectory, "cache")
      }
    });

    process.stdout.write(result.stdout ?? "");
    process.stderr.write(result.stderr ?? "");

    if (result.status !== 0) {
      failed = true;
      continue;
    }

    const jsonStart = result.stdout.indexOf("[");
    let pack;
    try {
      pack = JSON.parse(result.stdout.slice(jsonStart))[0];
    } catch {
      console.error(`${packageConfig.name}: npm pack did not return JSON metadata`);
      failed = true;
      continue;
    }

    const actual = pack.files.map((file) => file.path).sort();
    const expected = [...packageConfig.expected].sort();
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      console.error(
        `${packageConfig.name}: unexpected package contents\nexpected=${JSON.stringify(expected)}\nactual=${JSON.stringify(actual)}`
      );
      failed = true;
    }
  }
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}

if (failed) {
  process.exitCode = 1;
}
