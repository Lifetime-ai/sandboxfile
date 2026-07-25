# SandboxFile v1alpha1

Status: **experimental**

## 1. Purpose

A `SandboxFile` declares the temporary computer an agent needs and the
enforceable contract around that computer. It does not describe agent prompts,
workflow orchestration, CI pipelines, or provider request objects.

The document has three audiences:

- repositories declare portable execution needs;
- policy engines calculate effective authority; and
- providers enforce the resulting immutable plan.

## 2. Trust and authority

A runtime MUST parse a SandboxFile as untrusted data.

A SandboxFile MAY request resources, network access, credentials, ingress, and
elevated capabilities. It MUST NOT grant any of them. Effective permission is:

```text
manifest request ∩ platform policy ∩ user approval
```

A runtime MUST compile this intersection into an immutable effective plan before
calling an execution provider. Provider adapters MUST receive the effective
plan, not the raw repository-controlled manifest.

If a provider cannot enforce a requested security control, the runtime MUST
reject the plan or remove the capability with an explicit diagnostic. It MUST
NOT silently broaden access.

## 3. Documents

The conventional manifest filename is:

```text
SandboxFile
```

The conventional resolution filename is:

```text
SandboxFile.lock
```

Both documents use YAML or JSON syntax and MUST validate against their matching
JSON Schema.

## 4. Manifest fields

### 4.1 Identity

`apiVersion` MUST be `sandboxfile.dev/v1alpha1`.

`kind` MUST be `Sandbox`.

`metadata.name` identifies the declaration. Descriptions and labels are
non-authoritative metadata and MUST NOT carry secrets.

### 4.2 Environment

`environment.image` is an OCI image reference. Mutable tags are allowed in a
development manifest, but production execution SHOULD use the digest recorded
in `SandboxFile.lock`.

`environment.env` is limited to non-secret values. An implementation MUST reject
known secret-bearing names and SHOULD provide a stricter organization policy.
Credential requirements belong in `credentials`.

`environment.workdir` and all source/cache paths are absolute POSIX paths.
Paths containing parent traversal segments are invalid.

### 4.3 Resources

`resources` requests CPU, memory, disk, and process limits. Platforms MAY lower
requests to policy maximums, but MUST report the effective values.

Where both `request` and `limit` are present, `request` MUST be less than or
equal to `limit`.

### 4.4 Lifecycle

`lifecycle.ttl` is the maximum sandbox lifetime.

`lifecycle.idleTimeout` allows earlier termination after inactivity.

The default `cleanup` behavior is `destroy`. `retain` is a request and requires
platform support and policy approval.

### 4.5 Sources

`sources.primary` declares either:

- a local context uploaded or mounted through a trusted source resolver; or
- a Git repository resolved to an immutable revision.

`sources.repositories` declares additional named Git repositories. Repository
names MUST be unique.

A production runtime MUST resolve Git references to commits and record those
commits in `SandboxFile.lock`. The lock file MUST NOT contain access tokens or
credential-bearing URLs.

### 4.6 Setup and tasks

`setup.bootstrap` contains ordered initialization commands.

`setup.ready` is a readiness command.

`tasks` is a map of named commands. `dependsOn` forms a directed acyclic graph:
every dependency MUST exist and cycles are invalid.

Commands run with the effective sandbox identity and authority. Text in a
command never changes the permission model.

### 4.7 Network

The default egress action is `deny` when `network.default` is omitted.

`network.allow` requests destination host and protocol exceptions. A host is a
DNS name or wildcard host pattern, not a URL. Runtimes SHOULD resolve DNS
rebinding safely and SHOULD record effective network observations as evidence.

`network.ingress` requests an exposed port. Visibility defaults to `private`.
`public` visibility requires explicit policy and approval.

### 4.8 Credentials

`credentials` contains logical provider and permission requirements only.

Credential values, short-lived tokens, private keys, session cookies, and
provider-generated sandbox identifiers MUST NOT appear in the manifest, lock
file, effective plan, logs, or fixtures.

Credential delivery is `proxy` in v1alpha1. The provider or a trusted broker
SHOULD make authorized requests without releasing reusable values into the
sandbox.

### 4.9 Capabilities

Every field in `capabilities` is a request.

`containerRuntime: true` requests an isolated nested or provider-managed OCI
runtime. It MUST NOT be implemented by exposing the host Docker or Podman
socket to the sandbox.

`privileged` and `hostMounts` are high-risk requests. Platforms SHOULD deny them
by default.

### 4.10 Persistence and outputs

`persistence.caches` declares disposable performance caches. A cache is not a
secret store or durable source of record.

`outputs.artifacts` selects files to preserve after execution.

`outputs.evidence` requests execution observations such as commands, test
results, diffs, resource usage, and network access. Evidence collection MUST
redact credential material.

### 4.11 Extensions

`extensions` provides namespaced experimental requests. Keys use
`domain/name` form.

An extension MUST NOT override a core field. Extension values MUST NOT contain
secrets. An implementation MUST document whether an extension is optional or
critical and MUST fail closed when a critical extension cannot be enforced.

## 5. Lock file

`SandboxFile.lock` captures provider-neutral immutable resolutions:

- the digest of the source SandboxFile;
- the OCI image digest;
- the exact Git commit for each Git source; and
- a content digest for a local-context source.

It MUST NOT contain provider sandbox IDs, local host paths, credential values,
or policy decisions. It can be committed when its inputs are intended to be
shared and reproducible.

The lock file is evidence of resolution, not evidence that an artifact is
trusted. Implementations SHOULD verify signatures, attestations, and source
policy independently.

## 6. Defaults

Defaults are semantic and apply even when JSON Schema validators do not insert
them:

| Field | Default |
| --- | --- |
| `environment.workdir` | `/workspace` |
| `lifecycle.cleanup` | `destroy` |
| `network.default` | `deny` |
| `network.ingress[].visibility` | `private` |
| `network.ingress[].protocol` | `http` |
| source `access` | `read-write` |
| credential `delivery` | `proxy` |

Platforms MAY choose stricter defaults. They MUST NOT choose more permissive
defaults without explicit policy and approval.

## 7. Deferred features

The following are intentionally deferred:

- environment builds, Dev Container imports, and feature composition;
- signed remote profile inheritance;
- multi-container application topologies;
- GPUs and specialized accelerators;
- desktop environments and Windows;
- portable checkpoints and cross-provider volumes; and
- multi-agent orchestration.

Changes in these areas require proposals and conformance fixtures.
