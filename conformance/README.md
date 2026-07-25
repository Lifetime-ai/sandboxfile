# Conformance suite

`cases.json` lists documents that every v1alpha1 validator must accept or
reject.

`PARSE` means the document violates the bounded YAML/JSON ingestion rules.
`SCHEMA` means JSON Schema validation must reject the document. `SF1xxx` codes
are normative semantic or cross-document checks that are not fully expressible
in JSON Schema:

| Code | Meaning |
| --- | --- |
| `SF1001` | A non-secret environment map uses a secret-bearing variable name |
| `SF1002` | A task depends on an unknown task |
| `SF1003` | The task dependency graph contains a cycle |
| `SF1004` | Additional repository names are not unique |
| `SF1005` | A resource request exceeds its limit |
| `SF1006` | Source destination paths overlap |
| `SF1007` | Credential request names are not unique |
| `SF1101` | Lock and manifest names differ |
| `SF1102` | The canonical manifest digest differs |
| `SF1103` | The locked image reference differs |
| `SF1104` | The locked primary source differs |
| `SF1105` | The locked additional source set differs |
| `SF1106` | Resolved repository names in a lock are not unique |

Conformance fixtures contain synthetic values only. Never add real credentials,
private source URLs, user-specific paths, or active provider identifiers.

Every YAML or JSON fixture under `valid/` and `invalid/` must be listed in
`cases.json`; the runner rejects orphan fixtures. Paired manifest/lock cases
exercise canonical defaults and stale-lock rejection.

`digests.json` contains immutable manifest and local-context vectors for the
v1alpha1 canonicalization algorithm.
