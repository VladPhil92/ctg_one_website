-- JP Valderrama Education service-role privilege portability reconciliation
-- Reassert the server-only Education OS table grants under the next contiguous logical migration.
-- This preserves browser-role restrictions and restores a monotonic latest migration identity.

grant select, insert, update, delete on table
  public.education_advisory_requests,
  public.education_assessments,
  public.education_assessment_questions,
  public.education_assessment_options,
  public.education_assessment_attempts,
  public.education_assessment_responses,
  public.education_courses,
  public.education_modules,
  public.education_lessons,
  public.education_enrollments,
  public.education_lesson_progress,
  public.education_offerings,
  public.education_order_items,
  public.education_order_lifecycle_events,
  public.education_orders,
  public.education_payment_provider_events,
  public.education_payment_settlements,
  public.education_entitlements,
  public.education_service_quotes,
  public.education_sessions
  to service_role;
