# Governance

SandboxFile is an open specification maintained in the
[`Lifetime-ai/sandboxfile`](https://github.com/Lifetime-ai/sandboxfile)
repository.

## Roles

- **Maintainers** merge changes, manage releases, and protect the security and
  compatibility of the specification.
- **Contributors** propose, review, document, test, and implement changes.
- **Implementers** provide operational feedback from control planes, runtimes,
  policy engines, and agent products.

The initial maintainers are members of the Lifetime AI GitHub organization with
maintain or admin permission on this repository.

## Decisions

The project prefers rough consensus supported by public technical reasoning.
Maintainers decide when consensus cannot be reached, with the following
priorities:

1. least authority and fail-closed behavior;
2. provider neutrality;
3. reproducibility and auditability;
4. implementability across more than one runtime; and
5. backward compatibility after stabilization.

Normative changes are made through pull requests. Significant changes require a
proposal under `proposals/` and a minimum seven-day public review period unless
an actively exploitable security defect requires an embargoed fix.

## Releases

Maintainers:

1. verify the conformance suite;
2. update the changelog;
3. record compatibility impact;
4. create a signed or GitHub-attested tag; and
5. publish immutable schema artifacts.

No single implementation automatically defines the specification. When an
implementation and the released specification disagree, the released
specification remains authoritative until changed through this process.

## Governance changes

Changes to this document use the same proposal and review process as normative
specification changes.
