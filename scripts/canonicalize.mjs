import { createHash } from "node:crypto";

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
    if (!Number.isFinite(value)) {
      throw new TypeError("canonical JSON does not support non-finite numbers");
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
  normalized.environment.entrypoint ??= ["/bin/sh", "-eu", "-c"];

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
  const canonicalEntries = structuredClone(entries).sort((left, right) =>
    Buffer.compare(Buffer.from(left.path, "utf8"), Buffer.from(right.path, "utf8"))
  );
  return sha256Digest(canonicalizeJson(canonicalEntries));
}
