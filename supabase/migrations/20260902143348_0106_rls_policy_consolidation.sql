-- CTG One — RLS Policy Consolidation
--
-- Preserve the exact read semantics of Education and Investment while reducing
-- duplicate permissive SELECT policies for authenticated users.

-- Education offerings: anonymous users retain published-only access. Signed-in
-- users retain the previous OR semantics: published OR actively entitled.
drop policy if exists education_offerings_entitled_read on public.education_offerings;
drop policy if exists education_offerings_public_read on public.education_offerings;

create policy education_offerings_anon_read
  on public.education_offerings
  for select
  to anon
  using (status = 'published');

create policy education_offerings_authenticated_read
  on public.education_offerings
  for select
  to authenticated
  using (
    status = 'published'
    or exists (
      select 1
      from public.education_entitlements e
      where e.offering_id = education_offerings.id
        and e.user_id = (select auth.uid())
        and e.status = 'active'
        and e.starts_at <= now()
        and (e.ends_at is null or e.ends_at > now())
    )
  );

-- Investment production lots: anonymous users retain visibility of non-draft
-- lots. Signed-in users retain the previous OR semantics: public lot visibility
-- OR the existing ops.read permission boundary.
drop policy if exists investment_production_lots_ops_select on public.investment_production_lots;
drop policy if exists investment_production_lots_public_select on public.investment_production_lots;

create policy investment_production_lots_anon_select
  on public.investment_production_lots
  for select
  to anon
  using (status <> 'DRAFT');

create policy investment_production_lots_authenticated_select
  on public.investment_production_lots
  for select
  to authenticated
  using (
    status <> 'DRAFT'
    or (select public.has_investment_permission('ops.read'))
  );
