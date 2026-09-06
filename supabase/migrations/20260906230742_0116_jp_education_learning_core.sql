-- JP Valderrama Education Learning Core V1
--
-- Adds the pedagogical core behind the existing education commerce layer.
-- education_entitlements remains the canonical authorization source: course
-- enrollment and lesson progress never grant access on their own.

create table public.education_courses (
  id uuid primary key default gen_random_uuid(),
  offering_id uuid not null unique references public.education_offerings(id) on delete cascade,
  slug text not null unique,
  title text not null,
  summary text not null,
  status text not null default 'draft',
  estimated_minutes integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint education_courses_slug_check
    check (char_length(slug) between 3 and 100 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint education_courses_title_check check (char_length(btrim(title)) between 2 and 180),
  constraint education_courses_summary_check check (char_length(btrim(summary)) between 10 and 1200),
  constraint education_courses_status_check check (status in ('draft', 'published', 'archived')),
  constraint education_courses_estimated_minutes_check check (estimated_minutes between 1 and 100000)
);

create index education_courses_status_idx on public.education_courses(status, created_at desc);

create table public.education_modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.education_courses(id) on delete cascade,
  slug text not null,
  title text not null,
  summary text not null,
  position integer not null,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint education_modules_slug_check
    check (char_length(slug) between 3 and 100 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint education_modules_title_check check (char_length(btrim(title)) between 2 and 180),
  constraint education_modules_summary_check check (char_length(btrim(summary)) between 10 and 1200),
  constraint education_modules_position_check check (position between 1 and 1000),
  constraint education_modules_status_check check (status in ('draft', 'published', 'archived')),
  constraint education_modules_course_slug_key unique (course_id, slug),
  constraint education_modules_course_position_key unique (course_id, position)
);

create index education_modules_course_status_position_idx
  on public.education_modules(course_id, status, position);

create table public.education_lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.education_modules(id) on delete cascade,
  slug text not null unique,
  title text not null,
  summary text not null,
  lesson_type text not null default 'text',
  body text not null default '',
  media_url text,
  duration_minutes integer not null default 1,
  position integer not null,
  is_preview boolean not null default false,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint education_lessons_slug_check
    check (char_length(slug) between 3 and 120 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint education_lessons_title_check check (char_length(btrim(title)) between 2 and 180),
  constraint education_lessons_summary_check check (char_length(btrim(summary)) between 10 and 1200),
  constraint education_lessons_type_check check (lesson_type in ('text', 'video', 'audio', 'resource')),
  constraint education_lessons_body_check check (char_length(body) <= 100000),
  constraint education_lessons_media_url_check
    check (media_url is null or ((media_url like '/%' or media_url like 'https://%') and char_length(media_url) <= 2000)),
  constraint education_lessons_duration_check check (duration_minutes between 1 and 10000),
  constraint education_lessons_position_check check (position between 1 and 1000),
  constraint education_lessons_status_check check (status in ('draft', 'published', 'archived')),
  constraint education_lessons_module_position_key unique (module_id, position)
);

create index education_lessons_module_status_position_idx
  on public.education_lessons(module_id, status, position);

create table public.education_enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.education_courses(id) on delete cascade,
  entitlement_id uuid references public.education_entitlements(id) on delete set null,
  status text not null default 'active',
  enrolled_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint education_enrollments_status_check check (status in ('active', 'completed', 'revoked')),
  constraint education_enrollments_completion_check
    check ((status = 'completed' and completed_at is not null) or status <> 'completed'),
  constraint education_enrollments_user_course_key unique (user_id, course_id)
);

create index education_enrollments_user_status_idx
  on public.education_enrollments(user_id, status, updated_at desc);
create index education_enrollments_course_idx on public.education_enrollments(course_id);
create index education_enrollments_entitlement_idx
  on public.education_enrollments(entitlement_id) where entitlement_id is not null;

create table public.education_lesson_progress (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.education_enrollments(id) on delete cascade,
  lesson_id uuid not null references public.education_lessons(id) on delete cascade,
  status text not null default 'not_started',
  progress_percent integer not null default 0,
  last_position_seconds integer not null default 0,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint education_lesson_progress_status_check check (status in ('not_started', 'in_progress', 'completed')),
  constraint education_lesson_progress_percent_check check (progress_percent between 0 and 100),
  constraint education_lesson_progress_position_check check (last_position_seconds >= 0),
  constraint education_lesson_progress_started_check
    check ((status = 'not_started' and started_at is null) or status <> 'not_started'),
  constraint education_lesson_progress_completed_check
    check ((status = 'completed' and progress_percent = 100 and completed_at is not null) or status <> 'completed'),
  constraint education_lesson_progress_enrollment_lesson_key unique (enrollment_id, lesson_id)
);

create index education_lesson_progress_enrollment_status_idx
  on public.education_lesson_progress(enrollment_id, status, updated_at desc);
create index education_lesson_progress_lesson_idx on public.education_lesson_progress(lesson_id);

alter table public.education_courses enable row level security;
alter table public.education_modules enable row level security;
alter table public.education_lessons enable row level security;
alter table public.education_enrollments enable row level security;
alter table public.education_lesson_progress enable row level security;

revoke all on table public.education_courses from public, anon, authenticated;
revoke all on table public.education_modules from public, anon, authenticated;
revoke all on table public.education_lessons from public, anon, authenticated;
revoke all on table public.education_enrollments from public, anon, authenticated;
revoke all on table public.education_lesson_progress from public, anon, authenticated;

grant select on table public.education_courses to authenticated;
grant select on table public.education_modules to authenticated;
grant select on table public.education_lessons to authenticated;
grant select on table public.education_enrollments to authenticated;
grant select on table public.education_lesson_progress to authenticated;

create policy education_courses_entitled_read
  on public.education_courses for select to authenticated
  using (
    status = 'published'
    and exists (
      select 1 from public.education_entitlements e
      where e.offering_id = education_courses.offering_id
        and e.user_id = (select auth.uid())
        and e.status = 'active'
        and e.starts_at <= now()
        and (e.ends_at is null or e.ends_at > now())
    )
  );

create policy education_modules_entitled_read
  on public.education_modules for select to authenticated
  using (
    status = 'published'
    and exists (
      select 1
      from public.education_courses c
      join public.education_entitlements e on e.offering_id = c.offering_id
      where c.id = education_modules.course_id
        and c.status = 'published'
        and e.user_id = (select auth.uid())
        and e.status = 'active'
        and e.starts_at <= now()
        and (e.ends_at is null or e.ends_at > now())
    )
  );

create policy education_lessons_entitled_read
  on public.education_lessons for select to authenticated
  using (
    status = 'published'
    and exists (
      select 1
      from public.education_modules m
      join public.education_courses c on c.id = m.course_id
      join public.education_entitlements e on e.offering_id = c.offering_id
      where m.id = education_lessons.module_id
        and m.status = 'published'
        and c.status = 'published'
        and e.user_id = (select auth.uid())
        and e.status = 'active'
        and e.starts_at <= now()
        and (e.ends_at is null or e.ends_at > now())
    )
  );

create policy education_enrollments_owner_read
  on public.education_enrollments for select to authenticated
  using (user_id = (select auth.uid()));

create policy education_lesson_progress_owner_read
  on public.education_lesson_progress for select to authenticated
  using (
    exists (
      select 1 from public.education_enrollments en
      where en.id = education_lesson_progress.enrollment_id
        and en.user_id = (select auth.uid())
    )
  );

create or replace function public.claim_free_education_course(p_user_id uuid, p_course_slug text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_slug text := lower(btrim(p_course_slug));
  v_course_id uuid;
  v_offering_id uuid;
  v_entitlement_id uuid;
  v_enrollment_id uuid;
  v_first_lesson_slug text;
  v_price integer;
  v_now timestamptz := clock_timestamp();
begin
  if p_user_id is null then raise exception 'EDUCATION_LEARNING_USER_REQUIRED'; end if;
  if v_slug is null or char_length(v_slug) < 3 or char_length(v_slug) > 100
     or v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'EDUCATION_LEARNING_COURSE_SLUG_INVALID';
  end if;
  if not exists (select 1 from public.profiles p where p.id = p_user_id) then
    raise exception 'EDUCATION_LEARNING_USER_NOT_FOUND';
  end if;

  select c.id, c.offering_id, o.price_amount
  into v_course_id, v_offering_id, v_price
  from public.education_courses c
  join public.education_offerings o on o.id = c.offering_id
  where c.slug = v_slug
    and c.status = 'published'
    and o.status = 'published'
    and o.offering_type = 'course'
  for share of c, o;

  if not found then raise exception 'EDUCATION_LEARNING_COURSE_UNAVAILABLE'; end if;
  if v_price is null or v_price <> 0 then raise exception 'EDUCATION_LEARNING_FREE_CLAIM_FORBIDDEN'; end if;

  select e.id into v_entitlement_id
  from public.education_entitlements e
  where e.user_id = p_user_id and e.offering_id = v_offering_id
  for update;

  if not found then
    insert into public.education_entitlements (
      user_id, offering_id, source_type, source_reference, status,
      starts_at, granted_at, revoked_at, updated_at
    ) values (
      p_user_id, v_offering_id, 'complimentary', 'free-course:' || v_course_id::text,
      'active', v_now, v_now, null, v_now
    ) returning id into v_entitlement_id;
  else
    update public.education_entitlements
    set status = 'active',
        source_type = case when source_type = 'purchase' then source_type else 'complimentary' end,
        source_reference = case when source_type = 'purchase' then source_reference else 'free-course:' || v_course_id::text end,
        starts_at = least(starts_at, v_now),
        ends_at = null,
        revoked_at = null,
        updated_at = v_now
    where id = v_entitlement_id;
  end if;

  insert into public.education_enrollments (
    user_id, course_id, entitlement_id, status, enrolled_at, completed_at, updated_at
  ) values (p_user_id, v_course_id, v_entitlement_id, 'active', v_now, null, v_now)
  on conflict (user_id, course_id) do update
  set entitlement_id = excluded.entitlement_id,
      status = case when public.education_enrollments.status = 'completed' then 'completed' else 'active' end,
      completed_at = case when public.education_enrollments.status = 'completed' then public.education_enrollments.completed_at else null end,
      updated_at = excluded.updated_at
  returning id into v_enrollment_id;

  select l.slug into v_first_lesson_slug
  from public.education_modules m
  join public.education_lessons l on l.module_id = m.id
  where m.course_id = v_course_id and m.status = 'published' and l.status = 'published'
  order by m.position, l.position
  limit 1;

  return jsonb_build_object(
    'courseSlug', v_slug,
    'enrollmentId', v_enrollment_id,
    'entitlementId', v_entitlement_id,
    'accessPath', case when v_first_lesson_slug is null
      then '/learn/' || v_slug else '/learn/' || v_slug || '/' || v_first_lesson_slug end
  );
end;
$function$;

create or replace function public.ensure_education_course_enrollment(p_user_id uuid, p_course_slug text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_slug text := lower(btrim(p_course_slug));
  v_course_id uuid;
  v_offering_id uuid;
  v_entitlement_id uuid;
  v_enrollment_id uuid;
  v_status text;
  v_now timestamptz := clock_timestamp();
begin
  if p_user_id is null then raise exception 'EDUCATION_LEARNING_USER_REQUIRED'; end if;
  if v_slug is null or char_length(v_slug) < 3 or char_length(v_slug) > 100
     or v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'EDUCATION_LEARNING_COURSE_SLUG_INVALID';
  end if;

  select c.id, c.offering_id into v_course_id, v_offering_id
  from public.education_courses c
  where c.slug = v_slug and c.status = 'published';
  if not found then raise exception 'EDUCATION_LEARNING_COURSE_UNAVAILABLE'; end if;

  select e.id into v_entitlement_id
  from public.education_entitlements e
  where e.user_id = p_user_id
    and e.offering_id = v_offering_id
    and e.status = 'active'
    and e.starts_at <= now()
    and (e.ends_at is null or e.ends_at > now())
  order by e.granted_at desc limit 1;
  if not found then raise exception 'EDUCATION_COURSE_ACCESS_REQUIRED'; end if;

  insert into public.education_enrollments (
    user_id, course_id, entitlement_id, status, enrolled_at, completed_at, updated_at
  ) values (p_user_id, v_course_id, v_entitlement_id, 'active', v_now, null, v_now)
  on conflict (user_id, course_id) do update
  set entitlement_id = excluded.entitlement_id,
      status = case when public.education_enrollments.status = 'completed' then 'completed' else 'active' end,
      completed_at = case when public.education_enrollments.status = 'completed' then public.education_enrollments.completed_at else null end,
      updated_at = excluded.updated_at
  returning id, status into v_enrollment_id, v_status;

  return jsonb_build_object(
    'courseId', v_course_id,
    'courseSlug', v_slug,
    'enrollmentId', v_enrollment_id,
    'status', v_status
  );
end;
$function$;

create or replace function public.record_education_lesson_progress(
  p_user_id uuid,
  p_lesson_id uuid,
  p_progress_percent integer,
  p_last_position_seconds integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_course_id uuid;
  v_offering_id uuid;
  v_enrollment_id uuid;
  v_effective_percent integer;
  v_status text;
  v_total_lessons integer;
  v_completed_lessons integer;
  v_course_progress integer;
  v_now timestamptz := clock_timestamp();
begin
  if p_user_id is null then raise exception 'EDUCATION_LEARNING_USER_REQUIRED'; end if;
  if p_lesson_id is null then raise exception 'EDUCATION_LEARNING_LESSON_REQUIRED'; end if;
  if p_progress_percent is null or p_progress_percent < 0 or p_progress_percent > 100 then
    raise exception 'EDUCATION_LEARNING_PROGRESS_INVALID';
  end if;
  if p_last_position_seconds is null or p_last_position_seconds < 0 or p_last_position_seconds > 864000 then
    raise exception 'EDUCATION_LEARNING_POSITION_INVALID';
  end if;

  select c.id, c.offering_id into v_course_id, v_offering_id
  from public.education_lessons l
  join public.education_modules m on m.id = l.module_id
  join public.education_courses c on c.id = m.course_id
  where l.id = p_lesson_id
    and l.status = 'published'
    and m.status = 'published'
    and c.status = 'published';
  if not found then raise exception 'EDUCATION_LEARNING_LESSON_UNAVAILABLE'; end if;

  if not exists (
    select 1 from public.education_entitlements e
    where e.user_id = p_user_id
      and e.offering_id = v_offering_id
      and e.status = 'active'
      and e.starts_at <= now()
      and (e.ends_at is null or e.ends_at > now())
  ) then raise exception 'EDUCATION_COURSE_ACCESS_REQUIRED'; end if;

  select en.id into v_enrollment_id
  from public.education_enrollments en
  where en.user_id = p_user_id and en.course_id = v_course_id
  for update;
  if not found then raise exception 'EDUCATION_LEARNING_ENROLLMENT_REQUIRED'; end if;

  select greatest(p_progress_percent, coalesce(lp.progress_percent, 0)) into v_effective_percent
  from (select 1) seed
  left join public.education_lesson_progress lp
    on lp.enrollment_id = v_enrollment_id and lp.lesson_id = p_lesson_id;

  v_status := case
    when v_effective_percent >= 100 then 'completed'
    when v_effective_percent > 0 then 'in_progress'
    else 'not_started'
  end;

  insert into public.education_lesson_progress (
    enrollment_id, lesson_id, status, progress_percent, last_position_seconds,
    started_at, completed_at, updated_at
  ) values (
    v_enrollment_id, p_lesson_id, v_status, v_effective_percent, p_last_position_seconds,
    case when v_effective_percent > 0 then v_now else null end,
    case when v_effective_percent >= 100 then v_now else null end,
    v_now
  )
  on conflict (enrollment_id, lesson_id) do update
  set status = excluded.status,
      progress_percent = greatest(public.education_lesson_progress.progress_percent, excluded.progress_percent),
      last_position_seconds = greatest(public.education_lesson_progress.last_position_seconds, excluded.last_position_seconds),
      started_at = coalesce(public.education_lesson_progress.started_at, excluded.started_at),
      completed_at = coalesce(public.education_lesson_progress.completed_at, excluded.completed_at),
      updated_at = excluded.updated_at;

  select count(*)::integer into v_total_lessons
  from public.education_modules m
  join public.education_lessons l on l.module_id = m.id
  where m.course_id = v_course_id and m.status = 'published' and l.status = 'published';

  select count(*)::integer into v_completed_lessons
  from public.education_modules m
  join public.education_lessons l on l.module_id = m.id
  join public.education_lesson_progress lp
    on lp.lesson_id = l.id and lp.enrollment_id = v_enrollment_id
  where m.course_id = v_course_id
    and m.status = 'published'
    and l.status = 'published'
    and lp.status = 'completed';

  select coalesce(floor(avg(coalesce(lp.progress_percent, 0)))::integer, 0) into v_course_progress
  from public.education_modules m
  join public.education_lessons l on l.module_id = m.id
  left join public.education_lesson_progress lp
    on lp.lesson_id = l.id and lp.enrollment_id = v_enrollment_id
  where m.course_id = v_course_id and m.status = 'published' and l.status = 'published';

  if v_total_lessons > 0 and v_completed_lessons = v_total_lessons then
    update public.education_enrollments
    set status = 'completed', completed_at = coalesce(completed_at, v_now), updated_at = v_now
    where id = v_enrollment_id;
  else
    update public.education_enrollments
    set status = 'active', completed_at = null, updated_at = v_now
    where id = v_enrollment_id and status <> 'completed';
  end if;

  return jsonb_build_object(
    'enrollmentId', v_enrollment_id,
    'lessonId', p_lesson_id,
    'lessonStatus', v_status,
    'progressPercent', v_effective_percent,
    'courseProgressPercent', v_course_progress,
    'completedLessons', v_completed_lessons,
    'totalLessons', v_total_lessons
  );
end;
$function$;

revoke all on function public.claim_free_education_course(uuid, text) from public, anon, authenticated;
revoke all on function public.ensure_education_course_enrollment(uuid, text) from public, anon, authenticated;
revoke all on function public.record_education_lesson_progress(uuid, uuid, integer, integer) from public, anon, authenticated;
grant execute on function public.claim_free_education_course(uuid, text) to service_role;
grant execute on function public.ensure_education_course_enrollment(uuid, text) to service_role;
grant execute on function public.record_education_lesson_progress(uuid, uuid, integer, integer) to service_role;

insert into public.education_offerings (
  slug, title, offering_type, summary, status, price_amount, currency,
  access_path, metadata, published_at
) values (
  'filosofia-tecnologia-y-valor',
  'Filosofía, tecnología y valor',
  'course',
  'Curso introductorio de JP Valderrama para desarrollar criterios de análisis sobre tecnología, sistemas, valor y decisión humana.',
  'published',
  0,
  'COP',
  '/learn/filosofia-tecnologia-y-valor',
  '{"learning_core":"v1","format":"self_paced","pilot":true}'::jsonb,
  now()
)
on conflict (slug) do nothing;

insert into public.education_courses (offering_id, slug, title, summary, status, estimated_minutes)
select
  o.id,
  'filosofia-tecnologia-y-valor',
  'Filosofía, tecnología y valor',
  'Un recorrido breve para pensar la tecnología como sistema humano, reconocer distintos sentidos de valor y fortalecer el criterio antes de decidir.',
  'published',
  75
from public.education_offerings o
where o.slug = 'filosofia-tecnologia-y-valor'
on conflict (slug) do nothing;

insert into public.education_modules (course_id, slug, title, summary, position, status)
select c.id, x.slug, x.title, x.summary, x.position, 'published'
from public.education_courses c
cross join (values
  ('marcos-de-pensamiento', 'Marcos de pensamiento', 'Herramientas para formular preguntas, distinguir supuestos y organizar un problema antes de responder.', 1),
  ('tecnologia-y-sistemas', 'Tecnología y sistemas', 'Lectura de la tecnología como una red de decisiones, incentivos, infraestructuras y consecuencias.', 2),
  ('valor-y-decision', 'Valor y decisión', 'Criterios para distinguir precio, utilidad, significado y responsabilidad al tomar decisiones.', 3)
) as x(slug, title, summary, position)
where c.slug = 'filosofia-tecnologia-y-valor'
on conflict (course_id, slug) do nothing;

insert into public.education_lessons (
  module_id, slug, title, summary, lesson_type, body, duration_minutes, position, status
)
select m.id, x.slug, x.title, x.summary, 'text', x.body, x.duration, x.position, 'published'
from public.education_modules m
join public.education_courses c on c.id = m.course_id
join (values
  ('marcos-de-pensamiento', 'pensar-antes-de-responder', 'Pensar antes de responder', 'Una introducción a la diferencia entre reacción, opinión y análisis.', 'Pensar no consiste únicamente en producir una respuesta rápida. Consiste en reconocer qué problema tenemos delante y qué estamos suponiendo al describirlo.\n\nUna opinión puede ser valiosa, pero no equivale todavía a un argumento. El análisis comienza cuando identificamos conceptos, relaciones y razones que otras personas puedan examinar.\n\nAntes de responder una pregunta compleja, formule una versión más precisa de esa pregunta. Ese pequeño desplazamiento suele revelar qué información falta y qué criterios serán necesarios para decidir.', 10, 1),
  ('marcos-de-pensamiento', 'preguntas-que-organizan', 'Preguntas que organizan', 'Cómo convertir una inquietud amplia en un problema que pueda ser investigado.', 'Las buenas preguntas reducen ambigüedad sin empobrecer el problema. Preguntar quién decide, con qué información, para quién y bajo qué restricciones permite ordenar fenómenos que inicialmente parecen caóticos.\n\nUna segunda familia de preguntas examina los supuestos: ¿qué tendría que ser cierto para que esta afirmación funcionara? ¿Qué evidencia la refutaría?\n\nEl objetivo no es preguntar indefinidamente, sino construir una estructura que permita comparar alternativas con criterios explícitos.', 10, 2),
  ('tecnologia-y-sistemas', 'tecnologia-como-sistema', 'Tecnología como sistema', 'Más allá del dispositivo: actores, reglas, datos e infraestructura.', 'Una tecnología no es solamente un objeto. Una aplicación, una plataforma educativa o una red de pagos existe dentro de un sistema de personas, reglas, datos, infraestructura y expectativas.\n\nCuando evaluamos únicamente la interfaz, podemos perder de vista quién controla las decisiones, qué incentivos produce el sistema y qué ocurre cuando falla.\n\nAnalizar tecnología como sistema obliga a considerar simultáneamente experiencia de usuario, arquitectura, gobernanza y consecuencias sociales.', 15, 1),
  ('tecnologia-y-sistemas', 'costos-y-consecuencias', 'Costos y consecuencias', 'Identificar beneficios, externalidades y riesgos antes de adoptar una solución.', 'Toda solución tecnológica redistribuye costos y beneficios. Algunas consecuencias son visibles de inmediato; otras aparecen cuando una herramienta alcanza escala.\n\nConviene distinguir el costo de construir, el costo de operar, el costo de cambiar y el costo que soportan terceros. La solución más barata en un indicador puede ser más costosa para el sistema completo.\n\nUna decisión responsable incorpora esas consecuencias al análisis antes de declarar que una tecnología es conveniente.', 15, 2),
  ('valor-y-decision', 'que-es-valor', '¿Qué es valor?', 'Precio, utilidad, significado y valor social no son la misma cosa.', 'El precio expresa una relación de intercambio, pero no agota el significado de valor. Una actividad puede tener poco precio de mercado y alto valor educativo, cultural o comunitario.\n\nLa utilidad tampoco resuelve por sí sola la cuestión. Algo útil para un actor puede generar pérdidas para otro. Por eso conviene indicar siempre desde qué perspectiva se está valorando.\n\nDistinguir estas dimensiones evita reducir decisiones complejas a una única cifra.', 12, 1),
  ('valor-y-decision', 'decision-y-criterio', 'Decisión y criterio', 'Cerrar el análisis: elegir, justificar y revisar una decisión.', 'Decidir exige cerrar provisionalmente una investigación. No significa alcanzar certeza absoluta, sino elegir con razones suficientes y hacer explícitos los riesgos aceptados.\n\nUn criterio útil debe permitir comparar alternativas de manera consistente. También debe poder revisarse cuando aparece nueva evidencia.\n\nLa calidad de una decisión aumenta cuando podemos explicar qué valor intentábamos proteger, qué información utilizamos y qué señal nos haría cambiar de rumbo.', 13, 2)
) as x(module_slug, slug, title, summary, body, duration, position)
  on x.module_slug = m.slug
where c.slug = 'filosofia-tecnologia-y-valor'
on conflict (slug) do nothing;

comment on table public.education_courses is
  'Learning-core course records linked one-to-one to education_offerings; entitlements remain the authorization source.';
comment on table public.education_modules is 'Ordered learning modules for a course.';
comment on table public.education_lessons is 'Ordered learning units rendered by the CTG One education player.';
comment on table public.education_enrollments is
  'User learning enrollment derived from an effective education entitlement; enrollment alone never grants access.';
comment on table public.education_lesson_progress is 'Server-managed per-lesson progress for an enrollment.';
comment on function public.claim_free_education_course(uuid, text) is
  'Service-role-only free-course claim. Grants a complimentary entitlement only when the published course price is exactly zero.';
comment on function public.ensure_education_course_enrollment(uuid, text) is
  'Service-role-only enrollment boundary that requires an effective canonical education entitlement.';
comment on function public.record_education_lesson_progress(uuid, uuid, integer, integer) is
  'Service-role-only monotonic lesson progress boundary requiring both enrollment and effective entitlement.';
