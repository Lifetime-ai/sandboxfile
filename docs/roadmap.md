# Roadmap

The roadmap is directional. Normative changes still require proposals.

## 0.1 — Public extraction

- v1alpha1 manifest and lock schemas
- normative security and compatibility rules
- generated TypeScript types
- examples and conformance fixtures
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

Multi-agent orchestration remains outside SandboxFile. An orchestrator may
create several SandboxFile-defined computers, but the manifest does not become
a workflow language.
