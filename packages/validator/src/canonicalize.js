import { createHash } from "node:crypto";
import { posix } from "node:path";

function assertUnicodeScalarString(value) {
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) {
        throw new TypeError("canonical JSON rejects unpaired Unicode surrogates");
      }
      index += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      throw new TypeError("canonical JSON rejects unpaired Unicode surrogates");
    }
  }
}

function jsonString(value) {
  if (typeof value === "string") {
    assertUnicodeScalarString(value);
    return JSON.stringify(value);
  }
  if (value === null || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) {
      throw new TypeError(
        "canonical SandboxFile JSON supports only safe integer numbers"
      );
    }
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => jsonString(entry)).join(",")}]`;
  }
  if (typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => {
        assertUnicodeScalarString(key);
        return `${JSON.stringify(key)}:${jsonString(value[key])}`;
      })
      .join(",")}}`;
  }
  throw new TypeError(`canonical JSON does not support ${typeof value}`);
}

export function canonicalizeJson(value) {
  return Buffer.from(jsonString(value), "utf8");
}

export function applySandboxFileDefaults(manifest) {
  const normalized = structuredClone(manifest);

  normalized.environment.workdir ??= "/workspace";
  normalized.execution ??= {};
  normalized.execution.shell ??= ["/bin/sh", "-eu", "-c"];

  normalized.lifecycle ??= {};
  normalized.lifecycle.cleanup ??= "destroy";

  normalized.network ??= {};
  normalized.network.default ??= "deny";
  for (const ingress of normalized.network.ingress ?? []) {
    ingress.visibility ??= "private";
    ingress.protocol ??= "http";
  }

  const sources = [
    normalized.sources?.primary,
    ...(normalized.sources?.repositories ?? [])
  ].filter(Boolean);
  for (const source of sources) {
    source.access ??= "read-write";
  }

  for (const credential of normalized.credentials ?? []) {
    credential.delivery ??= "proxy";
  }

  for (const extension of Object.values(normalized.extensions ?? {})) {
    extension.critical ??= true;
  }

  return normalized;
}

export function sha256Digest(bytes) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

export function digestSandboxFile(manifest) {
  return sha256Digest(canonicalizeJson(applySandboxFileDefaults(manifest)));
}

export function digestContextEntries(entries) {
  if (!Array.isArray(entries)) {
    throw new TypeError("context entries must be an array");
  }
  const paths = new Set();
  for (const entry of entries) {
    if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
      throw new TypeError("each context entry must be an object");
    }
    if (
      typeof entry.path !== "string" ||
      entry.path.length === 0 ||
      entry.path.startsWith("/") ||
      entry.path.includes("\\") ||
      entry.path.includes("\0") ||
      entry.path.split("/").some((segment) => segment === "" || segment === "." || segment === "..")
    ) {
      throw new TypeError(`invalid context entry path '${entry.path}'`);
    }
    if (paths.has(entry.path)) {
      throw new TypeError(`duplicate context entry path '${entry.path}'`);
    }
    paths.add(entry.path);

    const keys = Object.keys(entry).sort();
    if (entry.type === "directory") {
      if (
        JSON.stringify(keys) !==
          JSON.stringify(["mode", "path", "type"]) ||
        entry.mode !== "0755"
      ) {
        throw new TypeError(`invalid directory entry '${entry.path}'`);
      }
    } else if (entry.type === "file") {
      if (
        JSON.stringify(keys) !==
          JSON.stringify(["digest", "mode", "path", "size", "type"]) ||
        !["0644", "0755"].includes(entry.mode) ||
        !/^(?:0|[1-9][0-9]*)$/.test(entry.size) ||
        !/^sha256:[a-f0-9]{64}$/.test(entry.digest)
      ) {
        throw new TypeError(`invalid file entry '${entry.path}'`);
      }
    } else if (entry.type === "symlink") {
      if (
        JSON.stringify(keys) !==
          JSON.stringify(["mode", "path", "target", "type"]) ||
        entry.mode !== "120000"
      ) {
        throw new TypeError(`invalid symlink entry '${entry.path}'`);
      }
      if (
        typeof entry.target !== "string" ||
        entry.target.length === 0 ||
        entry.target.startsWith("/") ||
        entry.target.includes("\\") ||
        entry.target.includes("\0")
      ) {
        throw new TypeError(`invalid symlink target for '${entry.path}'`);
      }
      const resolved = posix.normalize(
        posix.join(posix.dirname(entry.path), entry.target)
      );
      if (resolved === ".." || resolved.startsWith("../")) {
        throw new TypeError(
          `symlink target for '${entry.path}' escapes the context root`
        );
      }
    } else {
      throw new TypeError(`unsupported context entry type '${entry.type}'`);
    }
  }

  const canonicalEntries = structuredClone(entries).sort((left, right) =>
    Buffer.compare(Buffer.from(left.path, "utf8"), Buffer.from(right.path, "utf8"))
  );
  return sha256Digest(canonicalizeJson(canonicalEntries));
}
