# CTG One Testing Strategy

## Principle

Testing is prioritized by business and security risk rather than by an arbitrary coverage target.

## Phase 5 baseline

The repository now includes a dependency-free CI contract test at `scripts/test-critical-invariants.mjs`. It protects static safety assumptions that must not regress silently:

- investment feature flags fail closed;
- all sensitive investment feature switches remain present;
- payment instructions retain a pending sentinel and derived configuration guard;
- baseline HTTP security headers remain configured;
- the health endpoint is non-cacheable and never references the Supabase service-role key.

This is intentionally a baseline, not a substitute for behavioral integration/E2E tests.

## Priority test pyramid

### P0 — financial and authorization

- Admin-only investment mutations reject non-admin users.
- Participant queries cannot read another participant's allocations/ledger/withdrawals.
- Funding, settlement and withdrawal feature flags remain fail closed.
- Ledger-affecting operations are idempotent or uniquely constrained where required.
- Withdrawal requests respect state and authorization rules.

### P1 — identity and KYC

- Registration/login/session refresh.
- Protected route behavior for unauthenticated users.
- KYC state transitions and role checks.
- Invalid/malformed inputs rejected before persistence.

### P2 — public product flows

- Public lot browsing.
- Investment simulator calculations.
- Language parity for critical user journeys.
- Navigation and case-study links.

## Next implementation layer

Introduce Playwright or an equivalent E2E runner only after test credentials and an isolated Supabase test environment are available. Never run destructive financial tests against production.

Recommended suites:

- `auth.spec.ts`
- `kyc.spec.ts`
- `investment-authorization.spec.ts`
- `investment-ledger.spec.ts`
- `withdrawals.spec.ts`

## CI target

PR → install → critical invariants → production dependency audit → typecheck → build → future integration/E2E suite.
