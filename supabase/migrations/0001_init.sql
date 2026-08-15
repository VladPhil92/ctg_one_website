-- ============================================================
-- CTG One — accounts, KYC, wallet ledger, and admin review (Phase 1)
-- ============================================================
-- Design invariants this migration enforces (see project plan for the
-- full rationale):
--   1. wallets.balance_cents is NEVER writable directly by a client —
--      only the SECURITY DEFINER functions below may change it, inside
--      a single atomic transaction that also flips the related
--      transactions/kyc_submissions row to its terminal status.
--   2. Every SECURITY DEFINER function re-checks the caller's admin
--      role itself via is_admin()/auth.uid() — it does not trust the
--      calling application code to have already checked this.
--   3. A user cannot submit a deposit request until their own KYC is
--      verified — enforced in the RLS policy on transactions, not just
--      hidden in the UI.
--   4. admin_audit_log is append-only: nobody, including admins, has an
--      UPDATE or DELETE policy on it. Only the SECURITY DEFINER
--      functions insert into it.

-- ------------------------------------------------------------
-- Tables
-- ------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  phone text,
  role text not null default 'user' check (role in ('user', 'admin')),
  kyc_status text not null default 'not_submitted'
    check (kyc_status in ('not_submitted', 'pending', 'verified', 'rejected')),
  created_at timestamptz not null default now()
);

comment on table public.profiles is
  'One row per auth.users, created automatically by handle_new_user(). role and kyc_status are never client-writable — only SECURITY DEFINER functions change them.';

create table public.kyc_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'verified', 'rejected')),
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now()
);

create table public.kyc_documents (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.kyc_submissions (id) on delete cascade,
  document_type text not null, -- e.g. 'cedula_front', 'cedula_back', 'selfie'
  storage_path text not null, -- path within the private 'kyc-documents' bucket
  created_at timestamptz not null default now()
);

create table public.wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  balance_cents bigint not null default 0 check (balance_cents >= 0),
  currency text not null default 'COP',
  updated_at timestamptz not null default now()
);

comment on table public.wallets is
  'balance_cents is only ever changed inside approve_deposit() / future purchase functions — no RLS policy grants authenticated users insert/update/delete here.';

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in ('deposit', 'purchase', 'adjustment')), -- 'purchase' unused until Phase 2
  method text check (method in ('bank_transfer', 'pse', 'bre_b_qr', 'crypto')),
  amount_cents bigint not null check (amount_cents > 0),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  proof_storage_path text, -- path within the private 'payment-proofs' bucket
  external_reference text, -- bank transfer / Bre-B reference, for duplicate detection
  crypto_network text,
  crypto_asset text,
  crypto_tx_hash text,
  admin_notes text,
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Catches literal duplicate submissions of the same external reference
-- (e.g. a user resubmitting the same bank transfer twice). Deliberately
-- a unique index, not a hard app-level block — legitimate repeat
-- deposits with a *different* reference are unaffected.
create unique index transactions_method_external_reference_key
  on public.transactions (method, external_reference)
  where external_reference is not null;

create index transactions_user_id_idx on public.transactions (user_id);
create index transactions_status_idx on public.transactions (status);

create table public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles (id),
  action text not null,
  target_table text not null,
  target_id uuid not null,
  details jsonb,
  created_at timestamptz not null default now()
);

comment on table public.admin_audit_log is
  'Append-only. No UPDATE/DELETE policy for anyone, admins included — only SECURITY DEFINER functions insert here.';

-- ------------------------------------------------------------
-- New-user trigger: create profile + wallet automatically
-- ------------------------------------------------------------

create function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, phone)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'phone'
  );

  insert into public.wallets (user_id) values (new.id);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- is_admin() — reused by every RLS policy and every admin RPC below
-- ------------------------------------------------------------

create function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- ------------------------------------------------------------
-- Admin RPCs — the only code path allowed to change wallet balances or
-- profiles.kyc_status/role. Each one re-verifies is_admin() itself and
-- uses `for update` row locking so double-approval (double click, two
-- admin tabs) is a no-op rather than a double-credit.
-- ------------------------------------------------------------

create function public.approve_deposit(p_transaction_id uuid, p_admin_notes text default null)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_tx record;
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  select * into v_tx from public.transactions where id = p_transaction_id for update;

  if v_tx is null then
    raise exception 'transaction not found';
  end if;
  if v_tx.status <> 'pending' then
    raise exception 'transaction already %', v_tx.status;
  end if;
  if v_tx.type <> 'deposit' then
    raise exception 'not a deposit transaction';
  end if;

  update public.transactions
    set status = 'approved',
        reviewed_by = auth.uid(),
        reviewed_at = now(),
        admin_notes = coalesce(p_admin_notes, admin_notes)
    where id = p_transaction_id;

  update public.wallets
    set balance_cents = balance_cents + v_tx.amount_cents,
        updated_at = now()
    where user_id = v_tx.user_id;

  insert into public.admin_audit_log (admin_id, action, target_table, target_id, details)
    values (
      auth.uid(), 'approve_deposit', 'transactions', p_transaction_id,
      jsonb_build_object('amount_cents', v_tx.amount_cents, 'user_id', v_tx.user_id)
    );
end;
$$;

create function public.reject_deposit(p_transaction_id uuid, p_reason text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_tx record;
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  select * into v_tx from public.transactions where id = p_transaction_id for update;

  if v_tx is null then
    raise exception 'transaction not found';
  end if;
  if v_tx.status <> 'pending' then
    raise exception 'transaction already %', v_tx.status;
  end if;

  update public.transactions
    set status = 'rejected',
        reviewed_by = auth.uid(),
        reviewed_at = now(),
        admin_notes = p_reason
    where id = p_transaction_id;

  insert into public.admin_audit_log (admin_id, action, target_table, target_id, details)
    values (auth.uid(), 'reject_deposit', 'transactions', p_transaction_id, jsonb_build_object('reason', p_reason));
end;
$$;

create function public.approve_kyc(p_submission_id uuid, p_admin_notes text default null)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_sub record;
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  select * into v_sub from public.kyc_submissions where id = p_submission_id for update;

  if v_sub is null then
    raise exception 'submission not found';
  end if;
  if v_sub.status <> 'pending' then
    raise exception 'submission already %', v_sub.status;
  end if;

  update public.kyc_submissions
    set status = 'verified', reviewed_by = auth.uid(), reviewed_at = now()
    where id = p_submission_id;

  update public.profiles
    set kyc_status = 'verified'
    where id = v_sub.user_id;

  insert into public.admin_audit_log (admin_id, action, target_table, target_id, details)
    values (auth.uid(), 'approve_kyc', 'kyc_submissions', p_submission_id, jsonb_build_object('user_id', v_sub.user_id));
end;
$$;

create function public.reject_kyc(p_submission_id uuid, p_reason text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_sub record;
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  select * into v_sub from public.kyc_submissions where id = p_submission_id for update;

  if v_sub is null then
    raise exception 'submission not found';
  end if;
  if v_sub.status <> 'pending' then
    raise exception 'submission already %', v_sub.status;
  end if;

  update public.kyc_submissions
    set status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now(), rejection_reason = p_reason
    where id = p_submission_id;

  update public.profiles
    set kyc_status = 'rejected'
    where id = v_sub.user_id;

  insert into public.admin_audit_log (admin_id, action, target_table, target_id, details)
    values (auth.uid(), 'reject_kyc', 'kyc_submissions', p_submission_id, jsonb_build_object('reason', p_reason));
end;
$$;

revoke all on function public.approve_deposit(uuid, text) from public;
revoke all on function public.reject_deposit(uuid, text) from public;
revoke all on function public.approve_kyc(uuid, text) from public;
revoke all on function public.reject_kyc(uuid, text) from public;
grant execute on function public.approve_deposit(uuid, text) to authenticated;
grant execute on function public.reject_deposit(uuid, text) to authenticated;
grant execute on function public.approve_kyc(uuid, text) to authenticated;
grant execute on function public.reject_kyc(uuid, text) to authenticated;

-- ------------------------------------------------------------
-- Row Level Security
-- ------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.kyc_submissions enable row level security;
alter table public.kyc_documents enable row level security;
alter table public.wallets enable row level security;
alter table public.transactions enable row level security;
alter table public.admin_audit_log enable row level security;

-- profiles: read own row, or any row if admin. No insert/update policy —
-- the row is created by handle_new_user() and role/kyc_status only
-- change via the SECURITY DEFINER functions above.
create policy profiles_select on public.profiles
  for select using (id = (select auth.uid()) or public.is_admin());

-- kyc_submissions: user creates/reads their own; admin reads all.
-- No update policy for authenticated — status only changes via
-- approve_kyc()/reject_kyc().
create policy kyc_submissions_select on public.kyc_submissions
  for select using (user_id = (select auth.uid()) or public.is_admin());

create policy kyc_submissions_insert on public.kyc_submissions
  for insert with check (user_id = (select auth.uid()));

-- kyc_documents: user inserts/reads documents on their own submission;
-- admin reads all.
create policy kyc_documents_select on public.kyc_documents
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.kyc_submissions s
      where s.id = kyc_documents.submission_id and s.user_id = (select auth.uid())
    )
  );

create policy kyc_documents_insert on public.kyc_documents
  for insert with check (
    exists (
      select 1 from public.kyc_submissions s
      where s.id = kyc_documents.submission_id
        and s.user_id = (select auth.uid())
        and s.status = 'pending'
    )
  );

-- wallets: read-only for the owner (or admin). No insert/update/delete
-- policy for authenticated at all — every balance change happens inside
-- a SECURITY DEFINER function.
create policy wallets_select on public.wallets
  for select using (user_id = (select auth.uid()) or public.is_admin());

-- transactions: user creates their own PENDING deposit request, but only
-- once their own KYC is verified — enforced here, not just in the UI.
-- Reads: own rows, or all rows if admin. No update/delete policy for
-- authenticated — status only changes via approve_deposit()/reject_deposit().
create policy transactions_select on public.transactions
  for select using (user_id = (select auth.uid()) or public.is_admin());

create policy transactions_insert on public.transactions
  for insert with check (
    user_id = (select auth.uid())
    and status = 'pending'
    and type = 'deposit'
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.kyc_status = 'verified'
    )
  );

-- admin_audit_log: admin can read; nobody has insert/update/delete
-- policies — only the SECURITY DEFINER functions (which run as the
-- table owner) can write here.
create policy admin_audit_log_select on public.admin_audit_log
  for select using (public.is_admin());

-- ------------------------------------------------------------
-- Storage: private buckets for KYC documents and payment proofs
-- ------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('kyc-documents', 'kyc-documents', false),
       ('payment-proofs', 'payment-proofs', false)
on conflict (id) do nothing;

-- Path convention enforced by these policies: files must be stored as
-- `<user_id>/<filename>`, so the first path segment is checked against
-- auth.uid() without needing a DB lookup.

create policy kyc_documents_storage_insert on storage.objects
  for insert with check (
    bucket_id = 'kyc-documents'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

create policy kyc_documents_storage_select on storage.objects
  for select using (
    bucket_id = 'kyc-documents'
    and ((select auth.uid())::text = (storage.foldername(name))[1] or public.is_admin())
  );

create policy payment_proofs_storage_insert on storage.objects
  for insert with check (
    bucket_id = 'payment-proofs'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

create policy payment_proofs_storage_select on storage.objects
  for select using (
    bucket_id = 'payment-proofs'
    and ((select auth.uid())::text = (storage.foldername(name))[1] or public.is_admin())
  );
