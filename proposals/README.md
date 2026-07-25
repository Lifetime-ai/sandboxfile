# Proposals

A proposal is required for changes that affect fields, defaults, authority,
security behavior, compatibility, or provider requirements.

## Process

1. Copy `template.md` to `proposals/NNNN-short-name.md`.
2. Open a pull request with status `Draft`.
3. Include at least two implementation perspectives when the change affects
   portability.
4. Complete the security and compatibility sections.
5. Allow at least seven days for public review.
6. After acceptance, implement prose, schema, fixtures, generated types, and
   changelog changes in the same or a linked pull request.

Proposal states are `Draft`, `Accepted`, `Rejected`, `Withdrawn`, and
`Implemented`.

Deferred v1alpha1 topics such as environment builds, profiles, multi-container
topologies, and GPUs should begin here.
