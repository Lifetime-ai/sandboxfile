# Migration from the embedded LifetimeSandbox schema

The first experimental schema lived in `malotho/LifetimeSandbox`. This public
repository replaces that embedded definition as the source of truth.

## Manifest changes

| Embedded form | Public v1alpha1 |
| --- | --- |
| `apiVersion: lifetime.dev/sandbox/v1alpha1` | `apiVersion: sandboxfile.dev/v1alpha1` |
| `capabilities.docker` | `capabilities.containerRuntime` |
| `environment.entrypoint` command prefix | `execution.shell` |
| host-only cache scopes and mounts | deferred from public v1alpha1 |
| Handwritten TypeScript interface | Types generated from JSON Schema |
| No lock-file schema | Versioned `SandboxFile.lock` schema |
| Product-local examples | Public conformance fixtures |

Resource quantities are now separated by type:

- CPU uses whole cores such as `"2"` or millicores such as `500m`.
- Memory and disk require binary units such as `4Gi`.

Additional repository names must be unique. Task dependencies must exist and
form an acyclic graph. Environment variable names that imply credential values
are rejected by the reference semantic validator.

## LifetimeSandbox adoption

LifetimeSandbox should:

1. depend on a tagged `@sandboxfile/schema` release;
2. replace its handwritten interface with `@sandboxfile/types`;
3. use `@sandboxfile/validator` for parsing, semantic checks, and lock pairing;
4. accept `sandboxfile.dev/v1alpha1`;
5. map `containerRuntime` to a provider-neutral plan capability;
6. generate OCI descriptor- and platform-aware locks;
7. publish a provider capability report before provisioning;
8. run this repository's conformance fixtures in CI; and
9. remove its duplicated normative schema after the migration is released.

During a short transition, LifetimeSandbox may recognize the embedded alpha
identifier and emit a deprecation diagnostic. It must not silently reinterpret
fields whose semantics changed.
