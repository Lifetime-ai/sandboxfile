# Roadmap

The roadmap is directional. Normative changes still require proposals.

## 0.1 — Public extraction

- v1alpha1 manifest and lock schemas
- deterministic manifest and local-context digests
- normative security and compatibility rules
- generated TypeScript types
- reference validator and CLI
- examples and conformance fixtures
- provider capability reporting and interoperability boundaries
- LifetimeSandbox migration

## 0.2 — Reproducible environments

Candidate proposal areas:

- repository-provided Dockerfiles;
- Dev Container imports;
- composable, pinned environment features;
- image build attestations; and
- lock-file representation for built images.

## 0.3 — Reusable profiles

Candidate proposal areas:

- signed OCI-distributed profiles;
- deterministic merge rules;
- local overlays;
- profile resolution in `SandboxFile.lock`; and
- protection against authority escalation through inheritance.

## Later

- provider-managed service topologies;
- portable browser and preview discovery;
- GPU and accelerator requests;
- checkpoint capability reporting; and
- cross-provider conformance reports.

Host mounts, retained sandboxes, public ingress, and cross-run shared caches
remain deferred until portable authorization and isolation semantics exist.

Multi-agent orchestration remains outside SandboxFile. An orchestrator may
create several SandboxFile-defined computers, but the manifest does not become
a workflow language.
