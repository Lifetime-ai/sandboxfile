# Conformance suite

`cases.json` lists documents that every v1alpha1 validator must accept or
reject.

`SCHEMA` means JSON Schema validation must reject the document. `SF1xxx` codes
are normative semantic checks that are not fully expressible in JSON Schema:

| Code | Meaning |
| --- | --- |
| `SF1001` | A non-secret environment map uses a secret-bearing variable name |
| `SF1002` | A task depends on an unknown task |
| `SF1003` | The task dependency graph contains a cycle |
| `SF1004` | Additional repository names are not unique |
| `SF1005` | A resource request exceeds its limit |

Conformance fixtures contain synthetic values only. Never add real credentials,
private source URLs, user-specific paths, or active provider identifiers.
