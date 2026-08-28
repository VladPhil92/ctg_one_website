## Summary

Describe the change and the user/business impact.

## Risk

- [ ] No database schema change
- [ ] Database schema change is represented by a new immutable migration
- [ ] Financial/inventory/security behavior changed and has explicit test coverage

## Required checks

- [ ] `npm test`
- [ ] Production dependency audit
- [ ] TypeScript typecheck
- [ ] Next.js production build

## Supabase migration discipline

If this PR adds a migration:

- [ ] New migration filename follows `YYYYMMDDHHMMSS_NNNN_snake_case.sql` (legacy `0001`–`0071` filenames remain grandfathered)
- [ ] Logical `NNNN` version is contiguous with the previous migration
- [ ] Timestamp version is unique and later than the previous timestamped migration
- [ ] `EXPECTED_DATABASE_MIGRATION` matches the latest logical `NNNN` migration
- [ ] Existing applied migration SQL content was not edited; any history-only rename is backed by explicit remote migration-history evidence
- [ ] Post-deploy System Health must report Git ↔ Supabase migration alignment as healthy

## Deployment verification

After merge and Render deploy:

- [ ] `/api/health` reports the merged commit SHA in `deployment.commit`
- [ ] `deployment.branch` is `main`
- [ ] Admin System Health reports the same deployment identity and no schema drift
