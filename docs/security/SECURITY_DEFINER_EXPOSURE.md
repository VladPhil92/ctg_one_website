# SECURITY DEFINER exposure policy

## Purpose

`SECURITY DEFINER` functions execute with the privileges of their owner and therefore cross the caller's normal PostgreSQL privilege boundary. In CTG One they are allowed only when the exposure is deliberate and continuously testable.

The policy covers **every schema exposed through the Supabase Data API**, currently `public` and `graphql_public`.

## Browser roles

### `anon`

Default: **no executable `SECURITY DEFINER` RPCs**.

Reviewed exception:

- `public.get_public_bottle_trace(text)` — public physical provenance lookup. It is intentionally callable without authentication so a bottle serial can be traced.

The exception is constrained by an exact CI contract:

- exact result-column/type signature;
- exact set of referenced `public` objects;
- pinned `search_path`;
- no second anonymous SECURITY DEFINER function in any Data API schema.

Adding or changing anonymous privileged exposure requires explicit security review and an intentional contract update.

### `authenticated`

Authenticated SECURITY DEFINER exposure is governed by an **exact source-controlled signature allowlist**:

`./scripts/security-definer-authenticated-allowlist.txt`

CI compares the complete set of authenticated-executable SECURITY DEFINER functions in every Data API schema against this allowlist in both directions. Therefore:

- a new privileged RPC or overload fails until reviewed and added;
- an unexpected grant fails;
- a revoked/removed RPC leaves a stale allowlist entry and also fails;
- moving privileged code into another exposed schema does not bypass the contract.

Authorization behavior inside each approved RPC remains part of its domain/security tests and code review. The allowlist intentionally does **not** infer safety from source-code substring matching.

## Search-path requirement

Every browser-exposed SECURITY DEFINER function must have an explicitly pinned `search_path`. CI rejects an exposed definer function without this setting.

## Internal tables with RLS and no policies

Several work-queue/state tables deliberately have RLS enabled with no browser policies. This is **deny-all by design**, not an invitation to add permissive policies merely to silence a linter. Their server-side workers use restricted privileged RPCs/service context instead.

Examples include domain-event outbox, notification/document work queues, retry state and API rate-limit windows.

## CI authority

The executable contracts are:

- `./scripts/security-definer-exposure-smoke.sql`
- `./scripts/security-definer-authenticated-allowlist.txt`

They run against a clean database after the full migration chain. Documentation is explanatory; the PostgreSQL contract and reviewed allowlist are the enforcement mechanism.
