# SandboxFile

[![CI](https://github.com/Lifetime-ai/sandboxfile/actions/workflows/ci.yml/badge.svg)](https://github.com/Lifetime-ai/sandboxfile/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Status](https://img.shields.io/badge/status-experimental-orange.svg)](SPECIFICATION.md)

SandboxFile is an open, provider-neutral specification for declaring the
reproducible, secure, and policy-controlled computers used by AI coding agents.

```yaml
apiVersion: sandboxfile.dev/v1alpha1
kind: Sandbox

metadata:
  name: node-example

environment:
  image: node:22-bookworm
  workdir: /workspace/project

lifecycle:
  ttl: 2h

network:
  default: deny
  allow:
    - host: registry.npmjs.org
      protocols: [https]

tasks:
  test:
    command: npm test
    timeout: 20m
```

A SandboxFile is a request, not an authority. A conforming runtime calculates
effective permission from the intersection of platform policy, user approval,
and the manifest request. It must fail closed when it cannot enforce a
requested security control.

## Project status

`v1alpha1` is experimental. It is ready for implementation and feedback, but
may still change before the first stable release. Released schema artifacts
are immutable; incompatible changes receive a new specification version.

The initial scope covers:

- OCI images and resource limits
- Git and local-context sources
- bootstrap commands and named tasks
- time-to-live and idle timeout
- default-deny egress and private ingress declarations
- logical credential requirements without credential values
- caches, artifacts, capabilities, and execution evidence
- an immutable `SandboxFile.lock` for resolved images and sources

Multi-container orchestration, GPUs, desktop environments, Windows, and
provider-specific execution objects are deliberately outside `v1alpha1`.

## Repository contents

| Path | Purpose |
| --- | --- |
| [`SPECIFICATION.md`](SPECIFICATION.md) | Version selection and normative-language rules |
| [`spec/v1alpha1/`](spec/v1alpha1/) | Normative prose and JSON Schemas |
| [`examples/`](examples/) | Node.js, .NET, C++, and polyglot examples |
| [`conformance/`](conformance/) | Valid and invalid implementation fixtures |
| [`proposals/`](proposals/) | Process for evolving the specification |
| [`packages/typescript/`](packages/typescript/) | Generated TypeScript types |

## Validate the repository

Requirements: Node.js 22 or newer and pnpm 10.

```bash
pnpm install
pnpm check
```

The JSON Schemas use
[JSON Schema Draft 2020-12](https://json-schema.org/draft/2020-12).
TypeScript declarations are generated from those schemas so the schema remains
the source of truth.

## Implementations

[LifetimeSandbox](https://github.com/malotho/LifetimeSandbox) is the first
control-plane implementation. It compiles untrusted SandboxFiles into immutable
effective plans before invoking an execution provider such as OpenSandbox.

Implementations may support additional providers, but provider SDK types and
provider-generated sandbox identifiers are not part of this specification.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) before proposing a change. Specification
changes require normative documentation, schema changes, conformance fixtures,
and a compatibility assessment.

SandboxFile is licensed under the [Apache License 2.0](LICENSE).
