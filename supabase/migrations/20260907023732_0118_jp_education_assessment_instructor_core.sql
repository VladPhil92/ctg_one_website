-- JP Valderrama Education Assessment & Instructor Core V1
-- Adds server-scored quiz assessments and authoring primitives without exposing
-- answer keys to browser roles. Instructor mutations remain behind server-side
-- admin authorization; assessment submission is service_role-only and SECURITY INVOKER.

create table public.education_assessments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.education_courses(id) on delete cascade,
  lesson_id uuid references public.education_lessons(id) on delete set null,
  slug text not null,
  title text not null,
  instructions text not null default '',
  assessment_type text not null default 'quiz',
  status text not null default 'draft',
  passing_score numeric(5,2) not null default 70,
  max_attempts integer not null default 3,
  required_for_completion boolean not null default true,
  position integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint education_assessments_slug_check check (char_length(slug) between 3 and 120 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint education_assessments_title_check check (char_length(btrim(title)) between 2 and 180),
  constraint education_assessments_instructions_check check (char_length(instructions) <= 6000),
  constraint education_assessments_type_check check (assessment_type in ('quiz')),
  constraint education_assessments_status_check check (status in ('draft', 'published', 'archived')),
  constraint education_assessments_passing_score_check check (passing_score between 0 and 100),
  constraint education_assessments_max_attempts_check check (max_attempts between 1 and 20),
  constraint education_assessments_position_check check (position between 1 and 1000),
  constraint education_assessments_course_slug_key unique (course_id, slug),
  constraint education_assessments_course_position_key unique (course_id, position)
);
create index education_assessments_course_status_idx on public.education_assessments(course_id, status, position);
create index education_assessments_lesson_idx on public.education_assessments(lesson_id) where lesson_id is not null;

create table public.education_assessment_questions (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.education_assessments(id) on delete cascade,
  prompt text not null,
  question_type text not null default 'single_choice',
  explanation text,
  points integer not null default 1,
  position integer not null,
  status text not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint education_assessment_questions_prompt_check check (char_length(btrim(prompt)) between 3 and 3000),
  constraint education_assessment_questions_type_check check (question_type in ('single_choice', 'true_false')),
  constraint education_assessment_questions_explanation_check check (explanation is null or char_length(explanation) <= 6000),
  constraint education_assessment_questions_points_check check (points between 1 and 1000),
  constraint education_assessment_questions_position_check check (position between 1 and 1000),
  constraint education_assessment_questions_status_check check (status in ('draft', 'published', 'archived')),
  constraint education_assessment_questions_assessment_position_key unique (assessment_id, position)
);
create index education_assessment_questions_assessment_status_idx on public.education_assessment_questions(assessment_id, status, position);

create table public.education_assessment_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.education_assessment_questions(id) on delete cascade,
  label text not null,
  option_text text not null,
  is_correct boolean not null default false,
  position integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint education_assessment_options_label_check check (char_length(btrim(label)) between 1 and 12),
  constraint education_assessment_options_text_check check (char_length(btrim(option_text)) between 1 and 3000),
  constraint education_assessment_options_position_check check (position between 1 and 100),
  constraint education_assessment_options_question_position_key unique (question_id, position)
);
create index education_assessment_options_question_idx on public.education_assessment_options(question_id, position);
create unique index education_assessment_options_one_correct_idx on public.education_assessment_options(question_id) where is_correct;

create table public.education_assessment_attempts (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.education_assessments(id) on delete restrict,
  enrollment_id uuid not null references public.education_enrollments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  attempt_number integer not null,
  status text not null default 'submitted',
  points_earned integer not null default 0,
  points_possible integer not null default 0,
  score_percent numeric(5,2) not null default 0,
  passed boolean not null default false,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint education_assessment_attempts_number_check check (attempt_number between 1 and 1000),
  constraint education_assessment_attempts_status_check check (status in ('submitted')),
  constraint education_assessment_attempts_points_check check (points_earned >= 0 and points_possible >= 0 and points_earned <= points_possible),
  constraint education_assessment_attempts_score_check check (score_percent between 0 and 100),
  constraint education_assessment_attempts_enrollment_assessment_number_key unique (enrollment_id, assessment_id, attempt_number)
);
create index education_assessment_attempts_user_idx on public.education_assessment_attempts(user_id, submitted_at desc);
create index education_assessment_attempts_enrollment_idx on public.education_assessment_attempts(enrollment_id, assessment_id, attempt_number desc);

create table public.education_assessment_responses (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.education_assessment_attempts(id) on delete cascade,
  question_id uuid not null references public.education_assessment_questions(id) on delete restrict,
  option_id uuid not null references public.education_assessment_options(id) on delete restrict,
  is_correct boolean not null,
  points_awarded integer not null default 0,
  created_at timestamptz not null default now(),
  constraint education_assessment_responses_points_check check (points_awarded >= 0),
  constraint education_assessment_responses_attempt_question_key unique (attempt_id, question_id)
);
create index education_assessment_responses_attempt_idx on public.education_assessment_responses(attempt_id);

alter table public.education_assessments enable row level security;
alter table public.education_assessment_questions enable row level security;
alter table public.education_assessment_options enable row level security;
alter table public.education_assessment_attempts enable row level security;
alter table public.education_assessment_responses enable row level security;
revoke all on table public.education_assessments from public, anon, authenticated;
revoke all on table public.education_assessment_questions from public, anon, authenticated;
revoke all on table public.education_assessment_options from public, anon, authenticated;
revoke all on table public.education_assessment_attempts from public, anon, authenticated;
revoke all on table public.education_assessment_responses from public, anon, authenticated;
grant all on table public.education_assessments to service_role;
grant all on table public.education_assessment_questions to service_role;
grant all on table public.education_assessment_options to service_role;
grant all on table public.education_assessment_attempts to service_role;
grant all on table public.education_assessment_responses to service_role;

create or replace function public.submit_education_assessment_attempt(p_user_id uuid, p_assessment_id uuid, p_answers jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $function$
declare
  v_assessment record;
  v_enrollment_id uuid;
  v_attempt_id uuid;
  v_attempt_number integer;
  v_question record;
  v_option_id uuid;
  v_option_text text;
  v_is_correct boolean;
  v_points_possible integer := 0;
  v_points_earned integer := 0;
  v_question_count integer := 0;
  v_score numeric(5,2) := 0;
  v_passed boolean := false;
  v_now timestamptz := clock_timestamp();
begin
  if p_user_id is null then raise exception 'EDUCATION_ASSESSMENT_USER_REQUIRED'; end if;
  if p_assessment_id is null then raise exception 'EDUCATION_ASSESSMENT_REQUIRED'; end if;
  if p_answers is null or jsonb_typeof(p_answers) <> 'object' then raise exception 'EDUCATION_ASSESSMENT_ANSWERS_INVALID'; end if;
  select a.id, a.course_id, a.passing_score, a.max_attempts, c.offering_id into v_assessment
  from public.education_assessments a join public.education_courses c on c.id = a.course_id
  where a.id = p_assessment_id and a.status = 'published' and c.status = 'published';
  if not found then raise exception 'EDUCATION_ASSESSMENT_UNAVAILABLE'; end if;
  if not exists (select 1 from public.education_entitlements e where e.user_id = p_user_id and e.offering_id = v_assessment.offering_id and e.status = 'active' and e.starts_at <= now() and (e.ends_at is null or e.ends_at > now())) then raise exception 'EDUCATION_COURSE_ACCESS_REQUIRED'; end if;
  select en.id into v_enrollment_id from public.education_enrollments en where en.user_id = p_user_id and en.course_id = v_assessment.course_id for update;
  if not found then raise exception 'EDUCATION_LEARNING_ENROLLMENT_REQUIRED'; end if;
  select count(*)::integer into v_attempt_number from public.education_assessment_attempts aa where aa.enrollment_id = v_enrollment_id and aa.assessment_id = p_assessment_id;
  if v_attempt_number >= v_assessment.max_attempts then raise exception 'EDUCATION_ASSESSMENT_MAX_ATTEMPTS_REACHED'; end if;
  v_attempt_number := v_attempt_number + 1;
  select count(*)::integer into v_question_count from public.education_assessment_questions q where q.assessment_id = p_assessment_id and q.status = 'published';
  if v_question_count = 0 then raise exception 'EDUCATION_ASSESSMENT_EMPTY'; end if;
  if jsonb_object_length(p_answers) <> v_question_count then raise exception 'EDUCATION_ASSESSMENT_ANSWERS_INCOMPLETE'; end if;
  select coalesce(sum(q.points), 0)::integer into v_points_possible from public.education_assessment_questions q where q.assessment_id = p_assessment_id and q.status = 'published';
  insert into public.education_assessment_attempts (assessment_id,enrollment_id,user_id,attempt_number,status,points_earned,points_possible,score_percent,passed,submitted_at)
  values (p_assessment_id,v_enrollment_id,p_user_id,v_attempt_number,'submitted',0,v_points_possible,0,false,v_now) returning id into v_attempt_id;
  for v_question in select q.id,q.points from public.education_assessment_questions q where q.assessment_id = p_assessment_id and q.status = 'published' order by q.position loop
    v_option_text := p_answers ->> v_question.id::text;
    if v_option_text is null or v_option_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then raise exception 'EDUCATION_ASSESSMENT_ANSWER_INVALID'; end if;
    v_option_id := v_option_text::uuid;
    select o.is_correct into v_is_correct from public.education_assessment_options o where o.id = v_option_id and o.question_id = v_question.id;
    if not found then raise exception 'EDUCATION_ASSESSMENT_OPTION_INVALID'; end if;
    if v_is_correct then v_points_earned := v_points_earned + v_question.points; end if;
    insert into public.education_assessment_responses (attempt_id,question_id,option_id,is_correct,points_awarded) values (v_attempt_id,v_question.id,v_option_id,v_is_correct,case when v_is_correct then v_question.points else 0 end);
  end loop;
  v_score := round((v_points_earned::numeric * 100) / greatest(v_points_possible,1),2);
  v_passed := v_score >= v_assessment.passing_score;
  update public.education_assessment_attempts set points_earned=v_points_earned,score_percent=v_score,passed=v_passed where id=v_attempt_id;
  return jsonb_build_object('attemptId',v_attempt_id,'attemptNumber',v_attempt_number,'scorePercent',v_score,'passed',v_passed,'pointsEarned',v_points_earned,'pointsPossible',v_points_possible,'attemptsRemaining',greatest(v_assessment.max_attempts-v_attempt_number,0));
end;
$function$;
revoke all on function public.submit_education_assessment_attempt(uuid,uuid,jsonb) from public, anon, authenticated;
grant execute on function public.submit_education_assessment_attempt(uuid,uuid,jsonb) to service_role;

insert into public.education_assessments (course_id,slug,title,instructions,assessment_type,status,passing_score,max_attempts,required_for_completion,position)
select c.id,'evaluacion-final-criterio-y-valor','Evaluación final: criterio y valor','Responde cinco preguntas de selección única. Necesitas 70% para aprobar. Las respuestas se califican en el servidor y puedes realizar hasta tres intentos.','quiz','published',70,3,true,1 from public.education_courses c where c.slug='filosofia-tecnologia-y-valor'
on conflict (course_id,slug) do nothing;
insert into public.education_assessment_questions (assessment_id,prompt,question_type,explanation,points,position,status)
select a.id,v.prompt,'single_choice',v.explanation,1,v.position,'published' from public.education_assessments a cross join (values
(1,'¿Cuál es el primer movimiento recomendado antes de responder a un problema complejo?','Separar la pregunta de la respuesta inmediata permite identificar supuestos y ordenar el problema.'),
(2,'En el curso, ¿qué significa comprender una tecnología como sistema?','Implica examinar actores, reglas, incentivos, infraestructura y consecuencias, no solo el artefacto.'),
(3,'¿Por qué una decisión tecnológica puede tener costos que no aparecen en su precio?','Porque existen costos sociales, ambientales, cognitivos e institucionales que el precio de mercado puede no capturar.'),
(4,'¿Qué afirmación describe mejor el concepto de valor trabajado en el curso?','El valor depende de criterios, fines y contextos; no se reduce automáticamente al precio.'),
(5,'¿Qué caracteriza una decisión con criterio?','Hace explícitos fines, evidencia, alternativas y consecuencias antes de elegir.')) as v(position,prompt,explanation)
where a.slug='evaluacion-final-criterio-y-valor' and exists(select 1 from public.education_courses c where c.id=a.course_id and c.slug='filosofia-tecnologia-y-valor') on conflict (assessment_id,position) do nothing;
insert into public.education_assessment_options (question_id,label,option_text,is_correct,position)
select q.id,v.label,v.option_text,v.is_correct,v.option_position from public.education_assessment_questions q join public.education_assessments a on a.id=q.assessment_id cross join (values
(1,'A','Elegir la respuesta más popular.',false,1),(1,'B','Identificar la pregunta, sus supuestos y el problema que realmente debe resolverse.',true,2),(1,'C','Buscar primero una herramienta tecnológica.',false,3),
(2,'A','Analizar únicamente sus especificaciones técnicas.',false,1),(2,'B','Estudiar actores, reglas, incentivos, infraestructura y consecuencias.',true,2),(2,'C','Suponer que la tecnología es neutral por definición.',false,3),
(3,'A','Porque todo costo debe aparecer en una factura.',false,1),(3,'B','Porque puede producir efectos sociales, ambientales, cognitivos o institucionales no reflejados en el precio.',true,2),(3,'C','Porque el precio siempre es incorrecto.',false,3),
(4,'A','Valor y precio son siempre equivalentes.',false,1),(4,'B','El valor depende de criterios, fines y contextos y puede exceder el precio.',true,2),(4,'C','El valor es completamente subjetivo y no admite razones.',false,3),
(5,'A','Decidir rápido para evitar incertidumbre.',false,1),(5,'B','Hacer explícitos fines, evidencia, alternativas y consecuencias antes de elegir.',true,2),(5,'C','Delegar la decisión a la herramienta más eficiente.',false,3)) as v(question_position,label,option_text,is_correct,option_position)
where a.slug='evaluacion-final-criterio-y-valor' and q.position=v.question_position on conflict (question_id,position) do nothing;
