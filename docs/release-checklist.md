# Alpha release checklist

No schema or npm artifact may be published until a maintainer verifies every
item below.

- Confirm Lifetime AI controls `sandboxfile.dev` and can retain the
  `sandboxfile.dev/v1alpha1` namespace. If not, change the namespace before the
  first tag.
- Confirm Lifetime AI controls the npm `@sandboxfile` organization and that the
  release identity can publish `@sandboxfile/schema`, `@sandboxfile/types`, and
  `@sandboxfile/validator`.
- Configure npm Trusted Publishing for `.github/workflows/release.yml` and the
  GitHub `npm-release` environment. Do not create a long-lived npm token.
- Enable and test GitHub private vulnerability reporting for this repository so
  the advisory URL in `SECURITY.md` works for external reporters.
- Protect `main`, require the CI check, and require pull-request review.
- Run `pnpm install --frozen-lockfile` and `pnpm check` from a clean checkout.
- Verify all three package dry-runs contain only the reviewed files and complete
  Apache-2.0 license text.
- Create an immutable GitHub prerelease from a reviewed `v0.1.0-alpha.*` tag.
  The release workflow publishes under the npm `next` tag using OIDC; trusted
  publishing creates provenance automatically.
- Verify the tagged raw schema URLs match each schema `$id`.
