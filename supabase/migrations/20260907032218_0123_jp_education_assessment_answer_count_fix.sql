-- JP Valderrama Education Assessment answer-count fix
-- Replaces the nonexistent jsonb_object_length(jsonb) call with an explicit
-- count over jsonb_object_keys while preserving all access and scoring boundaries.

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
  v_answer_count integer := 0;
  v_score numeric(5,2) := 0;
  v_passed boolean := false;
  v_now timestamptz := clock_timestamp();
begin
  if p_user_id is null then raise exception 'EDUCATION_ASSESSMENT_USER_REQUIRED'; end if;
  if p_assessment_id is null then raise exception 'EDUCATION_ASSESSMENT_REQUIRED'; end if;
  if p_answers is null or jsonb_typeof(p_answers) <> 'object' then raise exception 'EDUCATION_ASSESSMENT_ANSWERS_INVALID'; end if;

  select a.id, a.course_id, a.passing_score, a.max_attempts, c.offering_id
    into v_assessment
  from public.education_assessments a
  join public.education_courses c on c.id = a.course_id
  where a.id = p_assessment_id
    and a.status = 'published'
    and c.status = 'published';
  if not found then raise exception 'EDUCATION_ASSESSMENT_UNAVAILABLE'; end if;

  if not exists (
    select 1
    from public.education_entitlements e
    where e.user_id = p_user_id
      and e.offering_id = v_assessment.offering_id
      and e.status = 'active'
      and e.starts_at <= v_now
      and (e.ends_at is null or e.ends_at > v_now)
  ) then
    raise exception 'EDUCATION_COURSE_ACCESS_REQUIRED';
  end if;

  select en.id into v_enrollment_id
  from public.education_enrollments en
  where en.user_id = p_user_id and en.course_id = v_assessment.course_id
  for update;
  if not found then raise exception 'EDUCATION_LEARNING_ENROLLMENT_REQUIRED'; end if;

  select count(*)::integer into v_attempt_number
  from public.education_assessment_attempts aa
  where aa.enrollment_id = v_enrollment_id and aa.assessment_id = p_assessment_id;
  if v_attempt_number >= v_assessment.max_attempts then raise exception 'EDUCATION_ASSESSMENT_MAX_ATTEMPTS_REACHED'; end if;
  v_attempt_number := v_attempt_number + 1;

  select count(*)::integer into v_question_count
  from public.education_assessment_questions q
  where q.assessment_id = p_assessment_id and q.status = 'published';
  if v_question_count = 0 then raise exception 'EDUCATION_ASSESSMENT_EMPTY'; end if;

  select count(*)::integer into v_answer_count
  from jsonb_object_keys(p_answers);
  if v_answer_count <> v_question_count then raise exception 'EDUCATION_ASSESSMENT_ANSWERS_INCOMPLETE'; end if;

  select coalesce(sum(q.points), 0)::integer into v_points_possible
  from public.education_assessment_questions q
  where q.assessment_id = p_assessment_id and q.status = 'published';

  insert into public.education_assessment_attempts (
    assessment_id,enrollment_id,user_id,attempt_number,status,
    points_earned,points_possible,score_percent,passed,submitted_at
  ) values (
    p_assessment_id,v_enrollment_id,p_user_id,v_attempt_number,'submitted',
    0,v_points_possible,0,false,v_now
  ) returning id into v_attempt_id;

  for v_question in
    select q.id,q.points
    from public.education_assessment_questions q
    where q.assessment_id = p_assessment_id and q.status = 'published'
    order by q.position
  loop
    v_option_text := p_answers ->> v_question.id::text;
    if v_option_text is null or v_option_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
      raise exception 'EDUCATION_ASSESSMENT_ANSWER_INVALID';
    end if;
    v_option_id := v_option_text::uuid;
    select o.is_correct into v_is_correct
    from public.education_assessment_options o
    where o.id = v_option_id and o.question_id = v_question.id;
    if not found then raise exception 'EDUCATION_ASSESSMENT_OPTION_INVALID'; end if;
    if v_is_correct then v_points_earned := v_points_earned + v_question.points; end if;
    insert into public.education_assessment_responses (
      attempt_id,question_id,option_id,is_correct,points_awarded
    ) values (
      v_attempt_id,v_question.id,v_option_id,v_is_correct,
      case when v_is_correct then v_question.points else 0 end
    );
  end loop;

  v_score := round((v_points_earned::numeric * 100) / greatest(v_points_possible,1),2);
  v_passed := v_score >= v_assessment.passing_score;
  update public.education_assessment_attempts
     set points_earned=v_points_earned,score_percent=v_score,passed=v_passed
   where id=v_attempt_id;

  return jsonb_build_object(
    'attemptId',v_attempt_id,
    'attemptNumber',v_attempt_number,
    'scorePercent',v_score,
    'passed',v_passed,
    'pointsEarned',v_points_earned,
    'pointsPossible',v_points_possible,
    'attemptsRemaining',greatest(v_assessment.max_attempts-v_attempt_number,0)
  );
end;
$function$;

revoke all on function public.submit_education_assessment_attempt(uuid,uuid,jsonb) from public, anon, authenticated;
grant execute on function public.submit_education_assessment_attempt(uuid,uuid,jsonb) to service_role;
