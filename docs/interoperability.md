# Relationship to sandbox and development-environment projects

This document is non-normative. SandboxFile is repository-level execution
intent. It does not replace provider APIs, Kubernetes workload resources, or
development-environment formats.

| Project | Primary role | Relationship to SandboxFile |
| --- | --- | --- |
| [OpenSandbox](https://open-sandbox.ai/api/) | Sandbox lifecycle API with images, resources, timeouts, commands, and endpoints | A control plane may compile a SandboxFile effective plan into OpenSandbox requests. OpenSandbox's startup `entrypoint` is not SandboxFile's per-command `execution.shell`. |
| [NVIDIA OpenShell](https://docs.nvidia.com/openshell/reference/policy-schema) | Agent isolation with filesystem, network, executable, and application-layer policy | OpenShell can enforce controls stricter than the portable host/scheme/port rules. A compiler must report any mapping loss. |
| [Kubernetes Agent Sandbox](https://github.com/kubernetes-sigs/agent-sandbox) | `agents.x-k8s.io/v1beta1` pod-backed Kubernetes Sandbox API | It is an execution substrate and lifecycle object. Repository resolution, lock verification, approvals, and evidence remain control-plane responsibilities. |
| [Development Containers](https://devcontainers.github.io/implementors/spec/) | Reproducible development-container metadata and tooling | It describes development environment composition. SandboxFile describes untrusted agent execution requests and authorization boundaries. Importing Dev Container metadata is deferred. |

No adapter is defined by this repository. An implementation claiming support
must publish its conformance level, provider version, capability report, and
mapping tests.

## Portable v1alpha1 network boundary

SandboxFile requires named rules with host, scheme, and port. OpenShell can
also bind destinations to executable paths and L7 request rules. OpenSandbox
and Kubernetes deployments may need separate network-policy components to
enforce equivalent controls. If the selected deployment cannot enforce all
portable fields, compilation fails before a sandbox is created.
