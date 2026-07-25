# v1alpha1 compatibility

## Consumer behavior

Consumers MUST select a schema using the exact `apiVersion` and `kind`.
Unknown versions and kinds MUST be rejected.

Unknown core fields are invalid. A consumer MUST NOT ignore an unknown field
outside the namespaced `extensions` object because a misspelled security field
could otherwise become permissive.

Consumers MAY support more than one specification version. Parsing and default
application MUST occur according to the selected version before any internal
upgrade.

## Producer behavior

Producers SHOULD emit the oldest specification version that fully expresses
their request. They MUST NOT emit fields from a newer version under an older
`apiVersion`.

Producers SHOULD preserve user comments and ordering when editing YAML, but
comments and ordering have no semantic meaning.

## Alpha changes

During alpha:

- new optional fields may be added;
- fields and defaults may change in a later alpha version;
- semantic checks may become stricter; and
- implementations must declare the exact versions they accept.

A tagged release does not change after publication. A normative correction is
published as a new repository release, and an incompatible correction requires
a new `apiVersion`.

## Extensions

Namespaced extensions do not imply universal portability. Producers SHOULD
offer a core-only fallback when possible.

Consumers MUST prevent extensions from overriding core security semantics.
Unsupported critical extensions fail closed; unsupported optional extensions
may be ignored with a diagnostic. Extension criticality defaults to `true` and
is carried in each extension envelope; consumers MUST NOT infer it from an
implementation-local registry.

## Lock-file compatibility

A lock file is valid only when:

- its `apiVersion` is supported;
- its `metadata.name` matches the manifest name;
- `metadata.sandboxFileDigest` matches the manifest digest produced by
  [`canonicalization.md`](canonicalization.md);
- every resolved source corresponds to a manifest source; and
- the image reference corresponds to the requested environment image.

Implementations MUST reject stale or mismatched locks rather than partially
using them.
