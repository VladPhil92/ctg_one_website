# Security Model — CTG Craft Beer Inversión

## Roles (RBAC, distinct from the existing CTG One `profiles.role`)

`SUPER_ADMIN`, `FINANCE_ADMIN`, `PRODUCTION_MANAGER`, `INVENTORY_MANAGER`,
`SALES_MANAGER`, `AUDITOR` (read-only), `PARTICIPANT`. Stored on
`investment_participant_profiles.investment_role` (or a dedicated roles
table once the domain milestone lands) — kept separate from
`profiles.role` per ADR-011, since "CTG One admin" and "Craft Beer
Inversión admin" are not necessarily the same permission grant.

A participant may only ever access their own profile, allocations,
agreements, production tracking, financial history, withdrawals,
reinvestments, and documents — enforced by RLS (`user_id = auth.uid()` or
`participant_id` ownership checks), not just UI hiding.

## Authorization pattern (matches the existing CTG One deposits/KYC RPCs)

- Server-side authorization is authoritative. Every `SECURITY DEFINER`
  function (settlement, withdrawal approval, lot transitions) re-checks the
  caller's role itself via `auth.uid()` / a reusable `is_investment_admin()`
  — the Route Handler's own role check is a UX fast-path only, never the
  real gate.
- RLS policies wrap `auth.uid()` as `(select auth.uid())` (Supabase's
  documented performance pattern, already used in the existing migrations).
- `SET search_path = public` on every `SECURITY DEFINER` function (already
  the convention in `supabase/migrations/0001_init.sql` — carried forward).
- KYC gating enforced in the database: an `insert` policy on
  `investment_funding_allocations`/ledger funding entries requires
  `investment_participant_profiles.kyc_status = 'verified'`, not just a
  disabled button in the UI.

## Sensitive data

Government IDs, bank details, identity documents, contracts, and KYC
records are never logged. Bank details are masked in the UI
(`**** **** 4821`). File uploads (KYC documents, evidence) go to a private
Supabase Storage bucket with signed, short-lived URLs — never a public
bucket — mirroring the existing CTG One KYC document handling.

## OWASP-aligned baseline

Server-side authorization on every mutation, input validation via `zod`
(already a project dependency) before touching the database, secure/HTTP-only
session cookies (inherited from `@supabase/ssr`), safe file upload handling
(type/size validation, private storage), least privilege per role, structured
audit logging, and no sensitive values in error messages returned to the
client.
