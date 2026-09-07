import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const [talks, ideas, projects, books, catalog, checkout, library, dashboard, campusPage, campusClient, learningCenter, familyRequest, advisoryApi, servicesApi, quoteDecisionApi, adminServicesApi, servicesDashboard, adminServicesPage, operationsMigration, assessmentMigration, assessmentApi, assessmentPlayer, courseApi, learningPlayer, instructorApi, instructorPage, assessmentGoldenJourney] = await Promise.all([
  read('src/app/jpvalderrama/talks/page.tsx'),
  read('src/app/jpvalderrama/ideas/page.tsx'),
  read('src/app/jpvalderrama/projects/page.tsx'),
  read('src/app/jpvalderrama/books/page.tsx'),
  read('src/app/api/education/catalog/route.ts'),
  read('src/components/jpvalderrama/EducationCheckoutClient.tsx'),
  read('src/app/api/education/library/route.ts'),
  read('src/app/dashboard/educacion/page.tsx'),
  read('src/app/jpvalderrama/campus/page.tsx'),
  read('src/components/jpvalderrama/EducationCampusClient.tsx'),
  read('src/app/jpvalderrama/learningcenter/page.tsx'),
  read('src/components/jpvalderrama/EducationFamilyServiceRequest.tsx'),
  read('src/app/api/education/advisory/route.ts'),
  read('src/app/api/education/services/route.ts'),
  read('src/app/api/education/services/quotes/[quoteId]/decision/route.ts'),
  read('src/app/api/education/operations/services/route.ts'),
  read('src/app/dashboard/educacion/servicios/page.tsx'),
  read('src/app/dashboard/educacion/operaciones/servicios/page.tsx'),
  read('supabase/migrations/20260907012804_0117_jp_education_academic_operations.sql'),
  read('supabase/migrations/20260907023732_0118_jp_education_assessment_instructor_core.sql'),
  read('src/app/api/education/assessments/[assessment]/route.ts'),
  read('src/components/education/AssessmentPlayer.tsx'),
  read('src/app/api/education/learning/courses/[course]/route.ts'),
  read('src/components/education/LearningPlayer.tsx'),
  read('src/app/api/education/instructor/route.ts'),
  read('src/app/dashboard/educacion/instructor/page.tsx'),
  read('scripts/education-assessment-golden-journey.sql'),
]);

for (const [axis, source] of [['talks', talks], ['ideas', ideas], ['projects', projects], ['books', books]]) {
  assert.match(source, /EducationAxisCatalog/, `${axis} must use the shared education catalog`);
  assert.match(source, new RegExp(`axis=["']${axis}["']`), `${axis} must identify its catalog axis explicitly`);
}

assert.match(talks, /\/jpvalderrama\/campus\/checkout\/filosofia-o-dinero/);
assert.match(talks, /Comprar ticket/);
assert.match(talks, /registrarte no equivale a pagar/i);
assert.match(talks, /17 de septiembre/);
assert.match(talks, /2026-09-17T19:00:00-05:00/);
assert.match(ideas, /De una pregunta pública a una experiencia de aprendizaje/);
assert.match(projects, /Un proyecto no se compra como un ticket/);
assert.match(projects, /\/jpvalderrama\/campus#instituciones/);
assert.match(books, /Del manuscrito a una edición que realmente puede comprarse/);
assert.match(books, /logística física se habilitará solo cuando exista fulfillment real/i);

assert.match(catalog, /action_path/);
assert.match(catalog, /destination_path/);
assert.match(catalog, /commerce_mode/);
assert.match(catalog, /'paid'/);
assert.match(catalog, /'free'/);
assert.match(checkout, /function detailPath/);
assert.match(checkout, /offering\.offering_type === 'book'/);
assert.match(checkout, /offering\.offering_type === 'course'/);
assert.match(checkout, /Orden primero\. Acceso después de verificar/);
assert.match(checkout, /EDUCATION_ALREADY_ENTITLED/);
assert.doesNotMatch(checkout, /\/jpvalderrama\/talks#conferencia/);
assert.match(checkout, /Continuar por WhatsApp/);

assert.match(library, /education_enrollments/);
assert.match(library, /education_lesson_progress/);
assert.match(library, /progressPercent/);
assert.match(library, /completedLessons/);
assert.match(library, /continuePath/);
assert.match(library, /private, no-store/);
assert.match(dashboard, /Mi aprendizaje/);
assert.match(dashboard, /Continuar aprendiendo/);
assert.match(dashboard, /role="progressbar"/);
assert.match(dashboard, /Mis órdenes educativas/);
assert.match(dashboard, /Mis solicitudes/);
assert.match(dashboard, /Una orden pendiente no es un acceso/);
for (const axis of ['talks', 'ideas', 'books', 'projects']) assert.match(dashboard, new RegExp(`/jpvalderrama/${axis}`));

assert.match(campusPage, /EducationCommerceJourney/);
assert.match(campusClient, /id="catalogo"/);
assert.match(campusClient, /id="instituciones"/);
assert.match(learningCenter, /EducationFamilyServiceRequest/);
assert.match(learningCenter, /id="solicitud"/);
assert.match(learningCenter, /diagnóstico.*disponibilidad.*cotización/i);
assert.match(familyRequest, /requestKind: 'family'/);
assert.match(familyRequest, /\/api\/education\/advisory/);
assert.match(familyRequest, /Solicitar diagnóstico y cotización/);
assert.match(familyRequest, /\/dashboard\/educacion\/servicios/);
assert.match(advisoryApi, /request_kind: parsed\.data\.requestKind/);

// Academic operations: quotes are commercial intent, never settlement or entitlement authority.
assert.match(operationsMigration, /create table public\.education_service_quotes/);
assert.match(operationsMigration, /create table public\.education_sessions/);
assert.match(operationsMigration, /Acceptance records commercial intent only; it does not verify payment or grant entitlements/);
assert.match(operationsMigration, /Scheduling never grants entitlements/);
assert.match(operationsMigration, /education_service_quotes_owner_read/);
assert.match(operationsMigration, /education_sessions_owner_read/);
assert.match(operationsMigration, /auth\.uid\(\)/);
assert.match(operationsMigration, /accept_education_service_quote/);
assert.match(operationsMigration, /decline_education_service_quote/);
assert.doesNotMatch(operationsMigration, /insert into public\.education_entitlements/);
assert.doesNotMatch(operationsMigration, /update public\.education_orders/);
assert.match(servicesApi, /education_service_quotes/);
assert.match(servicesApi, /education_sessions/);
assert.match(servicesApi, /private, no-store/);
assert.match(quoteDecisionApi, /accept_education_service_quote/);
assert.match(quoteDecisionApi, /decline_education_service_quote/);
assert.match(quoteDecisionApi, /createAuthenticatedRequestContext/);
assert.doesNotMatch(quoteDecisionApi, /createAdminClient/);
assert.match(adminServicesApi, /create_quote/);
assert.match(adminServicesApi, /schedule_session/);
assert.match(adminServicesApi, /update_session_status/);
assert.match(adminServicesApi, /z\.enum\(\['completed', 'cancelled', 'no_show'\]\)/);
assert.match(adminServicesApi, /SESSION_STATUS_TERMINAL/);
assert.match(adminServicesApi, /SESSION_NOT_STARTED/);
assert.match(adminServicesApi, /SESSION_REQUEST_MISMATCH/);
assert.match(adminServicesApi, /\.eq\('status', 'scheduled'\)/);
assert.match(adminServicesApi, /createAdminClient/);
assert.match(adminServicesApi, /rpc\('is_admin'\)/);
assert.match(adminServicesApi, /QUOTE_NOT_ACCEPTED/);
assert.doesNotMatch(adminServicesApi, /settle_education_order/);
assert.doesNotMatch(adminServicesApi, /complete_education_order/);
assert.doesNotMatch(adminServicesApi, /education_entitlements.*insert/);
assert.match(servicesDashboard, /Mis servicios y agenda/);
assert.match(servicesDashboard, /no constituye un pago ni concede acceso/i);
assert.match(servicesDashboard, /Aceptar alcance/);
assert.match(servicesDashboard, /Historial de sesiones/);
assert.match(adminServicesPage, /Servicios, propuestas y agenda/);
assert.match(adminServicesPage, /Emitir cotización/);
assert.match(adminServicesPage, /Programar sesión/);

// Assessment Core: answer keys remain server-only and scoring is computed atomically in PostgreSQL.
for (const table of ['education_assessments', 'education_assessment_questions', 'education_assessment_options', 'education_assessment_attempts', 'education_assessment_responses']) {
  assert.match(assessmentMigration, new RegExp(`create table public\\.${table}`));
  assert.match(assessmentMigration, new RegExp(`alter table public\\.${table} enable row level security`));
}
assert.match(assessmentMigration, /submit_education_assessment_attempt/);
assert.match(assessmentMigration, /security invoker/i);
assert.match(assessmentMigration, /revoke all on function public\.submit_education_assessment_attempt\(uuid,uuid,jsonb\) from public, anon, authenticated/);
assert.match(assessmentMigration, /grant execute on function public\.submit_education_assessment_attempt\(uuid,uuid,jsonb\) to service_role/);
assert.match(assessmentMigration, /EDUCATION_ASSESSMENT_MAX_ATTEMPTS_REACHED/);
assert.match(assessmentMigration, /scorePercent/);
assert.match(assessmentMigration, /evaluacion-final-criterio-y-valor/);
assert.match(assessmentApi, /createAuthenticatedRequestContext/);
assert.match(assessmentApi, /createAdminClient/);
assert.match(assessmentApi, /submit_education_assessment_attempt/);
assert.doesNotMatch(assessmentApi, /is_correct/);
assert.match(assessmentPlayer, /Enviar evaluación/);
assert.match(assessmentPlayer, /Evidencia de comprensión registrada/);
assert.match(assessmentPlayer, /Historial de intentos/);
assert.doesNotMatch(assessmentPlayer, /isCorrect/);
assert.match(courseApi, /education_assessments/);
assert.match(courseApi, /education_assessment_attempts/);
assert.match(courseApi, /passedRequiredAssessments/);
assert.match(learningPlayer, /Ir a evaluación/);
assert.match(learningPlayer, /evaluaciones/);

// Instructor Studio: browser role is never trusted; server re-checks canonical admin authority.
assert.match(instructorApi, /createAuthenticatedRequestContext/);
assert.match(instructorApi, /rpc\('is_admin'\)/);
assert.match(instructorApi, /createAdminClient/);
assert.match(instructorApi, /create_course/);
assert.match(instructorApi, /update_course/);
assert.match(instructorApi, /create_module/);
assert.match(instructorApi, /create_lesson/);
assert.match(instructorApi, /create_assessment/);
assert.match(instructorApi, /create_question/);
assert.match(instructorApi, /COURSE_PUBLISH_REQUIRES_PUBLISHED_LESSON/);
assert.match(instructorPage, /Instructor Studio V1/);
assert.match(instructorPage, /Autoría académica/);
assert.match(instructorPage, /Editar y publicar curso/);
assert.match(instructorPage, /Nueva evaluación/);
assert.match(instructorPage, /Añadir pregunta/);

// Disposable DB journey proves scoring, evidence cardinality, max attempts and non-exposure.
assert.match(assessmentGoldenJourney, /claim_free_education_course/);
assert.match(assessmentGoldenJourney, /submit_education_assessment_attempt/);
assert.match(assessmentGoldenJourney, /scorePercent/);
assert.match(assessmentGoldenJourney, /MAX_ATTEMPTS_REACHED/);
assert.match(assessmentGoldenJourney, /has_table_privilege\('authenticated', 'public\.education_assessment_options', 'SELECT'\)/);
assert.match(assessmentGoldenJourney, /ROLLBACK/);

console.log('JP Valderrama education platform, commerce, assessment and instructor invariants: PASS');
