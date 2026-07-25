# v1alpha1 conformance

SandboxFile conformance is layered. An implementation MUST state the highest
level it satisfies and MUST NOT claim runtime portability based on schema
validation alone.

| Level | Name | Required behaviour |
| --- | --- | --- |
| 1 | Parser | Enforces the bounded YAML/JSON parsing rules and rejects malformed documents. |
| 2 | Validator | Passes Level 1, both JSON Schemas, and every semantic validation fixture. |
| 3 | Resolver | Passes Level 2, resolves OCI and Git inputs immutably, emits valid lock files, and passes all lock-pair and digest vectors. |
| 4 | Compiler | Passes Level 3 and compiles manifest requests, platform policy, and approval into an immutable effective plan without broadening authority. |
| 5 | Runtime | Passes Level 4 and proves that a named provider enforces the effective plan, evidence requirements, and cleanup semantics. |

The fixtures in this repository are the minimum public suite. Implementations
MAY enforce stricter policy, but MUST distinguish a specification error from a
local policy denial.

## Provider capability reports

Before provisioning, a Level 4 or 5 implementation MUST produce a capability
report for every requested control. Each control is classified as:

- `exact`: the provider can enforce the requested semantics;
- `stricter`: the provider can enforce a documented restriction of the request;
- `lossy`: translation would weaken or discard part of the request; or
- `unsupported`: the provider cannot implement the request.

`lossy` and `unsupported` controls MUST fail before provider creation. A
compiler MUST NOT rely on a provider default when the SandboxFile requires an
explicit control.

Runtime conformance is scoped to a provider name and version. Passing with one
provider does not establish conformance for another provider.
