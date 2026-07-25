# v1alpha1 canonicalization and digests

This document defines the bytes covered by `sha256:` values in
`SandboxFile.lock`. The rules are normative so different implementations can
create and verify the same lock file.

## Document data model

An implementation MUST parse a manifest as YAML 1.2 or JSON into the JSON data
model before hashing it. It MUST reject duplicate mapping keys, custom YAML
tags, non-finite numbers, and values that do not validate against the selected
schema. YAML aliases MAY be accepted, but an implementation MUST apply bounded
alias-expansion limits before producing the JSON data model.

Portable numeric values are limited to integers in the inclusive range
`[-9007199254740991, 9007199254740991]`. Decimal or larger extension values
MUST be represented as strings. This prevents parsers with different numeric
models from accepting distinct source values as the same JSON number.

Comments, YAML anchors, scalar spelling, document formatting, and mapping order
do not affect a digest.

## SandboxFile digest

To calculate `metadata.sandboxFileDigest`, an implementation MUST:

1. validate the parsed document against `SandboxFile.schema.json`;
2. apply every semantic default in the following order:
   - `environment.workdir: /workspace`;
   - create `execution` when absent and apply
     `execution.shell: ["/bin/sh", "-eu", "-c"]`;
   - create `lifecycle` when absent and apply `lifecycle.cleanup: destroy`;
   - create `network` when absent and apply `network.default: deny`;
   - apply `private` and `http` to omitted ingress visibility and protocol;
   - apply `read-write` to omitted source access;
   - apply `proxy` to omitted credential delivery; and
   - apply `critical: true` to omitted extension criticality;
3. serialize the resulting JSON value using the
   [JSON Canonicalization Scheme (RFC 8785)](https://www.rfc-editor.org/rfc/rfc8785);
4. hash the exact UTF-8 serialization with SHA-256; and
5. encode the result as lowercase hexadecimal prefixed by `sha256:`.

An implementation MUST NOT add policy decisions, provider defaults, resolved
values, or implementation-specific metadata before calculating this digest.

## Local-context content digest

`contentDigest` covers the exact context supplied by the trusted source
resolver. There are no implicit ignore rules. A resolver that applies an ignore
file or another selection rule MUST apply it before constructing the entry
list, and the uploaded context MUST contain exactly that selected content.

The resolver MUST walk the context without following symbolic links and create
one JSON object for each non-root entry:

| Type | Canonical object fields |
| --- | --- |
| Directory | `path`, `type: "directory"`, `mode: "0755"` |
| Regular file | `path`, `type: "file"`, normalized `mode`, decimal-string `size`, and SHA-256 `digest` of the raw file bytes |
| Symbolic link | `path`, `type: "symlink"`, `mode: "120000"`, and exact UTF-8 `target` |

Paths are relative to the context root, use `/` separators, and MUST be valid
UTF-8. Empty segments, `.`, `..`, absolute paths, duplicate paths, NUL bytes,
and backslashes are invalid. Directory entries MUST be included, including
empty directories.

Regular-file mode is normalized to `"0755"` when any executable bit is set and
to `"0644"` otherwise. Ownership, timestamps, ACLs, extended attributes, and
other host metadata are not hashed. Special files are invalid. A symbolic-link
target MUST be relative and MUST remain inside the context root after lexical
resolution.

The resolver MUST sort entry objects by the unsigned UTF-8 bytes of `path`,
serialize the resulting JSON array with RFC 8785, hash those bytes with SHA-256,
and use the lowercase `sha256:` form.

## Verification

A consumer MUST recalculate the manifest digest and reject a mismatched lock. If
it independently resolves a local context, it MUST also recalculate and compare
the context digest. A digest match establishes byte identity only; it does not
establish trust, provenance, or safety.
