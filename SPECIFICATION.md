# SandboxFile specification

This document is the stable entry point for the SandboxFile specification.

## Current version

The current experimental version is
[`v1alpha1`](spec/v1alpha1/sandboxfile.md).

The normative machine-readable definitions are:

- [`SandboxFile.schema.json`](spec/v1alpha1/SandboxFile.schema.json)
- [`SandboxFile.lock.schema.json`](spec/v1alpha1/SandboxFile.lock.schema.json)

The normative digest and parsing rules are in
[`canonicalization.md`](spec/v1alpha1/canonicalization.md).

If normative prose and a JSON Schema disagree, the conflict is a specification
defect. Implementations must not silently broaden the authority requested by a
manifest while the defect is resolved.

## Normative language

The key words **MUST**, **MUST NOT**, **REQUIRED**, **SHOULD**, **SHOULD NOT**,
and **MAY** are to be interpreted as described by
[RFC 2119](https://www.rfc-editor.org/rfc/rfc2119) and
[RFC 8174](https://www.rfc-editor.org/rfc/rfc8174) when, and only when, they
appear in all capitals.

## Versioning

`apiVersion` identifies the semantic contract:

```yaml
apiVersion: sandboxfile.dev/v1alpha1
```

Version stages have the following meaning:

| Stage | Compatibility expectation |
| --- | --- |
| `v1alphaN` | Experimental; incompatible changes are allowed between alpha versions |
| `v1betaN` | Feature-complete candidate; incompatible changes require strong justification |
| `v1` | Stable; backward-compatible evolution within the major version |

Tagged schema artifacts are immutable. A correction that changes validation or
runtime semantics requires a new specification release and, when incompatible,
a new `apiVersion`.

See [`compatibility.md`](spec/v1alpha1/compatibility.md) for implementation
rules.

## Conformance

An implementation is conforming only if it:

1. validates the selected document against the matching schema;
2. applies the normative semantic checks not expressible in JSON Schema;
3. treats the document as untrusted input;
4. computes an effective plan before provider execution;
5. never turns an unapproved request into authority;
6. fails closed for unsupported security controls; and
7. passes the fixtures under [`conformance/`](conformance/).

Conformance applies to a named specification version and implementation
release. It is not a permanent certification.
