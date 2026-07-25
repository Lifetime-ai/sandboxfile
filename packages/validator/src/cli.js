#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import process from "node:process";
import {
  parseSandboxFile,
  validateDocument,
  validateLockPair
} from "./index.js";

function usage() {
  console.error(
    "Usage: sandboxfile validate <SandboxFile> [--lock <SandboxFile.lock>] [--json]"
  );
}

const arguments_ = process.argv.slice(2);
if (arguments_[0] !== "validate" || !arguments_[1]) {
  usage();
  process.exitCode = 2;
} else {
  const manifestPath = arguments_[1];
  const lockIndex = arguments_.indexOf("--lock");
  const json = arguments_.includes("--json");

  try {
    const manifest = parseSandboxFile(await readFile(manifestPath, "utf8"));
    let errors;
    if (lockIndex >= 0) {
      if (!arguments_[lockIndex + 1]) {
        throw new Error("--lock requires a path");
      }
      const lock = parseSandboxFile(
        await readFile(arguments_[lockIndex + 1], "utf8")
      );
      errors = validateLockPair(manifest, lock);
    } else {
      errors = validateDocument(manifest);
    }

    if (json) {
      console.log(JSON.stringify({ valid: errors.length === 0, errors }, null, 2));
    } else if (errors.length === 0) {
      console.log(`${manifestPath}: valid`);
    } else {
      for (const error of errors) {
        console.error(`${error.code} ${error.path}: ${error.message}`);
      }
    }
    if (errors.length > 0) process.exitCode = 1;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (json) {
      console.log(
        JSON.stringify(
          {
            valid: false,
            errors: [{ code: "PARSE", path: "/", message }]
          },
          null,
          2
        )
      );
    } else {
      console.error(`PARSE /: ${message}`);
    }
    process.exitCode = 1;
  }
}
