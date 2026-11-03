import { tutors } from '../src/data.js';
import {createEmptyMarketplace, isTutorEligible, requestClass,
  decideClass, rescheduleClass, completeClass, reviewClass,
  reportIncident, getSummary} from '../src/marketplace.js';

const $ = id => document.getElementById(id);
const label = (tag, content, className) => {
  const el = document.createElement(tag);
  el.textContent = String(content);
  if (className) el.className = className;
  return el;
};
const demoTutors = tutors.map((t, i) => ({
  ...t, verification: i % 2 === 0 ? 'approved_adults' : 'approved_minors',
  safeguardingApproved: i % 2 === 1,
}));
let state = createEmptyMarketplace(demoTutors);
const requesterId = () => $('audience').value === 'minor' ? 'guardian-demo' : 'adult-demo';
const dateString = value => new Date(value).toLocaleString('es-CO',{dateStyle:'medium',timeStyle:'short'});
const tomorrowSlot = (days, hour) => {
  const d = new Date(); d.setDate(d.getDate() + days); d.setHours(hour,0,0,0);
  return d.toISOString();
};
const slots = Array.from({length:6}, (_,i) => tomorrowSlot(i + 1, i % 2 ? 16 : 10));
const statusNames = {pending:'Pendiente',confirmed:'Confirmada',completed:'Finalizada',
  rejected:'Rechazada',on_hold:'En protección / suspendida'};
function button(title, handler, className) {
  const el = label('button',title,className);
  el.type='button';el.addEventListener('click',handler);return el;
}
function feedback(message, isError=false) {
  $('feedback').textContent=message;
  $('feedback').style.color=isError?'#9b3429':'#176958';
}
function selectTutor(id) {
  $('tutor').value=id;
  renderTeachers();
  renderSlots();
}
function renderTeachers() {
  const term=$('search').value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const area=$('teachers');area.replaceChildren();
  for (const tutor of demoTutors.filter(t => (t.name+' '+t.specialty).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').includes(term))) {
    const item=button('',()=>selectTutor(tutor.id),'teacher'+($('tutor').value===tutor.id?' selected':''));
    const avatar=label('span',tutor.initials,'avatar');
    const info=document.createElement('span');
    info.append(label('strong',tutor.name),label('small',tutor.specialty));
    item.append(avatar,info,label('em',tutor.verification==='approved_minors'?'Menores*':'Adultos*'));
    item.setAttribute('aria-label','Seleccionar perfil ficticio '+tutor.name);
    area.append(item);
  }
  if(!area.children.length) area.append(label('p','Sin coincidencias de ejemplo.','empty'));
}
function renderSlots() {
  const chosen=$('slot').value;
  const tutorId=$('tutor').value;
  const select=$('slot');select.replaceChildren();
  for(const iso of slots) {
    const blocked=state.bookings.some(b=>b.tutorId===tutorId &&
      ['pending','confirmed'].includes(b.status) &&
      Math.abs(new Date(b.startsAt)-new Date(iso)) < 3600000);
    const option=document.createElement('option');
    option.value=iso;option.textContent=dateString(iso)+(blocked?' · ocupado':'');
    option.disabled=blocked;select.append(option);
  }
  if([...select.options].some(x=>x.value===chosen && !x.disabled)) select.value=chosen;
  if(select.selectedIndex<0) { const first=[...select.options].find(x=>!x.disabled);if(first) select.value=first.value; }
}
function render() {
  const summary=getSummary(state);
  for(const key of ['pending','confirmed','completed','incidents']) $(key).textContent=summary[key];
  renderTeachers();renderSlots();
  const area=$('bookings');area.replaceChildren();
  if(!state.bookings.length) area.append(label('p','No hay solicitudes de ejemplo. Cree la primera en el formulario.','empty'));
  for(const b of state.bookings.slice().reverse()) {
    const teacher=demoTutors.find(t=>t.id===b.tutorId);
    const card=label('article','','booking');
    const head=label('div','','booking-head');
    head.append(label('strong',teacher.name+' · '+b.subject),label('span',statusNames[b.status]||b.status,'status'));
    card.append(head,label('small',dateString(b.startsAt)+' · '+b.mode+' · '+(b.audience==='minor'?'Menor (ficticio)':'Adulto (ficticio)')));
    const actions=label('div','','actions');
    if (b.status==='pending') {
      actions.append(button('Aceptar como tutor',()=>apply(()=>decideClass(state,b.id,b.tutorId,'accept'))));
      actions.append(button('Rechazar',()=>apply(()=>decideClass(state,b.id,b.tutorId,'reject')),'danger'));
    }
    if(['pending','confirmed'].includes(b.status)) {
      actions.append(button('Reprogramar +1 día',()=>apply(()=>rescheduleClass(state,b.id,b.requesterId,
        new Date(new Date(b.startsAt).getTime()+86400000).toISOString()))));
    }
    if(b.status==='confirmed') {
      actions.append(button('Simular fin de clase',()=>apply(()=>completeClass(state,b.id,b.tutorId,
        new Date(new Date(b.startsAt).getTime()+b.durationMinutes*60000+1000)))));
    }
    if(b.status==='completed' && !state.reviews.some(x=>x.bookingId===b.id)) {
      actions.append(button('Valorar 5★ (pendiente de moderación)',()=>apply(()=>reviewClass(state,b.id,b.requesterId,5,'Simulación'))));
    }
    if(['pending','confirmed','completed'].includes(b.status)) {
      actions.append(button('Reportar alerta',()=>apply(()=>reportIncident(state,b.id,b.requesterId,'safeguarding')),'danger'));
    }
    card.append(actions);area.append(card);
  }
  const quality=$('quality');quality.replaceChildren();
  for(const incident of state.incidents) {
    const item=label('article','');item.append(label('strong','Alerta '+incident.id),
      label('span','Categoría: '+incident.category+' · Estado: abierta, pendiente de equipo humano'));
    quality.append(item);
  }
  for(const review of state.reviews){
    const item=label('article','');item.append(label('strong','Reseña '+review.id),
      label('span',review.stars+' estrellas · '+review.status+' · No publicada'));
    quality.append(item);
  }
  if(!quality.children.length) quality.append(label('p','Todavía no hay reseñas ni alertas simuladas.','empty'));
}
function apply(operation) {
  try {
    const result=operation();state=result?.state ?? result;
    feedback('Acción de demostración registrada únicamente en memoria.');
    render();
  }catch(error){feedback(error.message,true);}
}
for(const t of demoTutors){const option=document.createElement('option');option.value=t.id;option.textContent=t.name+' · '+t.specialty;$('tutor').append(option);}
$('audience').addEventListener('change',()=>{
  $('guardian-check').hidden=$('audience').value!=='minor';
  const selected=demoTutors.find(x=>x.id===$('tutor').value);
  if(!isTutorEligible(selected,$('audience').value)) {
    const available=demoTutors.find(x=>isTutorEligible(x,$('audience').value));
    if(available) $('tutor').value=available.id;
  }
  renderTeachers();renderSlots();
});
$('tutor').addEventListener('change',renderTeachers);
$('tutor').addEventListener('change',renderSlots);
$('search').addEventListener('input',renderTeachers);
$('book-form').addEventListener('submit',event=>{
  event.preventDefault();
  apply(()=>requestClass(state,{
    tutorId:$('tutor').value, requesterId:requesterId(),
    requesterRole:$('audience').value==='minor'?'guardian':'adult',
    audience:$('audience').value,
    guardianVerified:$('guardian-verified').checked,
    subject:$('subject').value,mode:$('mode').value,
    startsAt:$('slot').value,consent:$('consent').checked,
  }));
});
$('restart').addEventListener('click',()=>{state=createEmptyMarketplace(demoTutors);$('book-form').reset();feedback('Simulador reiniciado.');render();});
render();
