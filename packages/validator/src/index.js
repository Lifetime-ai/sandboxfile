import { createRequire } from "node:module";
import { posix } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import { parseAllDocuments } from "yaml";
import {
  applySandboxFileDefaults,
  canonicalizeJson,
  digestContextEntries,
  digestSandboxFile,
  sha256Digest
} from "./canonicalize.js";

const require = createRequire(import.meta.url);
const manifestSchema = require(
  "@sandboxfile/schema/v1alpha1/SandboxFile.schema.json"
);
const lockSchema = require(
  "@sandboxfile/schema/v1alpha1/SandboxFile.lock.schema.json"
);

const ajv = new Ajv2020({ allErrors: true, strict: true });
const validateManifestSchema = ajv.compile(manifestSchema);
const validateLockSchema = ajv.compile(lockSchema);
const hasOwn = (object, key) =>
  Object.prototype.hasOwnProperty.call(object, key);

function diagnostic(code, path, message) {
  return { code, path, message };
}

function schemaErrors(validator) {
  return (validator.errors ?? []).map((error) =>
    diagnostic(
      "SCHEMA",
      error.instancePath || "/",
      error.message ?? error.keyword
    )
  );
}

function assertBoundedDepth(value, maximumDepth = 100, depth = 0) {
  if (depth > maximumDepth) {
    throw new Error(`document nesting exceeds ${maximumDepth} levels`);
  }
  if (Array.isArray(value)) {
    for (const entry of value) {
      assertBoundedDepth(entry, maximumDepth, depth + 1);
    }
  } else if (value !== null && typeof value === "object") {
    for (const entry of Object.values(value)) {
      assertBoundedDepth(entry, maximumDepth, depth + 1);
    }
  }
}

export function parseSandboxFile(source, options = {}) {
  const maximumBytes = options.maximumBytes ?? 1024 * 1024;
  if (Buffer.byteLength(source, "utf8") > maximumBytes) {
    throw new Error(`document exceeds the ${maximumBytes} byte limit`);
  }

  const documents = parseAllDocuments(source, {
    maxAliasCount: options.maximumAliases ?? 50,
    schema: "core",
    uniqueKeys: true
  });
  if (documents.length !== 1) {
    throw new Error("expected exactly one YAML or JSON document");
  }
  const messages = [...documents[0].errors, ...documents[0].warnings];
  if (messages.length > 0) {
    throw new Error(messages.map((error) => error.message).join("; "));
  }

  const document = documents[0].toJS({
    maxAliasCount: options.maximumAliases ?? 50
  });
  assertBoundedDepth(document, options.maximumDepth ?? 100);
  return document;
}

function parseCpu(value) {
  return value.endsWith("m")
    ? Number(value.slice(0, -1))
    : Number(value) * 1000;
}

function parseStorage(value) {
  const match = /^([1-9][0-9]*)(Ki|Mi|Gi|Ti)$/.exec(value);
  if (!match) return Number.NaN;
  const factors = {
    Ki: 1024,
    Mi: 1024 ** 2,
    Gi: 1024 ** 3,
    Ti: 1024 ** 4
  };
  return Number(match[1]) * factors[match[2]];
}

function validateLockSemantics(document) {
  const errors = [];
  const names = new Set();
  for (const repository of document.sources?.repositories ?? []) {
    if (names.has(repository.name)) {
      errors.push(
        diagnostic(
          "SF1106",
          "/sources/repositories",
          `duplicate resolved repository name '${repository.name}'`
        )
      );
    }
    names.add(repository.name);
  }
  for (const [path, value] of [
    ["/sources/primary/path", document.sources?.primary?.path],
    ...(document.sources?.repositories ?? []).map((repository, index) => [
      `/sources/repositories/${index}/path`,
      repository.path
    ])
  ]) {
    if (value && !isCanonicalAbsolutePath(value)) {
      errors.push(
        diagnostic("SF1110", path, "locked source path is not canonical")
      );
    }
  }
  return errors;
}

function isCanonicalAbsolutePath(value) {
  return (
    typeof value === "string" &&
    value.startsWith("/") &&
    !value.includes("\\") &&
    !value.includes("\0") &&
    posix.normalize(value) === value
  );
}

function isCanonicalArtifactPath(value) {
  return (
    typeof value === "string" &&
    !value.startsWith("/") &&
    !value.startsWith("./") &&
    !value.includes("\\") &&
    !value.includes("\0") &&
    posix.normalize(value) === value
  );
}

function validateManifestSemantics(document) {
  const errors = [];
  const secretName =
    /(?:^|_)(?:api_?key|access_?key|credential|password|private_?key|secret|token)(?:_|$)/i;

  for (const name of Object.keys(document.environment?.env ?? {})) {
    if (secretName.test(name)) {
      errors.push(
        diagnostic(
          "SF1001",
          `/environment/env/${name}`,
          "secret-bearing variables are forbidden; use a logical credential request"
        )
      );
    }
  }

  const tasks = document.tasks ?? {};
  for (const [name, task] of Object.entries(tasks)) {
    for (const dependency of task.dependsOn ?? []) {
      if (!hasOwn(tasks, dependency)) {
        errors.push(
          diagnostic(
            "SF1002",
            `/tasks/${name}/dependsOn`,
            `unknown task dependency '${dependency}'`
          )
        );
      }
    }
  }

  const visiting = new Set();
  const visited = new Set();
  let cycle = false;
  function visit(name) {
    if (visiting.has(name)) {
      cycle = true;
      return;
    }
    if (visited.has(name) || !hasOwn(tasks, name)) return;
    visiting.add(name);
    for (const dependency of tasks[name].dependsOn ?? []) visit(dependency);
    visiting.delete(name);
    visited.add(name);
  }
  for (const name of Object.keys(tasks)) visit(name);
  if (cycle) {
    errors.push(
      diagnostic("SF1003", "/tasks", "task dependency graph contains a cycle")
    );
  }

  const repositoryNames = new Set();
  for (const repository of document.sources?.repositories ?? []) {
    if (repositoryNames.has(repository.name)) {
      errors.push(
        diagnostic(
          "SF1004",
          "/sources/repositories",
          `duplicate repository name '${repository.name}'`
        )
      );
    }
    repositoryNames.add(repository.name);
  }

  const sourcePaths = [];
  if (document.sources?.primary) {
    sourcePaths.push({
      name: "primary",
      path: document.sources.primary.path.replace(/\/+$/, "") || "/"
    });
  }
  for (const repository of document.sources?.repositories ?? []) {
    sourcePaths.push({
      name: repository.name,
      path: repository.path.replace(/\/+$/, "") || "/"
    });
  }

  for (const [path, value] of [
    ["/environment/workdir", document.environment.workdir],
    ["/sources/primary/path", document.sources?.primary?.path],
    ...(document.sources?.repositories ?? []).map((repository, index) => [
      `/sources/repositories/${index}/path`,
      repository.path
    ]),
    ...(document.persistence?.caches ?? []).map((cache, index) => [
      `/persistence/caches/${index}/path`,
      cache.path
    ])
  ]) {
    if (value && !isCanonicalAbsolutePath(value)) {
      errors.push(
        diagnostic("SF1010", path, "absolute path is not canonical")
      );
    }
  }
  for (const [index, artifact] of (
    document.outputs?.artifacts ?? []
  ).entries()) {
    if (!isCanonicalArtifactPath(artifact.path)) {
      errors.push(
        diagnostic(
          "SF1010",
          `/outputs/artifacts/${index}/path`,
          "artifact path is not canonical"
        )
      );
    }
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
        errors.push(
          diagnostic(
            "SF1006",
            "/sources",
            `source destinations '${sourcePaths[left].name}' and '${sourcePaths[right].name}' overlap`
          )
        );
      }
    }
  }

  const credentialNames = new Set();
  for (const credential of document.credentials ?? []) {
    if (credentialNames.has(credential.name)) {
      errors.push(
        diagnostic(
          "SF1007",
          "/credentials",
          `duplicate credential request name '${credential.name}'`
        )
      );
    }
    credentialNames.add(credential.name);
  }

  const egressNames = new Set();
  for (const rule of document.network?.allow ?? []) {
    if (egressNames.has(rule.name)) {
      errors.push(
        diagnostic(
          "SF1009",
          "/network/allow",
          `duplicate egress rule name '${rule.name}'`
        )
      );
    }
    egressNames.add(rule.name);
    for (const binding of rule.credentialBindings ?? []) {
      if (!credentialNames.has(binding)) {
        errors.push(
          diagnostic(
            "SF1008",
            `/network/allow/${rule.name}/credentialBindings`,
            `unknown credential binding '${binding}'`
          )
        );
      }
    }
  }

  const ranges = [
    ["/resources/cpu", document.resources?.cpu, parseCpu],
    ["/resources/memory", document.resources?.memory, parseStorage]
  ];
  for (const [path, range, parse] of ranges) {
    if (
      range?.request &&
      range?.limit &&
      parse(range.request) > parse(range.limit)
    ) {
      errors.push(
        diagnostic("SF1005", path, "resource request exceeds limit")
      );
    }
  }

  return errors;
}

export function validateDocument(document) {
  const validator =
    document?.kind === "SandboxLock"
      ? validateLockSchema
      : validateManifestSchema;
  if (!validator(document)) return schemaErrors(validator);
  if (document.kind === "SandboxLock") return validateLockSemantics(document);
  if (document.kind === "Sandbox") return validateManifestSemantics(document);
  return [];
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
  if (manifestSource.type === "context") return true;
  return (
    manifestSource.url === lockedSource.url &&
    (manifestSource.ref ?? null) === (lockedSource.requestedRef ?? null)
  );
}

function descriptorMatches(left, right) {
  return (
    left.mediaType === right.mediaType &&
    left.digest === right.digest &&
    left.size === right.size
  );
}

function platformMatches(left, right) {
  return (
    left.os === right.os &&
    left.architecture === right.architecture &&
    (left.variant ?? null) === (right.variant ?? null)
  );
}

export function validateLockPair(manifest, lock) {
  const errors = [
    ...validateDocument(manifest),
    ...validateDocument(lock)
  ];
  if (errors.length > 0) return errors;

  if (manifest.metadata.name !== lock.metadata.name) {
    errors.push(
      diagnostic(
        "SF1101",
        "/metadata/name",
        "lock metadata name does not match the manifest"
      )
    );
  }
  if (digestSandboxFile(manifest) !== lock.metadata.sandboxFileDigest) {
    errors.push(
      diagnostic(
        "SF1102",
        "/metadata/sandboxFileDigest",
        "lock digest does not match the canonical manifest"
      )
    );
  }
  if (manifest.environment.image !== lock.environment.image.reference) {
    errors.push(
      diagnostic(
        "SF1103",
        "/environment/image/reference",
        "locked image reference does not match the manifest"
      )
    );
  }

  const pinnedDigest =
    /@(?<digest>sha256:[a-f0-9]{64})$/.exec(manifest.environment.image)?.groups
      ?.digest;
  if (
    pinnedDigest &&
    pinnedDigest !== lock.environment.image.resolved.digest
  ) {
    errors.push(
      diagnostic(
        "SF1107",
        "/environment/image/resolved/digest",
        "resolved descriptor does not match the digest-pinned image reference"
      )
    );
  }

  if (
    manifest.environment.platform &&
    !platformMatches(
      manifest.environment.platform,
      lock.environment.image.selected.platform
    )
  ) {
    errors.push(
      diagnostic(
        "SF1108",
        "/environment/image/selected/platform",
        "selected image platform does not match the manifest request"
      )
    );
  }

  if (
    lock.environment.image.resolved.mediaType.endsWith(
      ".image.manifest.v1+json"
    ) ||
    lock.environment.image.resolved.mediaType.endsWith(
      ".manifest.v2+json"
    )
  ) {
    if (
      !descriptorMatches(
        lock.environment.image.resolved,
        lock.environment.image.selected.descriptor
      )
    ) {
      errors.push(
        diagnostic(
          "SF1109",
          "/environment/image/selected/descriptor",
          "a directly resolved image manifest must also be the selected descriptor"
        )
      );
    }
  }

  const manifestPrimary = manifest.sources?.primary;
  const lockedPrimary = lock.sources?.primary;
  if (
    Boolean(manifestPrimary) !== Boolean(lockedPrimary) ||
    (manifestPrimary && !sourceMatches(manifestPrimary, lockedPrimary))
  ) {
    errors.push(
      diagnostic(
        "SF1104",
        "/sources/primary",
        "locked primary source does not match the manifest"
      )
    );
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
  const names = new Set([
    ...manifestRepositories.keys(),
    ...lockedRepositories.keys()
  ]);
  if (
    manifestRepositories.size !== lockedRepositories.size ||
    [...names].some(
      (name) =>
        !sourceMatches(
          manifestRepositories.get(name),
          lockedRepositories.get(name)
        )
    )
  ) {
    errors.push(
      diagnostic(
        "SF1105",
        "/sources/repositories",
        "locked additional sources do not exactly match the manifest"
      )
    );
  }

  return errors;
}

export {
  applySandboxFileDefaults,
  canonicalizeJson,
  digestContextEntries,
  digestSandboxFile,
  sha256Digest
};
