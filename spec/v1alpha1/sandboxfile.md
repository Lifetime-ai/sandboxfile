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

Both documents use one YAML 1.2 or JSON document and MUST validate against their
matching JSON Schema. Parsers MUST reject duplicate mapping keys, multiple
documents, custom tags, and non-JSON values. Parsers MUST bound document size,
nesting, and YAML alias expansion before validation. Digest-specific parsing and
normalization rules are defined in
[`canonicalization.md`](canonicalization.md).

## 4. Manifest fields

### 4.1 Identity

`apiVersion` MUST be `sandboxfile.dev/v1alpha1`.

`kind` MUST be `Sandbox`.

`metadata.name` identifies the declaration. Descriptions and labels are
non-authoritative metadata and MUST NOT carry secrets.

### 4.2 Environment

`environment.image` is an OCI image reference. Mutable tags are allowed in a
development manifest. Before production execution, a runtime MUST resolve the
reference to an OCI digest, record or verify it in `SandboxFile.lock`, and
execute that immutable digest.

`environment.env` is limited to non-secret values. An implementation MUST reject
known secret-bearing names and SHOULD provide a stricter organization policy.
Credential requirements belong in `credentials`.

`environment.workdir` and all source/cache paths are absolute POSIX paths.
Paths containing parent traversal segments are invalid.

`environment.user` requests the OCI user used for setup, declared tasks, and
agent processes. When omitted, the image user applies. A platform MAY substitute
a less-privileged identity, but MUST record the effective identity; it MUST NOT
grant a more-privileged identity solely because the manifest requests one.

`environment.entrypoint` is the argv prefix for each declared command. The
command string is appended as one final argument. It defaults to
`["/bin/sh", "-eu", "-c"]`. The runtime MUST bypass the image's configured
entrypoint when invoking declared commands so command interpretation does not
depend on image metadata.

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
names MUST be unique. Every source path is its absolute destination inside the
sandbox and is required. Source destinations MUST NOT overlap.

A production runtime MUST resolve Git references to commits and record those
commits in `SandboxFile.lock`. The lock file MUST NOT contain access tokens or
credential-bearing URLs.

Git URLs are limited to HTTPS without user information, query, or fragment; SSH
URLs without passwords, query, or fragment; and `git@host:path` shorthand.
Credentials are requested separately through `credentials`.

### 4.6 Setup and tasks

`setup.bootstrap` contains ordered initialization commands. Commands run
sequentially in `environment.workdir` with `environment.env` added to the image
environment.

`setup.ready` runs once after bootstrap. A non-zero exit, signal, or timeout
fails sandbox preparation.

`tasks` is a map of named commands. `dependsOn` forms a directed acyclic graph:
every dependency MUST exist and cycles are invalid.

Commands run with the effective sandbox identity and authority. Text in a
command never changes the permission model.

When a named task is selected, the runtime MUST execute its transitive
dependencies once in dependency-list order before executing the task. A command
starts only after all its dependencies succeed. A non-zero exit, signal, or
timeout fails the command and prevents dependent commands from starting.
Timeouts are wall-clock limits and MUST terminate the command's process tree.
Implementations MUST preserve stdout, stderr, exit status, and timeout status as
execution evidence subject to redaction policy.

### 4.7 Network

The default egress action is `deny` when `network.default` is omitted.

`network.allow` requests destination host and protocol exceptions. `protocols`
is required. A host is a lowercase ASCII DNS name or IPv4 address, not a URL. A
single leading wildcard label is allowed: `*.example.com` matches one or more
complete labels before `.example.com`, but never the apex `example.com`.
`*`, embedded wildcards, trailing dots, URL schemes, paths, ports, queries, and
fragments are invalid. Runtimes SHOULD resolve DNS rebinding safely and SHOULD
record effective network observations as evidence.

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

`shell: true` requests arbitrary interactive or agent-selected command
execution in addition to declared setup and task commands. `browser: true`
requests an isolated browser-automation capability. Neither field selects a
provider API or broadens filesystem, network, credential, or process authority.

`containerRuntime: true` requests an isolated nested or provider-managed OCI
runtime. It MUST NOT be implemented by exposing the host Docker or Podman
socket to the sandbox.

`privileged` and `hostMounts` are high-risk requests. Platforms SHOULD deny them
by default.

### 4.10 Persistence and outputs

`persistence.caches` declares disposable performance caches. A cache is not a
secret store or durable source of record.

`outputs.artifacts` selects files to preserve after execution. Artifact paths
are relative to `environment.workdir`; absolute paths and parent traversal are
invalid.

`outputs.evidence` requests execution observations such as commands, test
results, diffs, resource usage, and network access. Evidence collection MUST
redact credential material.

### 4.11 Extensions

`extensions` provides namespaced experimental requests. Keys use
`domain/name` form. Each value is an envelope containing `value` and an optional
`critical` boolean. Criticality defaults to `true`.

An extension MUST NOT override a core field. Extension values MUST NOT contain
secrets. A consumer MUST reject an unsupported critical extension. It MAY ignore
an unsupported extension only when `critical: false`, and then MUST emit a
diagnostic.

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

Manifest and local-context digests MUST be produced and verified using
[`canonicalization.md`](canonicalization.md). A lock consumer MUST also verify
the manifest name, image reference, and complete source correspondence. It MUST
reject a stale, partial, duplicate, or mismatched lock.

## 6. Defaults

Defaults are semantic and apply even when JSON Schema validators do not insert
them:

| Field | Default |
| --- | --- |
| `environment.workdir` | `/workspace` |
| `environment.entrypoint` | `["/bin/sh", "-eu", "-c"]` |
| `lifecycle.cleanup` | `destroy` |
| `network.default` | `deny` |
| `network.ingress[].visibility` | `private` |
| `network.ingress[].protocol` | `http` |
| source `access` | `read-write` |
| credential `delivery` | `proxy` |
| extension `critical` | `true` |

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
