# Changelog

All notable specification and reference-package changes are recorded here.

The project follows [Semantic Versioning](https://semver.org/) for repository
releases. The `apiVersion` compatibility contract is documented separately in
[`SPECIFICATION.md`](SPECIFICATION.md).

## Unreleased

### Added

- Initial experimental `SandboxFile` v1alpha1 schema.
- Initial `SandboxFile.lock` v1alpha1 schema.
- RFC 8785/SHA-256 manifest and local-context digest rules.
- Normative security and compatibility rules.
- Fail-closed Git URL, egress host, extension, source-path, and artifact rules.
- Node.js, .NET, C++, and polyglot examples.
- Paired manifest/lock, parser, digest, and security-focused conformance cases.
- Generated TypeScript declaration package.
- Reference `@sandboxfile/validator` package and `sandboxfile validate` CLI.
- Layered parser-to-runtime conformance model and provider capability reports.
- OCI index, selected descriptor, and platform locking.
- Named network rules with explicit schemes, ports, and credential bindings.
- Interoperability boundaries for OpenSandbox, OpenShell, Kubernetes Agent
  Sandbox, and Development Containers.
- OIDC trusted-publishing workflow for reviewed alpha releases.

### Changed

- Renamed the per-command interpreter from `environment.entrypoint` to
  `execution.shell`.
- Limited extension numbers to portable safe integers.
- Deferred host mounts, retained sandboxes, public ingress, and cross-run
  project/user caches from the first alpha.
- Hardened Git resolution and artifact/context symlink semantics.
