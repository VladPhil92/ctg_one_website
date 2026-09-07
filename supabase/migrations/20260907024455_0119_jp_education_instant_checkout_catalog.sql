-- JP Valderrama Education Instant Checkout Catalog V1
-- Productizes fixed-price Learning Center services so a customer can move
-- directly from published price to checkout. Quote workflows remain reserved
-- for genuinely custom services that do not have a published price.

insert into public.education_offerings (
  slug,
  title,
  offering_type,
  summary,
  status,
  price_amount,
  currency,
  access_path,
  metadata,
  published_at,
  updated_at
) values
(
  'tutoria-privada-1-hora',
  'Tutoría privada — 1 hora',
  'class',
  'Sesión privada de 60 minutos para refuerzo, preparación de exámenes, exposiciones o acompañamiento académico. Modalidad virtual o a domicilio según cobertura.',
  'published',
  80000,
  'COP',
  '/dashboard/educacion/servicios',
  '{"axis":"learningcenter","commerce_mode":"instant","service_family":"tutoring","duration_hours":1,"fulfillment":"scheduled_service"}'::jsonb,
  now(),
  now()
),
(
  'plan-tutorias-8-horas',
  'Plan de tutorías — 8 horas',
  'class',
  'Paquete de ocho horas de tutoría privada para acompañamiento continuo, refuerzo académico o preparación intensiva. Modalidad virtual o a domicilio según cobertura.',
  'published',
  520000,
  'COP',
  '/dashboard/educacion/servicios',
  '{"axis":"learningcenter","commerce_mode":"instant","service_family":"tutoring","duration_hours":8,"fulfillment":"scheduled_service"}'::jsonb,
  now(),
  now()
)
on conflict (slug) do update
set
  title = excluded.title,
  offering_type = excluded.offering_type,
  summary = excluded.summary,
  status = excluded.status,
  price_amount = excluded.price_amount,
  currency = excluded.currency,
  access_path = excluded.access_path,
  metadata = excluded.metadata,
  published_at = coalesce(public.education_offerings.published_at, excluded.published_at),
  updated_at = excluded.updated_at;
