# Alpha release checklist

No schema or npm artifact may be published until a maintainer verifies every
item below.

- Confirm Lifetime AI controls `sandboxfile.dev` and can retain the
  `sandboxfile.dev/v1alpha1` namespace. If not, change the namespace before the
  first tag.
- Confirm Lifetime AI controls the npm `@sandboxfile` organization and that the
  release identity can publish both `@sandboxfile/schema` and
  `@sandboxfile/types`.
- Enable and test GitHub private vulnerability reporting for this repository so
  the advisory URL in `SECURITY.md` works for external reporters.
- Protect `main`, require the CI check, and require pull-request review.
- Run `pnpm install --frozen-lockfile` and `pnpm check` from a clean checkout.
- Verify both package dry-runs contain only the reviewed files and complete
  Apache-2.0 license text.
- Create a signed or GitHub-attested tag and publish packages with npm
  provenance.
- Verify the tagged raw schema URLs match each schema `$id`.
