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

- [ ] Filename follows `NNNN_snake_case.sql`
- [ ] Version is contiguous with the previous migration
- [ ] `EXPECTED_DATABASE_MIGRATION` matches the new latest migration
- [ ] Existing applied migration files were not edited or renumbered
- [ ] Post-deploy System Health must report Git ↔ Supabase migration alignment as healthy

## Deployment verification

After merge and Render deploy:

- [ ] `/api/health` reports the merged commit SHA in `deployment.commit`
- [ ] `deployment.branch` is `main`
- [ ] Admin System Health reports the same deployment identity and no schema drift
