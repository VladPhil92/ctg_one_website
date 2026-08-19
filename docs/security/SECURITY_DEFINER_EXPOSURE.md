# SECURITY DEFINER exposure policy

## Purpose

`SECURITY DEFINER` functions execute with the privileges of their owner and therefore cross the caller's normal PostgreSQL privilege boundary. In CTG One they are allowed only when the exposure is deliberate and continuously testable.

## Browser roles

### `anon`

Default: **no executable `SECURITY DEFINER` RPCs**.

Reviewed exception:

- `public.get_public_bottle_trace(text)` — public physical provenance lookup. It is intentionally callable without authentication so a bottle serial can be traced. The function is constrained to bottle/lot provenance and must not expose participant identity, ledger/payment/payout data, bank information, provider references, credentials or document paths.

Adding another anonymous `SECURITY DEFINER` function requires an explicit security review and a deliberate update to `scripts/security-definer-exposure-smoke.sql`.

### `authenticated`

Authenticated callers may execute selected domain RPCs only when the function performs an authorization check inside PostgreSQL. Current accepted guard families include:

- `auth.uid()` identity validation;
- `has_investment_permission(...)` RBAC validation;
- `is_admin()` / investment role helpers that derive authorization from persisted roles.

The CI contract fails when an authenticated-executable `SECURITY DEFINER` function does not contain a reviewed guard pattern. A new architectural pattern must be reviewed before extending the contract.

## Internal tables with RLS and no policies

Several work-queue/state tables deliberately have RLS enabled with no browser policies. This is **deny-all by design**, not an invitation to add permissive policies merely to silence a linter. Their server-side workers use restricted privileged RPCs/service context instead.

Examples include domain-event outbox, notification/document work queues, retry state and API rate-limit windows.

## CI authority

The executable contract is:

`./scripts/security-definer-exposure-smoke.sql`

It is run against a clean database after the full migration chain. Documentation is explanatory; the PostgreSQL contract is the enforcement mechanism.
