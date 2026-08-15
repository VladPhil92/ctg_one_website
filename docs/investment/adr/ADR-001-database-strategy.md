# ADR-001: Database Strategy

## Status
Accepted

## Context
The existing site already runs on Supabase Postgres with a working migration
history (`supabase/migrations/0001-0003`), RLS conventions, and a
`SECURITY DEFINER` RPC pattern for money-moving operations (see
`docs/investment/EXISTING_SITE_INTEGRATION.md`). Standing up a second database
would duplicate auth, add an operational burden (two connection strings, two
backup policies, cross-database joins to correlate a participant with their
CTG One account), and contradicts the "least invasive" priority in the
project constitution.

## Decision
Extend the existing Supabase project with a new, additive migration series
(`supabase/migrations/0004_investment_*.sql` onward), using an
`investment_`-prefixed table namespace:

`investment_participant_profiles`, `investment_production_lots`,
`investment_production_events`, `investment_funding_allocations`,
`investment_formula_versions`, `investment_inventory_movements`,
`investment_sales`, `investment_ledger_entries`, `investment_settlements`,
`investment_withdrawal_requests`, `investment_reinvestment_requests`,
`investment_documents`, `investment_audit_log`.

No existing table (`profiles`, `wallets`, `transactions`, `kyc_*`,
`admin_audit_log`) is altered. `investment_participant_profiles.user_id`
references `auth.users(id)` directly (same identity system — see ADR-011),
not the existing `wallets`/`transactions` tables, which belong to the
unrelated CTG One deposits feature.

## Consequences
- One Postgres instance, one set of credentials, one migration history to
  reason about.
- Requires discipline: every investment migration must be additive-only
  (`create table`/`create policy`), never touch existing DDL. This is called
  out explicitly in `CLAUDE.md`.
- If CTG Craft Beer Inversión is ever spun out as its own product, the
  `investment_*` namespace makes a future extraction (dump + restore those
  tables) mechanically straightforward.
