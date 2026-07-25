# ADR 0001: Separate the public specification from LifetimeSandbox

- Status: Accepted
- Date: 2026-07-25

## Context

The initial SandboxFile schema, parser types, and compiler behavior were created
inside the private LifetimeSandbox control-plane repository. That coupled a
provider-neutral format to one product implementation and made independent
review, implementation, and versioning difficult.

## Decision

`Lifetime-ai/sandboxfile` is the authoritative public repository for:

- normative specification prose;
- versioned manifest and lock-file schemas;
- examples and conformance fixtures;
- generated language types;
- compatibility and proposal processes.

LifetimeSandbox retains policy compilation, approvals, credential brokering,
source resolution, evidence collection, and provider adapters.

JSON Schema is the source of truth. Generated language types must not be edited
independently.

## Consequences

- SandboxFile can evolve independently of LifetimeSandbox releases.
- Other control planes can implement the same contract.
- LifetimeSandbox must consume a pinned SandboxFile release.
- Cross-repository changes require explicit release sequencing.
- Provider-specific fields need neutral specification proposals or remain
  implementation details.
