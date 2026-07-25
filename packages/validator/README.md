# `@sandboxfile/validator`

Reference parser, schema validator, semantic validator, lock verifier, and CLI
for SandboxFile `v1alpha1`.

```bash
npx @sandboxfile/validator validate SandboxFile --lock SandboxFile.lock
```

```js
import {
  parseSandboxFile,
  validateDocument,
  validateLockPair
} from "@sandboxfile/validator";
```

Validation is fail-closed and returns stable diagnostic codes. A successful
validation establishes conformance, not authorization or artifact trust.
