import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";

const directory = resolve(import.meta.dirname, "../.github/workflows");
let failures = 0;

for (const file of await readdir(directory)) {
  if (!file.endsWith(".yml") && !file.endsWith(".yaml")) continue;
  const source = await readFile(resolve(directory, file), "utf8");
  for (const [index, line] of source.split("\n").entries()) {
    const match = /^\s*uses:\s*([^@\s]+)@([^\s#]+)/.exec(line);
    if (!match) continue;
    if (!/^[a-f0-9]{40}$/.test(match[2])) {
      console.error(
        `${file}:${index + 1}: action '${match[1]}' is not pinned to a full commit SHA`
      );
      failures += 1;
    }
  }
}

if (failures > 0) process.exitCode = 1;
else console.log("workflow actions are pinned to immutable commit SHAs");
