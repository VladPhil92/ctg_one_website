# API Conventions — CTG Craft Beer Inversión

Route Handlers live under `src/app/api/investment/**`, isolated from the
existing `src/app/api/admin/**` (CTG One deposits/KYC) — never shared route
files.

## Conventions (matching the existing codebase)

- `zod` schemas validate every request body before touching the database
  (mirrors the existing `src/app/api/admin/kyc/[id]/approve/route.ts`
  pattern).
- Handlers use the caller's own session-bound Supabase server client
  (`createClient()` from `src/lib/supabase/server.ts`), never the admin
  client, so RLS and the `SECURITY DEFINER` functions' own `auth.uid()`
  checks are the real authorization boundary — the handler itself is a thin
  validation + RPC-call layer.
- Money-moving/state-changing endpoints call a single Postgres RPC
  (`transition_lot_status`, `approve_withdrawal`, `finalize_settlement`,
  etc.) rather than doing multi-step read-modify-write from the handler.
- Errors map to the explicit domain error types in
  `TESTING_STRATEGY.md`/`DOMAIN_MODEL.md` (`InvalidLotTransitionError`,
  `InsufficientAllocationCapacityError`, etc.) with stable HTTP status codes
  (409 for state conflicts, 403 for authorization, 422 for validation).
- No endpoint returns more data than the caller's role is entitled to —
  participant-facing endpoints scope every query by `auth.uid()`, never by a
  client-supplied participant id.

Not yet implemented in this PR (planned for the domain milestone):
`/api/investment/admin/lots/[id]/transition`,
`/api/investment/admin/settlements/[lotId]/finalize`,
`/api/investment/admin/withdrawals/[id]/{approve,reject}`,
`/api/investment/participant/allocations`,
`/api/investment/participant/withdrawals`.
