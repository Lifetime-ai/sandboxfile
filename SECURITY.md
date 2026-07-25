# Security policy

SandboxFile describes security-sensitive execution requests. Please report
vulnerabilities privately before opening a public issue.

## Reporting

Use GitHub's **Report a vulnerability** flow in the Security tab of this
repository. Include:

- affected specification or package version;
- the manifest or lock-file construct involved;
- the authority escalation, information disclosure, or enforcement failure;
- a minimal reproduction when safe; and
- any suggested mitigation.

Do not include real credentials, customer repository contents, or active
provider identifiers.

## Scope

Security reports may cover:

- schema bypasses;
- ambiguous semantics that can broaden authority;
- credential material leaking into manifests or lock files;
- unsafe defaults;
- path or source-resolution confusion;
- lock-file substitution;
- conformance tooling vulnerabilities; and
- reference-package vulnerabilities.

Provider implementation vulnerabilities should also be reported to the
affected implementation.

## Response

Maintainers will acknowledge a report, assess severity, coordinate an embargoed
fix when necessary, and publish remediation guidance after affected users have
a reasonable opportunity to update.
