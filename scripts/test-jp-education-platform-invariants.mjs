import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const [talks, ideas, projects, books, catalog, checkout, library, dashboard, campusPage, campusClient] = await Promise.all([
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
]);

// Every JP education axis must be a real vertical connected to the shared catalog.
for (const [axis, source] of [
  ['talks', talks],
  ['ideas', ideas],
  ['projects', projects],
  ['books', books],
]) {
  assert.match(source, /EducationAxisCatalog/, `${axis} must use the shared education catalog`);
  assert.match(source, new RegExp(`axis=["']${axis}["']`), `${axis} must identify its catalog axis explicitly`);
}

// Talks must separate operational registration from the authenticated paid order.
assert.match(talks, /\/jpvalderrama\/campus\/checkout\/filosofia-o-dinero/);
assert.match(talks, /Comprar ticket/);
assert.match(talks, /registrarte no equivale a pagar/i);
assert.match(talks, /17 de septiembre/);
assert.match(talks, /2026-09-17T19:00:00-05:00/);

// Ideas, Projects and Books keep truthful domain semantics instead of fake inventory.
assert.match(ideas, /De una pregunta pública a una experiencia de aprendizaje/);
assert.match(projects, /Un proyecto no se compra como un ticket/);
assert.match(projects, /\/jpvalderrama\/campus#instituciones/);
assert.match(books, /Del manuscrito a una edición que realmente puede comprarse/);
assert.match(books, /logística física se habilitará solo cuando exista fulfillment real/i);

// Public catalog distinguishes purchase entry from post-entitlement destination.
assert.match(catalog, /action_path/);
assert.match(catalog, /destination_path/);
assert.match(catalog, /commerce_mode/);
assert.match(catalog, /'paid'/);
assert.match(catalog, /'free'/);

// One generic checkout handles paid education products without hard-coded conference navigation.
assert.match(checkout, /function detailPath/);
assert.match(checkout, /offering\.offering_type === 'book'/);
assert.match(checkout, /offering\.offering_type === 'course'/);
assert.match(checkout, /Orden primero\. Acceso después de verificar/);
assert.match(checkout, /EDUCATION_ALREADY_ENTITLED/);
assert.doesNotMatch(checkout, /\/jpvalderrama\/talks#conferencia/);
assert.match(checkout, /Continuar por WhatsApp/);

// The authenticated library must expose the Learning Core read model, not only entitlements/orders.
assert.match(library, /education_enrollments/);
assert.match(library, /education_lesson_progress/);
assert.match(library, /progressPercent/);
assert.match(library, /completedLessons/);
assert.match(library, /continuePath/);
assert.match(library, /private, no-store/);

// Dashboard is the user's Education OS: learning + entitlements + commerce + services.
assert.match(dashboard, /Mi aprendizaje/);
assert.match(dashboard, /Continuar aprendiendo/);
assert.match(dashboard, /role="progressbar"/);
assert.match(dashboard, /Mis órdenes educativas/);
assert.match(dashboard, /Mis solicitudes/);
assert.match(dashboard, /Una orden pendiente no es un acceso/);
for (const axis of ['talks', 'ideas', 'books', 'projects']) {
  assert.match(dashboard, new RegExp(`/jpvalderrama/${axis}`));
}

// Campus remains the canonical discovery hub and explains all three commerce rails.
assert.match(campusPage, /EducationCommerceJourney/);
assert.match(campusClient, /id="catalogo"/);
assert.match(campusClient, /id="instituciones"/);

console.log('JP Valderrama education axes, commerce journey and learning dashboard invariants: PASS');
