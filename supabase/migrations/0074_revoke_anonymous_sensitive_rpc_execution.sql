-- CTG One / CTG Craft Beer Inversion — sensitive RPC exposure hardening
--
-- These functions are intentionally callable by signed-in users, but must not
-- be exposed to the anon role merely because PostgreSQL grants EXECUTE on new
-- functions to PUBLIC by default. Function bodies retain their existing
-- ownership / auth.uid() checks; this migration tightens the outer API surface.

revoke all on function public.accept_investment_agreement()
  from public, anon;
grant execute on function public.accept_investment_agreement()
  to authenticated, service_role;

revoke all on function public.begin_kyc_submission()
  from public, anon;
grant execute on function public.begin_kyc_submission()
  to authenticated, service_role;

revoke all on function public.register_kyc_document(uuid, text, text)
  from public, anon;
grant execute on function public.register_kyc_document(uuid, text, text)
  to authenticated, service_role;

revoke all on function public.finalize_kyc_submission(uuid)
  from public, anon;
grant execute on function public.finalize_kyc_submission(uuid)
  to authenticated, service_role;
