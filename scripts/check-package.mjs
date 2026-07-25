import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import process from "node:process";

const temporaryDirectory = await mkdtemp(join(tmpdir(), "sandboxfile-pack-"));
const npm = process.platform === "win32" ? "npm.cmd" : "npm";

try {
  const result = spawnSync(npm, ["pack", "--dry-run"], {
    cwd: new URL("..", import.meta.url),
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
    process.exitCode = result.status ?? 1;
  }
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}
