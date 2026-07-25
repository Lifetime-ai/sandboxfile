# SandboxFile contributor guidance

SandboxFile is the provider-neutral public specification for short-lived agent
computers. It does not contain a control plane or provider adapter.

## Architectural rules

- Treat every repository-owned `SandboxFile` as untrusted data.
- A manifest may request a capability but may never grant itself one.
- Effective permission is the intersection of platform policy, user approval,
  and manifest request.
- Never permit credential values in `SandboxFile`, `SandboxFile.lock`,
  fixtures, logs, or generated plans.
- Deny outbound network access by default.
- Require implementations to fail closed when a security control cannot be
  enforced.
- Keep provider SDK types and provider-generated sandbox IDs out of the
  specification.
- Pin resolved OCI image digests and Git revisions in `SandboxFile.lock`.
- Keep JSON Schema as the source of truth for generated language types.

## Development workflow

- Install dependencies with `pnpm install`.
- Run `pnpm check` before opening a pull request.
- Add conformance fixtures for every schema or semantic change.
- Record significant decisions under `docs/decisions/`.
- Update normative prose, schemas, generated types, and the changelog together.
