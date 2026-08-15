-- ============================================================
-- CTG Craft Beer Inversión — security hardening for 0004
-- ============================================================
-- Two real gaps found while wiring the first API routes on top of
-- 0004_investment_schema.sql, fixed here (additive, no existing table
-- touched):
--
--   1. Postgres grants EXECUTE on a new function to PUBLIC by default
--      unless explicitly revoked. The internal helpers
--      _investment_create_allocation() and _investment_write_production_event()
--      never got an explicit revoke — meaning any authenticated client
--      could call them directly via supabase.rpc(), bypassing every
--      check their public-facing wrappers perform:
--        - _investment_create_allocation() skips the KYC-verified check
--          in create_funding_allocation(), and lets the caller name any
--          participant_user_id (impersonation) with any capital amount.
--        - _investment_write_production_event() skips the legal-transition
--          check in transition_lot_status(), letting a caller jump a lot
--          straight to any status (e.g. BREWING -> SETTLED).
--      Fixed by explicitly revoking EXECUTE from public/authenticated.
--      Internal calls from the SECURITY DEFINER wrapper functions keep
--      working — they execute as the function owner, which bypasses the
--      grant check; only *direct* RPC calls from a client are blocked.
--
--   2. get_investment_available_balance(p_user uuid) was granted to
--      authenticated with no check that p_user matches the caller — any
--      signed-in participant could read any other participant's balance
--      by passing an arbitrary user id. Fixed by requiring
--      p_user = auth.uid() or is_investment_admin().

revoke all on function public._investment_create_allocation(uuid, uuid, boolean, int, bigint) from public, authenticated;
revoke all on function public._investment_write_production_event(uuid, text, text, uuid, text) from public, authenticated;

create or replace function public.get_investment_available_balance(p_user uuid)
returns bigint
language plpgsql stable security definer set search_path = public
as $$
begin
  if p_user is distinct from auth.uid() and not public.is_investment_admin() then
    raise exception 'not authorized';
  end if;

  return coalesce((
    select sum(amount_cents)
    from public.investment_ledger_entries
    where participant_user_id = p_user
      and entry_type in (
        'SETTLEMENT_CREDIT', 'WITHDRAWAL_DEBIT', 'REINVESTMENT_DEBIT',
        'ADJUSTMENT_CREDIT', 'ADJUSTMENT_DEBIT', 'REVERSAL'
      )
  ), 0);
end;
$$;

revoke all on function public.get_investment_available_balance(uuid) from public;
grant execute on function public.get_investment_available_balance(uuid) to authenticated;
