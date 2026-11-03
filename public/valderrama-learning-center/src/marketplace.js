// Motor de reservas y protección para simulaciones sintéticas SIN datos reales.
// No es un backend ni una frontera de autorización. Todas las mutaciones reales
// requerirán identidad del servidor, RLS, auditoría y transacciones atómicas.
const ACTIVE = new Set(['pending', 'confirmed']);
const audiences = new Set(['adult', 'minor']);
const categories = new Set(['conduct', 'privacy', 'safeguarding', 'other']);

function fail(message) { throw new Error(message); }
function ensure(condition, message) { if (!condition) fail(message); }
function copy(state) {
  return { ...state, bookings: state.bookings.map(x => ({...x})),
    reviews: state.reviews.map(x => ({...x})), incidents: state.incidents.map(x => ({...x})) };
}
function validDate(value) {
  const d = new Date(value);
  ensure(typeof value === 'string' && !Number.isNaN(d.getTime()), 'Fecha de sesión inválida.');
  return d;
}
function validSlot(state, tutorId, startsAt, exceptId, now) {
  const slot = validDate(startsAt);
  ensure(slot.getTime() > new Date(now).getTime() + 15 * 60 * 1000,
    'La clase debe comenzar con más de 15 minutos de antelación.');
  ensure(slot.getTime() < new Date(now).getTime() + 90 * 86400000,
    'La agenda permite un máximo de 90 días.');
  const conflict = state.bookings.some(b => b.tutorId === tutorId &&
    b.id !== exceptId && ACTIVE.has(b.status) &&
    Math.abs(new Date(b.startsAt).getTime() - slot.getTime()) < 60 * 60000);
  ensure(!conflict, 'El horario ya está reservado o solicitado.');
  return slot.toISOString();
}
function booking(state, id) {
  const record = state.bookings.find(x => x.id === id);
  ensure(record, 'Solicitud no encontrada.');
  return record;
}
export function createEmptyMarketplace(tutors) {
  return { tutors: tutors.map(x => ({...x})), bookings: [], reviews: [], incidents: [], nextId: 1 };
}
export function isTutorEligible(tutor, audience) {
  if (!tutor || !audiences.has(audience)) return false;
  if (audience === 'minor') return tutor.verification === 'approved_minors' &&
    tutor.safeguardingApproved === true;
  return ['approved_adults', 'approved_minors'].includes(tutor.verification);
}
export function requestClass(state, input, now = new Date()) {
  const tutor = state.tutors.find(x => x.id === input.tutorId);
  ensure(audiences.has(input.audience), 'Seleccione el público correspondiente.');
  ensure(isTutorEligible(tutor, input.audience), 'Este perfil no está habilitado para ese público.');
  ensure(typeof input.requesterId === 'string' && input.requesterId.length >= 4,
    'Se requiere un identificador de persona adulta.');
  ensure(input.requesterRole === (input.audience === 'minor' ? 'guardian' : 'adult'),
    'Solo una persona adulta autorizada puede gestionar la solicitud.');
  if (input.audience === 'minor') {
    ensure(input.guardianVerified === true, 'La representación familiar debe estar verificada.');
  }
  ensure(input.consent === true, 'Debe aceptar las condiciones de la simulación.');
  ensure(typeof input.subject === 'string' && input.subject.trim().length >= 2 &&
    input.subject.trim().length <= 100, 'La materia debe contener entre 2 y 100 caracteres.');
  ensure(tutor.modes.includes(input.mode), 'Modalidad no ofrecida por el profesor.');
  const startsAt = validSlot(state, tutor.id, input.startsAt, null, now);
  const next = copy(state);
  const record = {
    id: 'vlc-demo-' + next.nextId++, tutorId: tutor.id,
    requesterId: input.requesterId, audience: input.audience,
    subject: input.subject.trim(), mode: input.mode, startsAt,
    durationMinutes: 60, status: 'pending',
    createdAt: new Date(now).toISOString(),
    // No guardar nombres, teléfonos, direcciones ni fichas de menores.
  };
  next.bookings.push(record);
  return { state: next, record };
}
export function decideClass(state, id, actorTutorId, decision) {
  ensure(['accept', 'reject'].includes(decision), 'Decisión desconocida.');
  const next = copy(state);
  const record = booking(next, id);
  ensure(record.tutorId === actorTutorId, 'Solo el tutor responsable puede responder.');
  ensure(record.status === 'pending', 'Esta solicitud ya no está pendiente.');
  record.status = decision === 'accept' ? 'confirmed' : 'rejected';
  return next;
}
export function rescheduleClass(state, id, actorId, startsAt, now = new Date()) {
  const next = copy(state);
  const record = booking(next, id);
  ensure([record.requesterId, record.tutorId].includes(actorId), 'Operación no autorizada.');
  ensure(ACTIVE.has(record.status), 'La solicitud no admite reprogramación.');
  record.startsAt = validSlot(next, record.tutorId, startsAt, record.id, now);
  record.status = 'pending'; // Toda modificación exige nueva aceptación docente.
  return next;
}
export function completeClass(state, id, actorTutorId, now = new Date()) {
  const next = copy(state);
  const record = booking(next, id);
  ensure(record.tutorId === actorTutorId, 'Solo el tutor responsable puede finalizar.');
  ensure(record.status === 'confirmed', 'La clase debe estar confirmada y sin incidentes abiertos.');
  const finished = new Date(record.startsAt).getTime() + record.durationMinutes * 60000;
  ensure(new Date(now).getTime() >= finished, 'La sesión todavía no ha finalizado.');
  record.status = 'completed';
  return next;
}
export function reviewClass(state, id, actorId, stars, comment = '') {
  const next = copy(state);
  const record = booking(next, id);
  ensure(record.requesterId === actorId, 'Solo quien solicitó la sesión puede valorarla.');
  ensure(record.status === 'completed', 'Solo se pueden valorar clases completadas.');
  ensure(!next.reviews.some(r => r.bookingId === id), 'La clase ya tiene una valoración.');
  ensure(Number.isInteger(stars) && stars >= 1 && stars <= 5, 'Puntuación entre 1 y 5.');
  ensure(typeof comment === 'string' && comment.length <= 300, 'Máximo 300 caracteres.');
  const review = { id: 'review-' + next.nextId++, bookingId: id, tutorId: record.tutorId,
    stars, comment: comment.trim(), status: 'pending_moderation' };
  next.reviews.push(review); // Nunca se publica automáticamente.
  return {state: next, review};
}
export function reportIncident(state, id, actorId, category) {
  ensure(categories.has(category), 'Categoría de reporte inválida.');
  const next = copy(state);
  const record = booking(next, id);
  ensure([record.requesterId, record.tutorId].includes(actorId), 'No puede reportar esta sesión.');
  ensure(!next.incidents.some(x => x.bookingId === id && x.status === 'open'),
    'Ya existe un reporte abierto para esta sesión.');
  const incident = { id: 'incident-' + next.nextId++, bookingId: id, category, status: 'open' };
  next.incidents.push(incident);
  record.status = 'on_hold';
  // Ningún relato identificable del menor se introduce en el simulador.
  next.reviews.filter(x => x.bookingId === id).forEach(x => { x.status = 'on_hold'; });
  return {state: next, incident};
}
export function getSummary(state) {
  return {
    pending: state.bookings.filter(b => b.status === 'pending').length,
    confirmed: state.bookings.filter(b => b.status === 'confirmed').length,
    completed: state.bookings.filter(b => b.status === 'completed').length,
    incidents: state.incidents.filter(x => x.status === 'open').length,
  };
}
