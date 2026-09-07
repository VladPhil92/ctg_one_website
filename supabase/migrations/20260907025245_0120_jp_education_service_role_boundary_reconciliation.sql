-- JP Valderrama Education service-role boundary reconciliation
--
-- The Assessment Core scoring RPC is SECURITY INVOKER and Instructor Studio
-- performs server-only table operations after canonical admin authorization.
-- These explicit grants make clean databases reproduce the production service
-- boundary without widening browser privileges.

grant all on table public.education_offerings to service_role;
grant all on table public.education_courses to service_role;
grant all on table public.education_modules to service_role;
grant all on table public.education_lessons to service_role;
grant select, update on table public.education_enrollments to service_role;
grant select on table public.education_entitlements to service_role;
