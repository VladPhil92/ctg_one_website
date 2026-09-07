\set ON_ERROR_STOP on

-- Education Assessment Golden Journey
-- Runs only against the disposable local CI database and rolls back all learner data.
-- Proves: free-course entitlement -> enrollment -> server-side scoring -> persisted
-- evidence -> attempt cap, while browser roles cannot read answer keys or call scoring.

BEGIN;

DO $$
DECLARE
  v_user uuid := 'f1180000-0000-4000-8000-000000000001';
BEGIN
  INSERT INTO auth.users (id, email, encrypted_password, aud, role, created_at, updated_at)
  VALUES (v_user, 'education-golden-path@ctgone.invalid', '', 'authenticated', 'authenticated', now(), now());

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user) THEN
    RAISE EXCEPTION 'education golden journey: profile trigger did not materialize learner';
  END IF;
END $$;

SET LOCAL ROLE service_role;

DO $$
DECLARE
  v_user uuid := 'f1180000-0000-4000-8000-000000000001';
  v_assessment uuid;
  v_enrollment uuid;
  v_correct jsonb;
  v_wrong jsonb;
  v_result jsonb;
  v_failed_as_expected boolean := false;
  v_attempt_count integer;
  v_response_count integer;
BEGIN
  PERFORM public.claim_free_education_course(v_user, 'filosofia-tecnologia-y-valor');

  SELECT en.id INTO v_enrollment
  FROM public.education_enrollments en
  JOIN public.education_courses c ON c.id = en.course_id
  WHERE en.user_id = v_user AND c.slug = 'filosofia-tecnologia-y-valor';
  IF v_enrollment IS NULL THEN
    RAISE EXCEPTION 'education golden journey: enrollment missing';
  END IF;

  SELECT a.id INTO v_assessment
  FROM public.education_assessments a
  JOIN public.education_courses c ON c.id = a.course_id
  WHERE c.slug = 'filosofia-tecnologia-y-valor'
    AND a.slug = 'evaluacion-final-criterio-y-valor'
    AND a.status = 'published';
  IF v_assessment IS NULL THEN
    RAISE EXCEPTION 'education golden journey: pilot assessment missing';
  END IF;

  SELECT jsonb_object_agg(q.id::text, o.id::text)
  INTO v_correct
  FROM public.education_assessment_questions q
  JOIN public.education_assessment_options o ON o.question_id = q.id AND o.is_correct
  WHERE q.assessment_id = v_assessment AND q.status = 'published';

  SELECT jsonb_object_agg(q.id::text, wrong.id::text)
  INTO v_wrong
  FROM public.education_assessment_questions q
  JOIN LATERAL (
    SELECT o.id
    FROM public.education_assessment_options o
    WHERE o.question_id = q.id AND NOT o.is_correct
    ORDER BY o.position
    LIMIT 1
  ) wrong ON true
  WHERE q.assessment_id = v_assessment AND q.status = 'published';

  v_result := public.submit_education_assessment_attempt(v_user, v_assessment, v_correct);
  IF coalesce((v_result->>'passed')::boolean, false) IS DISTINCT FROM true
     OR (v_result->>'scorePercent')::numeric <> 100 THEN
    RAISE EXCEPTION 'education golden journey: correct attempt was not scored 100/pass: %', v_result;
  END IF;

  v_result := public.submit_education_assessment_attempt(v_user, v_assessment, v_wrong);
  IF coalesce((v_result->>'passed')::boolean, true) IS DISTINCT FROM false
     OR (v_result->>'scorePercent')::numeric <> 0 THEN
    RAISE EXCEPTION 'education golden journey: incorrect attempt was not scored 0/fail: %', v_result;
  END IF;

  PERFORM public.submit_education_assessment_attempt(v_user, v_assessment, v_wrong);

  BEGIN
    PERFORM public.submit_education_assessment_attempt(v_user, v_assessment, v_wrong);
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%EDUCATION_ASSESSMENT_MAX_ATTEMPTS_REACHED%' THEN
      v_failed_as_expected := true;
    ELSE
      RAISE;
    END IF;
  END;
  IF NOT v_failed_as_expected THEN
    RAISE EXCEPTION 'education golden journey: fourth attempt was not rejected';
  END IF;

  SELECT count(*)::integer INTO v_attempt_count
  FROM public.education_assessment_attempts
  WHERE enrollment_id = v_enrollment AND assessment_id = v_assessment;
  SELECT count(*)::integer INTO v_response_count
  FROM public.education_assessment_responses r
  JOIN public.education_assessment_attempts a ON a.id = r.attempt_id
  WHERE a.enrollment_id = v_enrollment AND a.assessment_id = v_assessment;

  IF v_attempt_count <> 3 OR v_response_count <> 15 THEN
    RAISE EXCEPTION 'education golden journey: evidence cardinality mismatch attempts=% responses=%', v_attempt_count, v_response_count;
  END IF;
END $$;

RESET ROLE;

DO $$
BEGIN
  IF has_function_privilege('authenticated', 'public.submit_education_assessment_attempt(uuid,uuid,jsonb)', 'EXECUTE') THEN
    RAISE EXCEPTION 'education golden journey: authenticated can execute scoring RPC directly';
  END IF;
  IF has_function_privilege('anon', 'public.submit_education_assessment_attempt(uuid,uuid,jsonb)', 'EXECUTE') THEN
    RAISE EXCEPTION 'education golden journey: anon can execute scoring RPC directly';
  END IF;
  IF has_table_privilege('authenticated', 'public.education_assessment_options', 'SELECT') THEN
    RAISE EXCEPTION 'education golden journey: authenticated can read answer-key table';
  END IF;
END $$;

ROLLBACK;

SELECT 'Education assessment golden journey: PASS' AS result;
