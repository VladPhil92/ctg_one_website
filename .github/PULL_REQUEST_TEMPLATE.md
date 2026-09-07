## Summary

Describe the change and the user/business impact.

## Scope / supersession check

- [ ] Branch was synchronized with the latest `main` before final review
- [ ] The final PR still contains an intentional non-empty delta against `main`
- [ ] Conflict resolution did not duplicate constants, JSON records, JSX blocks, imports, tests or migration metadata
- [ ] If later work already implemented this change, this PR will be closed as superseded instead of merged

## Risk

- [ ] No database schema change
- [ ] Database schema change is represented by a new immutable migration
- [ ] Financial/inventory/security/identity/entitlement behavior changed and has explicit test coverage
- [ ] Cross-bounded-context behavior changed and its contract/authority boundary was reviewed

## Required checks

- [ ] `npm test`
- [ ] Production dependency audit
- [ ] Lint
- [ ] TypeScript typecheck
- [ ] Next.js production build
- [ ] Relevant Golden Path / browser journey when the changed domain has one

## Documentation / authority

- [ ] `README.md` remains explanatory and does not duplicate runtime state
- [ ] Any changed architecture or operational contract is reflected in the relevant file under `docs/`
- [ ] Capability maturity claims remain consistent with `src/data/technology-proof.ts`
- [ ] Database-version claims remain derived from `src/lib/observability/schema-version.ts`

## Supabase migration discipline

If this PR adds a migration:

- [ ] New migration filename follows `YYYYMMDDHHMMSS_NNNN_snake_case.sql` (legacy `0001`–`0071` filenames remain grandfathered)
- [ ] Logical `NNNN` version is contiguous with the previous migration
- [ ] Timestamp version is unique and later than the previous timestamped migration
- [ ] `EXPECTED_DATABASE_MIGRATION` matches the latest logical `NNNN` migration
- [ ] Existing applied migration SQL content was not edited; any history-only rename is backed by explicit remote migration-history evidence
- [ ] Migration-history fixtures are valid JSON; every recorded production anchor is unique/ordered and the anchor set ends at the latest evidenced production migration
- [ ] Post-deploy System Health must report Git ↔ Supabase migration alignment as healthy

## Deployment verification

After merge and Render deploy:

- [ ] `/api/health` reports the merged commit SHA in `deployment.commit`
- [ ] `deployment.branch` is `main`
- [ ] Admin System Health reports the same deployment identity and no schema drift
