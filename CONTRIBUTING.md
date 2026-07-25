# Contributing to SandboxFile

Thank you for helping define a portable contract for agent computers.

## Before opening a change

Use an issue or a proposal for changes that alter fields, defaults, security
semantics, compatibility, or provider requirements. Small documentation fixes
may go directly to a pull request.

Specification changes must include:

1. the normative prose change;
2. the matching JSON Schema change;
3. at least one valid or invalid conformance fixture;
4. regenerated TypeScript declarations;
5. a compatibility and security assessment; and
6. a changelog entry.

Do not add provider SDK request objects to the public contract. Provider-neutral
capability requests belong in the specification; provider translation belongs
in implementations.

## Development

Requirements:

- Node.js 22 or newer
- pnpm 10

```bash
pnpm install
pnpm check
```

Use `pnpm generate` after changing a schema. `pnpm check` fails if committed
generated types do not match the schema.

## Pull requests

- Keep each pull request focused on one coherent change.
- Explain the user problem and security impact.
- Do not include secrets, tokens, provider-generated sandbox IDs, or
  user-specific absolute paths in fixtures.
- Mark breaking changes explicitly.
- Link the proposal or issue when one is required.

All contributions are accepted under the repository's Apache-2.0 license.
