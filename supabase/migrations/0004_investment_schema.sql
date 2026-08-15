-- ============================================================
-- CTG Craft Beer Inversión — domain schema, ledger, state machine,
-- settlement engine (first domain milestone)
-- ============================================================
-- Purely additive: creates only `investment_`-prefixed tables/functions.
-- No existing table (profiles, wallets, transactions, kyc_*,
-- admin_audit_log) is touched — see docs/investment/adr/ADR-001.
--
-- Design invariants this migration enforces (see docs/investment/ for the
-- full rationale — ADR references noted inline):
--   1. investment_ledger_entries is append-only and is the only source of
--      truth for participant money movement (ADR-003). No table here is
--      directly writable by an authenticated client — every state change
--      goes through a SECURITY DEFINER function below, which re-checks
--      authorization itself via auth.uid() (never trusts the caller).
--   2. investment_production_lots.status only moves through the legal
--      transitions in transition_lot_status() (ADR-008); every transition
--      also writes an investment_production_events row in the same
--      transaction (ADR-009).
--   3. Money is bigint cents everywhere (ADR-007). Settlement distribution
--      uses a largest-remainder allocation so per-participant amounts
--      always sum exactly to the lot's net distributable profit — no cent
--      lost or invented.
--   4. investment_settlements has a unique constraint on lot_id: a lot can
--      only ever be settled once, and a finalized settlement is never
--      updated (ADR-004) — corrections are a future reversal/adjustment
--      ledger entry, not an UPDATE on this table.
--   5. This migration does NOT implement the full per-state-derivation
--      inventory engine, KYC document upload flow, or formula-version
--      management RPCs from docs/investment/DOMAIN_MODEL.md — those are
--      explicitly out of scope for this milestone (see the PR description
--      for what's deferred and why).

-- ------------------------------------------------------------
-- Tables
-- ------------------------------------------------------------

-- Not auto-created by a trigger on every CTG One signup (ADR-011) —
-- lazily created via ensure_investment_participant_profile() the first
-- time a signed-in user actually engages with /inversion.
create table public.investment_participant_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  investment_role text not null default 'PARTICIPANT' check (investment_role in (
    'SUPER_ADMIN', 'FINANCE_ADMIN', 'PRODUCTION_MANAGER', 'INVENTORY_MANAGER',
    'SALES_MANAGER', 'AUDITOR', 'PARTICIPANT'
  )),
  kyc_status text not null default 'NOT_STARTED'
    check (kyc_status in ('NOT_STARTED', 'PENDING', 'VERIFIED', 'REJECTED', 'REQUIRES_REVIEW')),
  bank_account_masked text,
  agreement_accepted_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.investment_participant_profiles is
  'Investment-specific identity/role/KYC state, deliberately separate from public.profiles (ADR-011) — CTG One deposit verification does not imply Craft Beer Inversión verification, or vice versa.';

create table public.investment_formula_versions (
  id uuid primary key default gen_random_uuid(),
  version text not null unique,
  effective_from timestamptz not null default now(),
  effective_to timestamptz,
  participant_profit_share numeric(5, 4) not null check (participant_profit_share between 0 and 1),
  ctg_profit_share numeric(5, 4) not null check (ctg_profit_share between 0 and 1),
  status text not null default 'DRAFT' check (status in ('DRAFT', 'ACTIVE', 'RETIRED')),
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  constraint investment_formula_versions_shares_sum_to_one
    check (participant_profit_share + ctg_profit_share = 1)
);

comment on table public.investment_formula_versions is
  'Every allocation and settlement pins one of these by id and keeps using it forever (ADR-006) — changing the split is a new row, never an UPDATE on an old one.';

-- Only one ACTIVE formula version at a time — the row new allocations pin.
create unique index investment_formula_versions_one_active
  on public.investment_formula_versions ((true)) where status = 'ACTIVE';

create table public.investment_production_lots (
  id uuid primary key default gen_random_uuid(),
  code text not null unique, -- display id, e.g. PB-BOG-GPA-2026-008 — never the join key
  beer_style text not null,
  destination text not null,
  status text not null default 'DRAFT' check (status in (
    'DRAFT', 'FUNDING_PENDING', 'FUNDING_OPEN', 'FUNDED', 'PROCUREMENT', 'BREWING',
    'FERMENTATION', 'CONDITIONING', 'BOTTLING', 'QUALITY_CONTROL', 'WAREHOUSE', 'DISPATCHED',
    'IN_MARKET', 'SELLING', 'SOLD_OUT', 'SETTLEMENT_PENDING', 'SETTLED', 'CLOSED',
    'PAUSED', 'CANCELLED', 'PRODUCTION_LOSS', 'PARTIAL_LOSS', 'RECALLED', 'EXPIRED'
  )),
  case_size_units int not null default 24 check (case_size_units > 0),
  total_cases int not null check (total_cases > 0),
  total_eligible_units int not null check (total_eligible_units > 0), -- same unit as funding_allocations.case_equivalent_units (cases), denominator for allocation_ratio — NOT bottle units
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create table public.investment_production_events (
  id uuid primary key default gen_random_uuid(),
  lot_id uuid not null references public.investment_production_lots (id) on delete cascade,
  previous_status text,
  new_status text not null,
  actor_id uuid references auth.users (id),
  notes text,
  evidence_document_id uuid, -- FK added below, after investment_documents exists
  occurred_at timestamptz not null default now()
);

comment on table public.investment_production_events is
  'Source of truth for the participant-facing lot timeline (ADR-009) — the lot.status column is a projection of this history, never the other way around.';

create table public.investment_funding_allocations (
  id uuid primary key default gen_random_uuid(),
  lot_id uuid not null references public.investment_production_lots (id),
  participant_user_id uuid references auth.users (id),
  is_ctg_internal boolean not null default false,
  case_equivalent_units int not null check (case_equivalent_units > 0),
  capital_committed_cents bigint not null default 0 check (capital_committed_cents >= 0),
  formula_version_id uuid not null references public.investment_formula_versions (id),
  created_at timestamptz not null default now(),
  constraint investment_funding_allocations_participant_xor_ctg check (
    (is_ctg_internal and participant_user_id is null) or
    (not is_ctg_internal and participant_user_id is not null)
  )
);

comment on table public.investment_funding_allocations is
  'Economic allocation within a shared physical lot (ADR-005) — never physical bottle ownership. CTG''s own uncommitted production share is modeled as an is_ctg_internal row so settlement math treats it uniformly.';

create index investment_funding_allocations_lot_id_idx on public.investment_funding_allocations (lot_id);
create index investment_funding_allocations_participant_idx on public.investment_funding_allocations (participant_user_id);

create table public.investment_inventory_movements (
  id uuid primary key default gen_random_uuid(),
  lot_id uuid not null references public.investment_production_lots (id),
  movement_type text not null check (movement_type in (
    'PRODUCED', 'PACKAGED', 'WAREHOUSE_RECEIPT', 'RESERVED', 'UNRESERVED', 'DISPATCHED',
    'RECEIVED_AT_DESTINATION', 'SOLD', 'RETURNED', 'DAMAGED', 'EXPIRED', 'LOST',
    'ADJUSTMENT_IN', 'ADJUSTMENT_OUT'
  )),
  quantity_units int not null check (quantity_units > 0),
  actor_id uuid references auth.users (id),
  occurred_at timestamptz not null default now()
);

comment on table public.investment_inventory_movements is
  'Movement-based inventory (docs/investment/INVENTORY_MODEL.md). This migration enforces one coarse invariant only — outbound movements cannot exceed PRODUCED — inside record_inventory_movement(); full per-state stock derivation is deferred future work.';

create index investment_inventory_movements_lot_id_idx on public.investment_inventory_movements (lot_id);

create table public.investment_lot_financial_entries (
  id uuid primary key default gen_random_uuid(),
  lot_id uuid not null references public.investment_production_lots (id),
  entry_type text not null check (entry_type in ('REVENUE', 'TAX', 'PRODUCTION_COST', 'COMMERCIAL_COST', 'ADJUSTMENT')),
  amount_cents bigint not null check (amount_cents >= 0),
  description text,
  actor_id uuid references auth.users (id),
  created_at timestamptz not null default now()
);

comment on table public.investment_lot_financial_entries is
  'Lot-level revenue/tax/cost facts feeding the NDLP calculation (docs/investment/FINANCIAL_MODEL.md). Deliberately separate from investment_ledger_entries, which is participant-level only.';

create index investment_lot_financial_entries_lot_id_idx on public.investment_lot_financial_entries (lot_id);

create table public.investment_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  participant_user_id uuid not null references auth.users (id),
  lot_id uuid references public.investment_production_lots (id),
  allocation_id uuid references public.investment_funding_allocations (id),
  entry_type text not null check (entry_type in (
    'FUNDING_RECEIVED', 'CAPITAL_COMMITTED', 'CAPITAL_DEPLOYED', 'CAPITAL_RECOVERED',
    'LOT_REVENUE_RECOGNIZED', 'LOT_EXPENSE_RECOGNIZED', 'TAX_RECOGNIZED', 'PROFIT_REALIZED',
    'PROFIT_DISTRIBUTED', 'SETTLEMENT_CREDIT', 'WITHDRAWAL_DEBIT', 'REINVESTMENT_DEBIT',
    'ADJUSTMENT_CREDIT', 'ADJUSTMENT_DEBIT', 'REVERSAL'
  )),
  amount_cents bigint not null check (amount_cents <> 0), -- credits positive, debits negative — see get_investment_available_balance()
  reference text,
  metadata jsonb,
  actor_id uuid references auth.users (id),
  created_at timestamptz not null default now()
);

comment on table public.investment_ledger_entries is
  'Append-only (ADR-003/ADR-004). No UPDATE/DELETE grant to any role, admin included — only the SECURITY DEFINER functions below insert here. Every "balance" a participant sees is a query over this table.';

create index investment_ledger_entries_participant_idx on public.investment_ledger_entries (participant_user_id);

create table public.investment_settlements (
  id uuid primary key default gen_random_uuid(),
  lot_id uuid not null references public.investment_production_lots (id),
  formula_version_id uuid not null references public.investment_formula_versions (id),
  net_distributable_profit_cents bigint not null,
  total_eligible_units int not null,
  snapshot jsonb not null, -- full per-allocation breakdown, for audit/reproducibility (ADR-006)
  finalized_by uuid references auth.users (id),
  finalized_at timestamptz not null default now(),
  constraint investment_settlements_one_per_lot unique (lot_id)
);

comment on table public.investment_settlements is
  'Immutable once inserted (ADR-004) — no UPDATE policy exists for any role. The unique constraint on lot_id also enforces "no duplicate settlement" at the database layer (concurrency requirement, brief §54).';

create table public.investment_withdrawal_requests (
  id uuid primary key default gen_random_uuid(),
  participant_user_id uuid not null references auth.users (id),
  amount_cents bigint not null check (amount_cents > 0),
  status text not null default 'REQUESTED'
    check (status in ('REQUESTED', 'UNDER_REVIEW', 'APPROVED', 'PAYMENT_PROCESSING', 'PAID', 'REJECTED', 'CANCELLED')),
  admin_notes text,
  reviewed_by uuid references auth.users (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.investment_reinvestment_requests (
  id uuid primary key default gen_random_uuid(),
  participant_user_id uuid not null references auth.users (id),
  source_settlement_id uuid not null references public.investment_settlements (id),
  target_lot_id uuid not null references public.investment_production_lots (id),
  amount_cents bigint not null check (amount_cents > 0),
  status text not null default 'REQUESTED' check (status in ('REQUESTED', 'APPROVED', 'REJECTED', 'CANCELLED')),
  reviewed_by uuid references auth.users (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.investment_reinvestment_requests is
  'source_settlement_id + target_lot_id preserve the full genealogy required by brief §31 — Lot A Settlement -> Reinvestment -> Lot B Allocation is always reconstructible.';

create table public.investment_documents (
  id uuid primary key default gen_random_uuid(),
  owner_type text not null check (owner_type in ('PARTICIPANT', 'LOT', 'SETTLEMENT')),
  owner_id uuid not null,
  document_type text not null,
  storage_path text not null, -- convention only in this migration; no storage bucket is provisioned yet (upload flow is future work)
  uploaded_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

alter table public.investment_production_events
  add constraint investment_production_events_evidence_document_fkey
  foreign key (evidence_document_id) references public.investment_documents (id);

create table public.investment_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users (id),
  action text not null,
  entity text not null,
  entity_id uuid,
  previous_value jsonb,
  new_value jsonb,
  reason text,
  created_at timestamptz not null default now()
);

comment on table public.investment_audit_log is
  'Append-only, mirrors public.admin_audit_log''s pattern — no UPDATE/DELETE policy for anyone, only SECURITY DEFINER functions insert here.';

-- ------------------------------------------------------------
-- Role helpers — reused by every RLS policy and RPC below
-- ------------------------------------------------------------

create function public.is_investment_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.investment_participant_profiles
    where user_id = auth.uid() and investment_role in ('SUPER_ADMIN', 'FINANCE_ADMIN')
  );
$$;

create function public.is_investment_operator()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.investment_participant_profiles
    where user_id = auth.uid()
      and investment_role in ('SUPER_ADMIN', 'PRODUCTION_MANAGER', 'INVENTORY_MANAGER')
  );
$$;

revoke all on function public.is_investment_admin() from public;
revoke all on function public.is_investment_operator() from public;
grant execute on function public.is_investment_admin() to authenticated;
grant execute on function public.is_investment_operator() to authenticated;

-- ------------------------------------------------------------
-- Participant onboarding (lazy — ADR-011)
-- ------------------------------------------------------------

create function public.ensure_investment_participant_profile()
returns public.investment_participant_profiles
language plpgsql security definer set search_path = public
as $$
declare
  v_row public.investment_participant_profiles;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select * into v_row from public.investment_participant_profiles where user_id = auth.uid();
  if v_row is null then
    insert into public.investment_participant_profiles (user_id) values (auth.uid())
      returning * into v_row;
  end if;

  return v_row;
end;
$$;

revoke all on function public.ensure_investment_participant_profile() from public;
grant execute on function public.ensure_investment_participant_profile() to authenticated;

-- ------------------------------------------------------------
-- Lot state machine (ADR-008/ADR-009)
-- ------------------------------------------------------------

create function public._investment_write_production_event(
  p_lot_id uuid, p_previous_status text, p_new_status text, p_actor uuid, p_notes text
)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  update public.investment_production_lots set status = p_new_status where id = p_lot_id;

  insert into public.investment_production_events (lot_id, previous_status, new_status, actor_id, notes)
    values (p_lot_id, p_previous_status, p_new_status, p_actor, p_notes);

  insert into public.investment_audit_log (actor_id, action, entity, entity_id, previous_value, new_value)
    values (p_actor, 'transition_lot_status', 'investment_production_lots', p_lot_id,
            jsonb_build_object('status', p_previous_status), jsonb_build_object('status', p_new_status));
end;
$$;

-- Legal (from -> to) pairs. Each state's only legal "next" is the
-- following state, plus the shared exceptional states reachable from any
-- in-progress status. BREWING -> SETTLED (or any other skipped-state
-- jump) is not in this table and is rejected below regardless of caller.
create function public.transition_lot_status(
  p_lot_id uuid, p_new_status text, p_notes text default null, p_evidence_document_id uuid default null
)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_lot record;
  v_legal_next text[];
  v_exceptional text[] := array['PAUSED', 'CANCELLED', 'PRODUCTION_LOSS', 'PARTIAL_LOSS', 'RECALLED', 'EXPIRED'];
begin
  if not public.is_investment_operator() then
    raise exception 'not authorized';
  end if;

  select * into v_lot from public.investment_production_lots where id = p_lot_id for update;
  if v_lot is null then
    raise exception 'lot not found';
  end if;

  v_legal_next := case v_lot.status
    when 'DRAFT' then array['FUNDING_PENDING']
    when 'FUNDING_PENDING' then array['FUNDING_OPEN']
    when 'FUNDING_OPEN' then array['FUNDED']
    when 'FUNDED' then array['PROCUREMENT']
    when 'PROCUREMENT' then array['BREWING']
    when 'BREWING' then array['FERMENTATION']
    when 'FERMENTATION' then array['CONDITIONING']
    when 'CONDITIONING' then array['BOTTLING']
    when 'BOTTLING' then array['QUALITY_CONTROL']
    when 'QUALITY_CONTROL' then array['WAREHOUSE']
    when 'WAREHOUSE' then array['DISPATCHED']
    when 'DISPATCHED' then array['IN_MARKET']
    when 'IN_MARKET' then array['SELLING']
    when 'SELLING' then array['SOLD_OUT']
    when 'SOLD_OUT' then array['SETTLEMENT_PENDING']
    when 'SETTLEMENT_PENDING' then array['SETTLED']
    when 'SETTLED' then array['CLOSED']
    else array[]::text[]
  end;

  if not (p_new_status = any(v_legal_next) or p_new_status = any(v_exceptional)) then
    raise exception 'illegal transition: % -> %', v_lot.status, p_new_status;
  end if;

  perform public._investment_write_production_event(p_lot_id, v_lot.status, p_new_status, auth.uid(), p_notes);

  if p_evidence_document_id is not null then
    update public.investment_production_events
      set evidence_document_id = p_evidence_document_id
      where id = (
        select id from public.investment_production_events
        where lot_id = p_lot_id and new_status = p_new_status
        order by occurred_at desc limit 1
      );
  end if;
end;
$$;

create function public.create_production_lot(
  p_code text, p_beer_style text, p_destination text, p_total_cases int, p_case_size_units int default 24
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_lot_id uuid;
begin
  if not public.is_investment_operator() then
    raise exception 'not authorized';
  end if;

  insert into public.investment_production_lots
    (code, beer_style, destination, total_cases, case_size_units, total_eligible_units, created_by)
    -- total_eligible_units is in the same unit as funding_allocations.case_equivalent_units
    -- (cases) — it must equal total_cases, not total_cases * case_size_units (bottles),
    -- or the settlement engine's allocation_ratio computation below would be wrong.
    values (p_code, p_beer_style, p_destination, p_total_cases, p_case_size_units,
            p_total_cases, auth.uid())
    returning id into v_lot_id;

  return v_lot_id;
end;
$$;

revoke all on function public.transition_lot_status(uuid, text, text, uuid) from public;
revoke all on function public.create_production_lot(text, text, text, int, int) from public;
grant execute on function public.transition_lot_status(uuid, text, text, uuid) to authenticated;
grant execute on function public.create_production_lot(text, text, text, int, int) to authenticated;

-- ------------------------------------------------------------
-- Funding allocation (ADR-005) — the only insert path into
-- investment_funding_allocations
-- ------------------------------------------------------------

create function public._investment_create_allocation(
  p_lot_id uuid, p_participant uuid, p_is_ctg_internal boolean,
  p_case_equivalent_units int, p_capital_committed_cents bigint
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_lot record;
  v_allocated int;
  v_formula_version_id uuid;
  v_allocation_id uuid;
begin
  select * into v_lot from public.investment_production_lots where id = p_lot_id for update;
  if v_lot is null then
    raise exception 'lot not found';
  end if;
  if v_lot.status <> 'FUNDING_OPEN' then
    raise exception 'lot is not open for funding (status: %)', v_lot.status;
  end if;

  select coalesce(sum(case_equivalent_units), 0) into v_allocated
    from public.investment_funding_allocations where lot_id = p_lot_id;

  if v_allocated + p_case_equivalent_units > v_lot.total_cases then
    raise exception 'allocation exceeds lot capacity: % of % cases already allocated, % requested',
      v_allocated, v_lot.total_cases, p_case_equivalent_units;
  end if;

  select id into v_formula_version_id from public.investment_formula_versions where status = 'ACTIVE';
  if v_formula_version_id is null then
    raise exception 'no active formula version configured';
  end if;

  insert into public.investment_funding_allocations
    (lot_id, participant_user_id, is_ctg_internal, case_equivalent_units, capital_committed_cents, formula_version_id)
    values (p_lot_id, p_participant, p_is_ctg_internal, p_case_equivalent_units, p_capital_committed_cents, v_formula_version_id)
    returning id into v_allocation_id;

  return v_allocation_id;
end;
$$;

create function public.create_funding_allocation(p_lot_id uuid, p_case_equivalent_units int, p_capital_committed_cents bigint)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_kyc_status text;
  v_allocation_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select kyc_status into v_kyc_status from public.investment_participant_profiles where user_id = auth.uid();
  if v_kyc_status is distinct from 'VERIFIED' then
    raise exception 'KYC not verified';
  end if;

  v_allocation_id := public._investment_create_allocation(
    p_lot_id, auth.uid(), false, p_case_equivalent_units, p_capital_committed_cents
  );

  insert into public.investment_ledger_entries (participant_user_id, lot_id, allocation_id, entry_type, amount_cents, actor_id)
    values (auth.uid(), p_lot_id, v_allocation_id, 'FUNDING_RECEIVED', p_capital_committed_cents, auth.uid()),
           (auth.uid(), p_lot_id, v_allocation_id, 'CAPITAL_COMMITTED', p_capital_committed_cents, auth.uid());

  return v_allocation_id;
end;
$$;

revoke all on function public.create_funding_allocation(uuid, int, bigint) from public;
grant execute on function public.create_funding_allocation(uuid, int, bigint) to authenticated;

-- ------------------------------------------------------------
-- Inventory (coarse invariant only — see table comment above)
-- ------------------------------------------------------------

create function public.record_inventory_movement(p_lot_id uuid, p_movement_type text, p_quantity_units int)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_produced int;
  v_outbound int;
  v_movement_id uuid;
begin
  if not public.is_investment_operator() then
    raise exception 'not authorized';
  end if;

  perform 1 from public.investment_production_lots where id = p_lot_id for update;

  if p_movement_type in ('DISPATCHED', 'SOLD', 'DAMAGED', 'EXPIRED', 'LOST', 'ADJUSTMENT_OUT') then
    select coalesce(sum(quantity_units), 0) into v_produced
      from public.investment_inventory_movements where lot_id = p_lot_id and movement_type = 'PRODUCED';
    select coalesce(sum(quantity_units), 0) into v_outbound
      from public.investment_inventory_movements
      where lot_id = p_lot_id
        and movement_type in ('DISPATCHED', 'SOLD', 'DAMAGED', 'EXPIRED', 'LOST', 'ADJUSTMENT_OUT');

    if v_outbound + p_quantity_units > v_produced then
      raise exception 'movement would exceed produced units: % produced, % already out, % requested',
        v_produced, v_outbound, p_quantity_units;
    end if;
  end if;

  insert into public.investment_inventory_movements (lot_id, movement_type, quantity_units, actor_id)
    values (p_lot_id, p_movement_type, p_quantity_units, auth.uid())
    returning id into v_movement_id;

  return v_movement_id;
end;
$$;

revoke all on function public.record_inventory_movement(uuid, text, int) from public;
grant execute on function public.record_inventory_movement(uuid, text, int) to authenticated;

-- ------------------------------------------------------------
-- Lot financial entries (admin-only, feed NDLP)
-- ------------------------------------------------------------

create function public.record_lot_financial_entry(p_lot_id uuid, p_entry_type text, p_amount_cents bigint, p_description text default null)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_entry_id uuid;
begin
  if not public.is_investment_admin() then
    raise exception 'not authorized';
  end if;

  insert into public.investment_lot_financial_entries (lot_id, entry_type, amount_cents, description, actor_id)
    values (p_lot_id, p_entry_type, p_amount_cents, p_description, auth.uid())
    returning id into v_entry_id;

  return v_entry_id;
end;
$$;

revoke all on function public.record_lot_financial_entry(uuid, text, bigint, text) from public;
grant execute on function public.record_lot_financial_entry(uuid, text, bigint, text) to authenticated;

-- ------------------------------------------------------------
-- Settlement engine — the highest-risk function in this migration
-- ------------------------------------------------------------

create function public.finalize_settlement(p_lot_id uuid)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_lot record;
  v_ndlp bigint;
  v_settlement_id uuid;
  v_snapshot jsonb;
begin
  if not public.is_investment_admin() then
    raise exception 'not authorized';
  end if;

  select * into v_lot from public.investment_production_lots where id = p_lot_id for update;
  if v_lot is null then
    raise exception 'lot not found';
  end if;
  if v_lot.status <> 'SETTLEMENT_PENDING' then
    raise exception 'lot is not in SETTLEMENT_PENDING (status: %)', v_lot.status;
  end if;
  if exists (select 1 from public.investment_settlements where lot_id = p_lot_id) then
    raise exception 'lot already settled';
  end if;

  -- NDLP = Eligible Recognized Revenue - Taxes - Production Costs - Commercial Costs - Adjustments
  -- (docs/investment/FINANCIAL_MODEL.md)
  select
    coalesce(sum(amount_cents) filter (where entry_type = 'REVENUE'), 0)
    - coalesce(sum(amount_cents) filter (where entry_type = 'TAX'), 0)
    - coalesce(sum(amount_cents) filter (where entry_type = 'PRODUCTION_COST'), 0)
    - coalesce(sum(amount_cents) filter (where entry_type = 'COMMERCIAL_COST'), 0)
    - coalesce(sum(amount_cents) filter (where entry_type = 'ADJUSTMENT'), 0)
  into v_ndlp
  from public.investment_lot_financial_entries where lot_id = p_lot_id;

  -- Per-allocation distribution using the largest-remainder method, so
  -- sum(attributable_ndlp) across all allocations always equals v_ndlp
  -- exactly — no cent lost or invented (ADR-007).
  with base as (
    select
      fa.id as allocation_id,
      fa.participant_user_id,
      fa.is_ctg_internal,
      fa.case_equivalent_units,
      fa.capital_committed_cents,
      fa.formula_version_id,
      fv.participant_profit_share,
      -- integer floor division for the guaranteed base share
      (v_ndlp * fa.case_equivalent_units) / v_lot.total_eligible_units as attributable_ndlp_floor,
      (v_ndlp * fa.case_equivalent_units) % v_lot.total_eligible_units as remainder_numerator
    from public.investment_funding_allocations fa
    join public.investment_formula_versions fv on fv.id = fa.formula_version_id
    where fa.lot_id = p_lot_id
  ),
  remainder_total as (
    select v_ndlp - coalesce(sum(attributable_ndlp_floor), 0) as cents_to_distribute from base
  ),
  ranked as (
    select
      base.*,
      row_number() over (order by remainder_numerator desc, allocation_id asc) as rnk
    from base
  ),
  distributed as (
    select
      ranked.*,
      attributable_ndlp_floor + case when rnk <= (select cents_to_distribute from remainder_total) then 1 else 0 end
        as attributable_ndlp_cents
    from ranked
  ),
  final as (
    select
      *,
      round(attributable_ndlp_cents * participant_profit_share) as participant_profit_cents,
      attributable_ndlp_cents - round(attributable_ndlp_cents * participant_profit_share) as ctg_profit_cents
    from distributed
  )
  select jsonb_agg(jsonb_build_object(
    'allocation_id', allocation_id,
    'participant_user_id', participant_user_id,
    'is_ctg_internal', is_ctg_internal,
    'case_equivalent_units', case_equivalent_units,
    'capital_committed_cents', capital_committed_cents,
    'formula_version_id', formula_version_id,
    'attributable_ndlp_cents', attributable_ndlp_cents,
    'participant_profit_cents', participant_profit_cents,
    'ctg_profit_cents', ctg_profit_cents,
    'capital_recovery_cents', capital_committed_cents,
    'settlement_amount_cents', capital_committed_cents + participant_profit_cents
  )) into v_snapshot
  from final;

  insert into public.investment_settlements
    (lot_id, formula_version_id, net_distributable_profit_cents, total_eligible_units, snapshot, finalized_by)
    values (p_lot_id, (select formula_version_id from public.investment_funding_allocations where lot_id = p_lot_id limit 1),
            v_ndlp, v_lot.total_eligible_units, v_snapshot, auth.uid())
    returning id into v_settlement_id;

  -- Credit every non-CTG-internal allocation: capital recovery + profit
  -- share, in a single SETTLEMENT_CREDIT entry (breakdown kept in metadata).
  insert into public.investment_ledger_entries
    (participant_user_id, lot_id, allocation_id, entry_type, amount_cents, reference, metadata, actor_id)
  select
    (elem ->> 'participant_user_id')::uuid,
    p_lot_id,
    (elem ->> 'allocation_id')::uuid,
    'SETTLEMENT_CREDIT',
    (elem ->> 'settlement_amount_cents')::bigint,
    v_settlement_id::text,
    jsonb_build_object(
      'capital_recovery_cents', elem ->> 'capital_recovery_cents',
      'participant_profit_cents', elem ->> 'participant_profit_cents'
    ),
    auth.uid()
  from jsonb_array_elements(v_snapshot) elem
  where not (elem ->> 'is_ctg_internal')::boolean
    and (elem ->> 'settlement_amount_cents')::bigint > 0;

  perform public._investment_write_production_event(p_lot_id, v_lot.status, 'SETTLED', auth.uid(), 'Settlement finalized');

  insert into public.investment_audit_log (actor_id, action, entity, entity_id, new_value)
    values (auth.uid(), 'finalize_settlement', 'investment_settlements', v_settlement_id,
            jsonb_build_object('lot_id', p_lot_id, 'ndlp_cents', v_ndlp));

  return v_settlement_id;
end;
$$;

revoke all on function public.finalize_settlement(uuid) from public;
grant execute on function public.finalize_settlement(uuid) to authenticated;

-- ------------------------------------------------------------
-- Available balance + withdrawals + reinvestment
-- ------------------------------------------------------------

create function public.get_investment_available_balance(p_user uuid)
returns bigint
language sql stable security definer set search_path = public
as $$
  select coalesce(sum(amount_cents), 0)
  from public.investment_ledger_entries
  where participant_user_id = p_user
    and entry_type in ('SETTLEMENT_CREDIT', 'WITHDRAWAL_DEBIT', 'REINVESTMENT_DEBIT', 'ADJUSTMENT_CREDIT', 'ADJUSTMENT_DEBIT', 'REVERSAL');
$$;

revoke all on function public.get_investment_available_balance(uuid) from public;
grant execute on function public.get_investment_available_balance(uuid) to authenticated;

create function public.request_withdrawal(p_amount_cents bigint)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_available bigint;
  v_request_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  v_available := public.get_investment_available_balance(auth.uid());
  if p_amount_cents > v_available then
    raise exception 'amount exceeds available balance: % requested, % available', p_amount_cents, v_available;
  end if;

  insert into public.investment_withdrawal_requests (participant_user_id, amount_cents)
    values (auth.uid(), p_amount_cents)
    returning id into v_request_id;

  return v_request_id;
end;
$$;

create function public.approve_withdrawal(p_request_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_req record;
  v_available bigint;
begin
  if not public.is_investment_admin() then
    raise exception 'not authorized';
  end if;

  select * into v_req from public.investment_withdrawal_requests where id = p_request_id for update;
  if v_req is null then
    raise exception 'request not found';
  end if;
  if v_req.status <> 'REQUESTED' then
    raise exception 'request already %', v_req.status;
  end if;

  -- Re-validate against the *current* balance, not just at request time
  -- (concurrency requirement, brief §54 — two admins acting on stale state).
  v_available := public.get_investment_available_balance(v_req.participant_user_id);
  if v_req.amount_cents > v_available then
    raise exception 'amount no longer covered by available balance: % requested, % available', v_req.amount_cents, v_available;
  end if;

  update public.investment_withdrawal_requests
    set status = 'APPROVED', reviewed_by = auth.uid(), reviewed_at = now()
    where id = p_request_id;

  insert into public.investment_audit_log (actor_id, action, entity, entity_id)
    values (auth.uid(), 'approve_withdrawal', 'investment_withdrawal_requests', p_request_id);
end;
$$;

create function public.reject_withdrawal(p_request_id uuid, p_reason text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_req record;
begin
  if not public.is_investment_admin() then
    raise exception 'not authorized';
  end if;

  select * into v_req from public.investment_withdrawal_requests where id = p_request_id for update;
  if v_req is null then
    raise exception 'request not found';
  end if;
  if v_req.status not in ('REQUESTED', 'UNDER_REVIEW') then
    raise exception 'request already %', v_req.status;
  end if;

  update public.investment_withdrawal_requests
    set status = 'REJECTED', reviewed_by = auth.uid(), reviewed_at = now(), admin_notes = p_reason
    where id = p_request_id;

  insert into public.investment_audit_log (actor_id, action, entity, entity_id, reason)
    values (auth.uid(), 'reject_withdrawal', 'investment_withdrawal_requests', p_request_id, p_reason);
end;
$$;

create function public.mark_withdrawal_paid(p_request_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_req record;
begin
  if not public.is_investment_admin() then
    raise exception 'not authorized';
  end if;

  select * into v_req from public.investment_withdrawal_requests where id = p_request_id for update;
  if v_req is null then
    raise exception 'request not found';
  end if;
  if v_req.status <> 'APPROVED' then
    raise exception 'request must be APPROVED first (currently %)', v_req.status;
  end if;

  update public.investment_withdrawal_requests
    set status = 'PAID', reviewed_at = now()
    where id = p_request_id;

  insert into public.investment_ledger_entries (participant_user_id, entry_type, amount_cents, reference, actor_id)
    values (v_req.participant_user_id, 'WITHDRAWAL_DEBIT', -v_req.amount_cents, p_request_id::text, auth.uid());

  insert into public.investment_audit_log (actor_id, action, entity, entity_id, new_value)
    values (auth.uid(), 'mark_withdrawal_paid', 'investment_withdrawal_requests', p_request_id,
            jsonb_build_object('amount_cents', v_req.amount_cents));
end;
$$;

create function public.request_reinvestment(p_source_settlement_id uuid, p_target_lot_id uuid, p_amount_cents bigint)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_available bigint;
  v_request_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  v_available := public.get_investment_available_balance(auth.uid());
  if p_amount_cents > v_available then
    raise exception 'amount exceeds available balance: % requested, % available', p_amount_cents, v_available;
  end if;

  insert into public.investment_reinvestment_requests
    (participant_user_id, source_settlement_id, target_lot_id, amount_cents)
    values (auth.uid(), p_source_settlement_id, p_target_lot_id, p_amount_cents)
    returning id into v_request_id;

  return v_request_id;
end;
$$;

create function public.approve_reinvestment(p_request_id uuid, p_case_equivalent_units int)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_req record;
  v_available bigint;
  v_allocation_id uuid;
begin
  if not public.is_investment_admin() then
    raise exception 'not authorized';
  end if;

  select * into v_req from public.investment_reinvestment_requests where id = p_request_id for update;
  if v_req is null then
    raise exception 'request not found';
  end if;
  if v_req.status <> 'REQUESTED' then
    raise exception 'request already %', v_req.status;
  end if;

  v_available := public.get_investment_available_balance(v_req.participant_user_id);
  if v_req.amount_cents > v_available then
    raise exception 'amount no longer covered by available balance: % requested, % available', v_req.amount_cents, v_available;
  end if;

  v_allocation_id := public._investment_create_allocation(
    v_req.target_lot_id, v_req.participant_user_id, false, p_case_equivalent_units, v_req.amount_cents
  );

  update public.investment_reinvestment_requests
    set status = 'APPROVED', reviewed_by = auth.uid(), reviewed_at = now()
    where id = p_request_id;

  insert into public.investment_ledger_entries
    (participant_user_id, lot_id, allocation_id, entry_type, amount_cents, reference, actor_id)
    values (v_req.participant_user_id, v_req.target_lot_id, v_allocation_id, 'REINVESTMENT_DEBIT',
            -v_req.amount_cents, p_request_id::text, auth.uid());

  insert into public.investment_audit_log (actor_id, action, entity, entity_id, new_value)
    values (auth.uid(), 'approve_reinvestment', 'investment_reinvestment_requests', p_request_id,
            jsonb_build_object('target_lot_id', v_req.target_lot_id, 'amount_cents', v_req.amount_cents));

  return v_allocation_id;
end;
$$;

revoke all on function public.request_withdrawal(bigint) from public;
revoke all on function public.approve_withdrawal(uuid) from public;
revoke all on function public.reject_withdrawal(uuid, text) from public;
revoke all on function public.mark_withdrawal_paid(uuid) from public;
revoke all on function public.request_reinvestment(uuid, uuid, bigint) from public;
revoke all on function public.approve_reinvestment(uuid, int) from public;
grant execute on function public.request_withdrawal(bigint) to authenticated;
grant execute on function public.approve_withdrawal(uuid) to authenticated;
grant execute on function public.reject_withdrawal(uuid, text) to authenticated;
grant execute on function public.mark_withdrawal_paid(uuid) to authenticated;
grant execute on function public.request_reinvestment(uuid, uuid, bigint) to authenticated;
grant execute on function public.approve_reinvestment(uuid, int) to authenticated;

-- ------------------------------------------------------------
-- Row Level Security
-- ------------------------------------------------------------

alter table public.investment_participant_profiles enable row level security;
alter table public.investment_formula_versions enable row level security;
alter table public.investment_production_lots enable row level security;
alter table public.investment_production_events enable row level security;
alter table public.investment_funding_allocations enable row level security;
alter table public.investment_inventory_movements enable row level security;
alter table public.investment_lot_financial_entries enable row level security;
alter table public.investment_ledger_entries enable row level security;
alter table public.investment_settlements enable row level security;
alter table public.investment_withdrawal_requests enable row level security;
alter table public.investment_reinvestment_requests enable row level security;
alter table public.investment_documents enable row level security;
alter table public.investment_audit_log enable row level security;

-- Own row, or admin. No insert/update policy — row is created by
-- ensure_investment_participant_profile() (SECURITY DEFINER).
create policy investment_participant_profiles_select on public.investment_participant_profiles
  for select using (user_id = (select auth.uid()) or public.is_investment_admin());

-- Public/transparency data — not sensitive.
create policy investment_formula_versions_select on public.investment_formula_versions
  for select using (true);

create policy investment_production_lots_select on public.investment_production_lots
  for select using (true);

create policy investment_production_events_select on public.investment_production_events
  for select using (true);

create policy investment_inventory_movements_select on public.investment_inventory_movements
  for select using (true);

-- Own allocations, or admin — other participants' capital/allocation
-- amounts are not exposed to each other.
create policy investment_funding_allocations_select on public.investment_funding_allocations
  for select using (participant_user_id = (select auth.uid()) or public.is_investment_admin());

-- Internal financial line items — admin only, never shown raw to participants.
create policy investment_lot_financial_entries_select on public.investment_lot_financial_entries
  for select using (public.is_investment_admin());

-- Own ledger rows, or admin. No insert/update/delete policy — append-only
-- via SECURITY DEFINER functions only.
create policy investment_ledger_entries_select on public.investment_ledger_entries
  for select using (participant_user_id = (select auth.uid()) or public.is_investment_admin());

-- Admin only — the snapshot contains every participant's breakdown for the
-- lot, so even a participant with their own allocation cannot read this
-- table directly. Participants see their own result via their own
-- SETTLEMENT_CREDIT ledger rows instead.
create policy investment_settlements_select on public.investment_settlements
  for select using (public.is_investment_admin());

create policy investment_withdrawal_requests_select on public.investment_withdrawal_requests
  for select using (participant_user_id = (select auth.uid()) or public.is_investment_admin());

create policy investment_reinvestment_requests_select on public.investment_reinvestment_requests
  for select using (participant_user_id = (select auth.uid()) or public.is_investment_admin());

-- LOT-owned documents (production evidence) are participant-visible per
-- brief §25; PARTICIPANT/SETTLEMENT-owned documents are restricted to
-- their owner or admin.
create policy investment_documents_select on public.investment_documents
  for select using (
    public.is_investment_admin()
    or owner_type = 'LOT'
    or (owner_type = 'PARTICIPANT' and owner_id = (select auth.uid()))
  );

create policy investment_audit_log_select on public.investment_audit_log
  for select using (public.is_investment_admin());
