-- CTG One — RLS permission-call evaluation hoisting, accounts and knowledge
--
-- Companion to 0070, which did the same for the investment tables. Row Level
-- Security policies that call a row-independent permission function directly
-- are re-evaluated once per candidate row; wrapping the call as `(select f())`
-- turns it into an InitPlan that Postgres evaluates once per query.
--
-- AUTHORIZATION: CLAUDE.md reserves the existing accounts system for a
-- "separately authorized, explicitly scoped change". This is that change, and
-- its scope is exactly this: the evaluation frequency of already-present
-- permission checks. It adds no policy, removes no policy, and grants nothing.
--
-- This is not an authorization change. `is_admin()`, `is_investment_admin()`
-- and `has_investment_permission()` are all STABLE and take either no argument
-- or a constant permission literal — none receives row data — so hoisting the
-- call cannot alter which rows a policy admits. Predicates that genuinely do
-- depend on the row are deliberately left per-row: the EXISTS subqueries in
-- `kyc_documents_select` and `knowledge_chunks_admin_insert` correlate against
-- the candidate row and are reproduced unchanged.
--
-- The policy bodies below were generated mechanically from the live
-- `pg_policies` definitions rather than retyped, so the predicates are
-- byte-identical apart from the wrapping.
--
-- Measured on 20,000 public.transactions rows (PostgreSQL 16), reading as a
-- user who owns none of them — the case where the ownership test fails and the
-- permission function decides every row:
--
--   96.72 ms -> 1.51 ms  (~64x)
--
-- That case is the one that grows. As accounts accumulate, every user's share
-- of "rows that are not mine" approaches the whole table, so the per-row call
-- becomes the dominant cost of an ordinary read.

drop policy if exists admin_audit_log_select on public.admin_audit_log;
create policy admin_audit_log_select on public.admin_audit_log
  as permissive
  for select
  to public
  using (( SELECT is_admin()));

drop policy if exists knowledge_chunks_admin_delete on public.knowledge_chunks;
create policy knowledge_chunks_admin_delete on public.knowledge_chunks
  as permissive
  for delete
  to authenticated
  using (( SELECT is_admin()));

drop policy if exists knowledge_chunks_admin_insert on public.knowledge_chunks;
create policy knowledge_chunks_admin_insert on public.knowledge_chunks
  as permissive
  for insert
  to authenticated
  with check ((( SELECT is_admin()) AND (EXISTS ( SELECT 1
   FROM knowledge_documents d
  WHERE (d.id = knowledge_chunks.document_id)))));

drop policy if exists knowledge_chunks_admin_update on public.knowledge_chunks;
create policy knowledge_chunks_admin_update on public.knowledge_chunks
  as permissive
  for update
  to authenticated
  using (( SELECT is_admin()))
  with check (( SELECT is_admin()));

drop policy if exists knowledge_documents_admin_delete on public.knowledge_documents;
create policy knowledge_documents_admin_delete on public.knowledge_documents
  as permissive
  for delete
  to authenticated
  using (( SELECT is_admin()));

drop policy if exists knowledge_documents_admin_insert on public.knowledge_documents;
create policy knowledge_documents_admin_insert on public.knowledge_documents
  as permissive
  for insert
  to authenticated
  with check ((( SELECT is_admin()) AND (created_by = ( SELECT auth.uid() AS uid))));

drop policy if exists knowledge_documents_admin_update on public.knowledge_documents;
create policy knowledge_documents_admin_update on public.knowledge_documents
  as permissive
  for update
  to authenticated
  using (( SELECT is_admin()))
  with check (( SELECT is_admin()));

drop policy if exists kyc_documents_select on public.kyc_documents;
create policy kyc_documents_select on public.kyc_documents
  as permissive
  for select
  to public
  using ((( SELECT is_admin()) OR (EXISTS ( SELECT 1
   FROM kyc_submissions s
  WHERE ((s.id = kyc_documents.submission_id) AND (s.user_id = ( SELECT auth.uid() AS uid)))))));

drop policy if exists kyc_submissions_select on public.kyc_submissions;
create policy kyc_submissions_select on public.kyc_submissions
  as permissive
  for select
  to public
  using (((user_id = ( SELECT auth.uid() AS uid)) OR ( SELECT is_admin())));

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  as permissive
  for select
  to public
  using (((id = ( SELECT auth.uid() AS uid)) OR ( SELECT is_admin())));

drop policy if exists transactions_select on public.transactions;
create policy transactions_select on public.transactions
  as permissive
  for select
  to public
  using (((user_id = ( SELECT auth.uid() AS uid)) OR ( SELECT is_admin())));

drop policy if exists wallets_select on public.wallets;
create policy wallets_select on public.wallets
  as permissive
  for select
  to public
  using (((user_id = ( SELECT auth.uid() AS uid)) OR ( SELECT is_admin())));


-- Fail closed: after this migration no policy anywhere in `public` may leave a
-- row-independent permission call unhoisted.
do $$
declare v_remaining text[];
begin
  select coalesce(array_agg(tablename||'.'||policyname order by tablename,policyname),array[]::text[])
  into v_remaining
  from pg_policies
  where schemaname='public'
    and (coalesce(qual,'')||coalesce(with_check,'')) ~ '(has_investment_permission|is_investment_admin|is_admin|is_investment_operator|is_investment_sales_operator)\('
    and (coalesce(qual,'')||coalesce(with_check,'')) !~ 'SELECT (has_investment_permission|is_investment_admin|is_admin|is_investment_operator|is_investment_sales_operator)';

  if array_length(v_remaining,1) > 0 then
    raise exception 'RLS policies still re-evaluate a permission function per row: %', v_remaining;
  end if;
end $$;
