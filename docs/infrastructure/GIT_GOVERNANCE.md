# Git governance and production deployment policy

## Required change flow

All production changes must follow:

`feature/fix branch → pull request → CI green → merge to main → Render checksPass deploy`

Direct pushes to `main` are not an approved delivery path.

## Native GitHub branch protection target

The repository should configure `main` with the following GitHub branch protection/ruleset settings:

- Require a pull request before merging.
- Required approvals: 0 while the repository is maintained by a single accountable maintainer; raise this when a second reviewer is available.
- Require status checks to pass before merging.
- Required status check: `Test, typecheck and build` from workflow `CI`.
- Require branches to be up to date before merging.
- Require conversation resolution before merging.
- Block force pushes.
- Block branch deletion.
- Apply rules to administrators where operationally acceptable.

The connected GitHub integration used by ChatGPT does not currently have permission to mutate branch-protection settings. Until the native ruleset is enabled in GitHub, CI provides a compensating control: every push to `main` must be associated with a merged pull request or the CI check fails. Render is configured with `autoDeployTrigger: checksPass`, so an unapproved direct push must not auto-deploy.

## Migration governance

Supabase schema changes are migration-only:

- Never edit, rename, delete, or renumber an already-applied migration.
- Every new migration uses the next contiguous four-digit version.
- `src/lib/observability/schema-version.ts` declares the schema version expected by the deployed application.
- `scripts/test-migration-integrity.mjs` validates filenames, uniqueness, contiguous ordering, and agreement with the expected runtime schema version.
- Admin System Health compares the deployed application's expected migration against Supabase's authoritative `schema_migrations` history.

## Deployment identity

Render automatically exposes `RENDER_GIT_COMMIT`, `RENDER_GIT_BRANCH`, `RENDER_GIT_REPO_SLUG`, and service metadata at runtime. CTG One exposes these through `/api/health` and Admin System Health so every production incident can be tied to an exact source commit.

A production release is considered traceable only when:

1. the merge commit/PR is known;
2. CI is green;
3. `/api/health` reports the expected full commit SHA;
4. Admin System Health reports Git ↔ Supabase migration alignment as healthy.
