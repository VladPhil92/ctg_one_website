import { tutors, levelLabels } from './data.js';
import { filterTutors, canRequestClassForMinor } from './filters.js';

const $ = selector => document.querySelector(selector);
const list = $('#tutor-list');
const filters = { search: $('#search'), level: $('#level'), mode: $('#mode') };
const requestDialog = $('#request-dialog');
const tutorDialog = $('#tutor-dialog');
let selectedTutor = null;

function render() {
  const results = filterTutors(tutors, {
    search: filters.search.value,
    level: filters.level.value,
    mode: filters.mode.value,
  });
  $('#count').textContent = `${results.length} ${results.length === 1 ? 'especialista de ejemplo' : 'especialistas de ejemplo'}`;
  $('#no-results').hidden = results.length > 0;
  list.replaceChildren(...results.map(createCard));
}

function createCard(tutor) {
  const article = document.createElement('article');
  article.className = 'tutor-card';
  article.innerHTML = `
    <div class="card-top"><div class="avatar avatar-${tutor.gradient}" aria-hidden="true">${tutor.initials}</div><span class="sample-label">PERFIL FICTICIO</span></div>
    <div class="teacher-name">${tutor.name}</div><div class="specialty">${tutor.specialty}</div>
    <div class="card-rating"><span aria-hidden="true">★</span> <strong>${tutor.rating.toFixed(1)}</strong><small>(${tutor.reviews} reseñas simuladas)</small></div>
    <div class="level-tags">${tutor.levels.map(l => `<span>${levelLabels[l]}</span>`).join('')}</div>
    <div class="card-meta"><div><span>Experiencia de ejemplo</span><strong>${tutor.years}</strong></div><div><span>Modalidad</span><strong>${tutor.modes.map(m => m === 'virtual' ? 'Virtual' : 'Presencial').join(' · ')}</strong></div></div>
    <button type="button" class="card-btn">Solicitar clase <span aria-hidden="true">↗</span></button>`;
  article.querySelector('button').addEventListener('click', () => {
    selectedTutor = tutor;
    $('#selected-tutor').textContent = `${tutor.name} · ${tutor.specialty} (perfil ficticio)`;
    $('#request-feedback').textContent = '';
    $('#request-form').reset();
    $('#guardian-note').hidden = true;
    requestDialog.showModal();
  });
  return article;
}

Object.values(filters).forEach(node => node.addEventListener(node.tagName === 'INPUT' ? 'input' : 'change', render));
$('#reset').addEventListener('click', () => { Object.values(filters).forEach(x => x.value = ''); render(); });
for (const id of ['open-tutor', 'open-tutor-bottom']) $( `#${id}` ).addEventListener('click', () => tutorDialog.showModal());
document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => $('#' + b.dataset.close).close()));
for (const dialog of [requestDialog, tutorDialog]) dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
$('#audience').addEventListener('change', event => { $('#guardian-note').hidden = event.target.value !== 'menor'; });
$('#request-form').addEventListener('submit', event => {
  event.preventDefault();
  const audience = $('#audience').value;
  // En el prototipo un menor solo puede solicitar mediante quien declara ser su representante;
  // la validación real de representación queda pendiente de backend y comprobación humana.
  const demoGuardianAcknowledged = audience === 'menor';
  if (!canRequestClassForMinor(audience, demoGuardianAcknowledged)) {
    $('#request-feedback').textContent = 'Debe seleccionar un tipo de solicitante válido.';
    return;
  }
  $('#request-feedback').textContent = `Flujo ilustrativo completado para ${selectedTutor?.name ?? 'este docente'}. No se enviaron ni guardaron datos. Las reservas reales estarán disponibles después del lanzamiento.`;
});
render();
