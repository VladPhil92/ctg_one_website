-- CTG One Wallet — Canonical COP ledger balance hardening
--
-- Migration 0086 promotes the reconciled journal to canonical authority. This
-- follow-up tightens the internal balance helper so historical shadow postings
-- can never participate in a canonical Saldo CTG calculation.

create or replace function public._wallet_ledger_balance_cents(p_user_id uuid)
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(p.amount_cents), 0)::bigint
  from public.wallet_accounts_v2 a
  join public.wallet_journal_postings_v2 p on p.account_id = a.id
  join public.wallet_journal_entries_v2 e on e.id = p.entry_id
  where a.user_id = p_user_id
    and a.account_kind = 'user_available'
    and a.currency = 'COP'
    and a.status <> 'closed'
    and e.status = 'posted'
    and e.metadata ->> 'authoritative' = 'true';
$$;

revoke all on function public._wallet_ledger_balance_cents(uuid)
  from public, anon, authenticated, service_role;

comment on function public._wallet_ledger_balance_cents(uuid) is
  'Internal canonical Saldo CTG projection. Only posted journal entries explicitly marked authoritative=true are counted; shadow evidence is excluded.';
