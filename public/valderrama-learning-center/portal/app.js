import { supabaseConfig } from './config.js';
import { VLCClient } from './client.js';
import {
 normalizeEmail, validatePassword, validateProfile, validateLearner,
 validateAttachment, sanitizeSubjects, makeObjectPath,
} from './validators.js';

const $ = (id) => document.getElementById(id);
const show = (id, visible = true) => { $(id).hidden = !visible; };
const field = (form, name) => form.elements.namedItem(name);
const text = (tag, value, className = '') => {
  const el = document.createElement(tag);
  el.textContent = String(value ?? '');
  if (className) el.className = className;
  return el;
};
const flash = (message, isError = false) => {
  const el = $('flash');
  el.textContent = message;
  el.className = isError ? 'flash error' : 'flash';
  el.hidden = false;
};
const onError = error => flash(error?.message || 'Se produjo un error inesperado.', true);
let api;
let profile;
let tutor;
let credentials = [];
let verification = null;
let staff = null;

try {
  api = new VLCClient(supabaseConfig);
  show('guest');
} catch {
  show('unconfigured');
}
document.querySelectorAll('[data-tab]').forEach(button => {
  button.addEventListener('click', () => {
    const tab = button.dataset.tab;
    show('login-form', tab === 'login');
    show('signup-form', tab === 'signup');
    document.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    show('flash',false);
  });
});

$('signup-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (!api) return;
  const form = event.currentTarget;
  const email = normalizeEmail(field(form,'email').value);
  const password = field(form,'password').value;
  if (!validatePassword(password)) return flash('Utilice una contraseña de 12 a 128 caracteres.',true);
  if (!field(form,'adult').checked || !field(form,'terms').checked) return flash('Debe declarar mayoría de edad y conocer las normas.',true);
  try {
    await api.signUp(email,password);
    form.reset();
    flash('Solicitud de alta recibida. Revise su correo y confirme la cuenta antes de ingresar. No comparta contraseñas.');
  } catch(e) { onError(e); }
});

$('login-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (!api) return;
  const form = event.currentTarget;
  try {
    await api.signIn(normalizeEmail(field(form,'email').value),field(form,'password').value);
    form.reset();
    show('guest',false);
    show('logout');
    await loadAccount();
  } catch(e) { onError(e); }
});
$('logout').addEventListener('click', async () => {
  try { await api?.signOut(); } catch(e) { onError(e); }
  profile = null; tutor = null; credentials = []; verification = null; staff = null;
  show('onboarding',false);show('dashboard',false);show('logout',false);show('guest');
  flash('Sesión cerrada.');
});

async function loadAccount() {
  const [mine] = await api.rows('user_profiles',{user_id:'eq.'+api.userId});
  if (!mine) {
    show('onboarding');
    show('dashboard',false);
    return;
  }
  profile = mine;
  show('onboarding',false);
  show('dashboard');
  $('hello').textContent = 'Hola, ' + mine.display_name;
  const label = {guardian:'Cuenta familiar',adult_learner:'Estudiante adulto',tutor:'Profesor / tutor'}[mine.account_type];
  $('role-pill').textContent = label || 'Cuenta de adulto';
  $('account-summary').textContent = 'Cuenta confirmada. Los recursos privados solo están disponibles para usuarios autorizados.';
  show('guardian-area',mine.account_type==='guardian');
  show('tutor-area',mine.account_type==='tutor');
  show('adult-area',mine.account_type==='adult_learner');
  const memberships = await api.rows('staff_members',{user_id:'eq.'+api.userId});
  staff = memberships[0] ?? null;
  show('staff-area',!!staff && ['reviewer','admin'].includes(staff.staff_role));
  show('guardian-review-area',!!staff && ['safeguarding','admin'].includes(staff.staff_role));
  if (mine.account_type === 'guardian') await loadLearners();
  if (mine.account_type === 'tutor') await loadTutor();
  if (staff && ['reviewer','admin'].includes(staff.staff_role)) await loadReviewQueue();
  if (staff && ['safeguarding','admin'].includes(staff.staff_role)) await loadGuardianReviewQueue();
}

$('onboarding-form').addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const account_type = field(form,'account_type').value;
  const display_name = field(form,'display_name').value.trim();
  if (!validateProfile(account_type,display_name)) return flash('Revise el nombre y tipo de cuenta.',true);
  try {
    await api.insert('user_profiles',{user_id:api.userId,display_name,account_type});
    flash('Perfil registrado. Puede comenzar a configurar su espacio.');
    await loadAccount();
  } catch(e) {onError(e);}
});
async function loadLearners() {
  const [learners,reviews] = await Promise.all([
    api.rows('learners',{guardian_id:'eq.'+api.userId,order:'created_at.desc'}),
    api.rows('guardian_reviews')
  ]);
  const statusById = new Map(reviews.map(x => [x.learner_id,x.status]));
  const list = $('learner-list');
  list.replaceChildren();
  if (!learners.length) list.append(text('p','Todavía no hay fichas educativas privadas.', 'hint'));
  for (const learner of learners) {
    const card = text('div','', 'item');
    const info = document.createElement('div');
    info.append(text('strong',learner.nickname));
    info.append(text('small',learner.grade_label + ' · ' + learner.educational_stage));
    card.append(info,text('span','Representación: ' + (statusById.get(learner.id) || 'pendiente')));
    list.append(card);
  }
}
$('learner-form').addEventListener('submit', async event => {
  event.preventDefault();
  const form=event.currentTarget;
  const nickname=field(form,'nickname').value.trim();
  const educational_stage=field(form,'educational_stage').value;
  const grade_label=field(form,'grade_label').value.trim();
  if (!field(form,'attested').checked || !validateLearner(nickname,educational_stage,grade_label)) return flash('Revise el alias, etapa, grado y declaración de representación.',true);
  try {
    await api.insert('learners',{guardian_id:api.userId,nickname,educational_stage,grade_label});
    form.reset();
    flash('Ficha privada creada. Su representación está pendiente de comprobación por el equipo autorizado.');
    await loadLearners();
  } catch(e) { onError(e); }
});

async function loadTutor() {
  const [own] = await api.rows('tutor_profiles',{user_id:'eq.'+api.userId});
  tutor = own ?? null;
  const [review] = await api.rows('tutor_verifications',{tutor_id:'eq.'+api.userId});
  verification = review ?? null;
  const status = {
    draft: 'Borrador privado · No publicado',
    in_review: 'En revisión · Edición restringida',
    approved_adults: 'Aprobado para estudiantes adultos; NO habilitado para menores',
    approved_minors: 'Aprobado para todos los públicos conforme a controles registrados',
    rejected: 'Rechazado · Solicite revisión del caso',
    suspended: 'Suspendido · Contacte al equipo de protección',
  };
  $('tutor-status').textContent = status[review?.status ?? 'draft'] || 'Estado pendiente.';
  const disabled = ['in_review','approved_adults','approved_minors','suspended'].includes(review?.status);
  const form=$('tutor-form');
  for (const element of form.elements) element.disabled=disabled;
  if (tutor) {
    for(const name of ['professional_name','headline','biography','city']) field(form,name).value=tutor[name]??'';
    field(form,'subjects').value=(tutor.subjects??[]).join(', ');
    const modes = tutor.modes || ['virtual'];
    field(form,'modes').value=modes.length===2?'both':modes[0];
  }
  show('tutor-files',!!tutor);
  $('photo-status').textContent = tutor?.photo_path ? 'Fotografía privada guardada. Pendiente de revisión para su publicación.' : 'No hay fotografía cargada.';
  if (!tutor) return;
  credentials = await api.rows('tutor_credentials',{tutor_id:'eq.'+api.userId,order:'created_at.desc'});
  const reviews = await api.rows('credential_reviews');
  const reviewById=new Map(reviews.map(x=>[x.credential_id,x.status]));
  const list=$('credential-list');
  list.replaceChildren();
  if (!credentials.length) list.append(text('p','Aún no hay acreditaciones registradas.','hint'));
  for(const item of credentials){
    const card=text('div','', 'item');
    const info=document.createElement('div');
    info.append(text('strong',item.qualification),text('small',item.issuing_institution+' · '+item.credential_type));
    card.append(info,text('span',reviewById.get(item.id)??'pendiente'));
    list.append(card);
  }
  const photoForm=$('photo-form');
  for(const element of photoForm.elements) element.disabled=disabled;
  const fileForm=$('credential-form');
  for(const element of fileForm.elements) element.disabled=disabled;
  $('submit-tutor').disabled=disabled || !!tutor.submitted_at;
  if(tutor.submitted_at) $('tutor-status').textContent += ' · Solicitud enviada';
}
$('tutor-form').addEventListener('submit',async event=>{
  event.preventDefault();
  const form=event.currentTarget;
  const professional_name=field(form,'professional_name').value.trim();
  const headline=field(form,'headline').value.trim();
  const biography=field(form,'biography').value.trim();
  const subjects=sanitizeSubjects(field(form,'subjects').value);
  const city=field(form,'city').value.trim();
  const modes=field(form,'modes').value==='both'?['virtual','presencial']:[field(form,'modes').value];
  if(professional_name.length<2 || professional_name.length>100 || headline.length>160 || biography.length>2000 || subjects.some(x=>x.length>65)) return flash('Revise los datos académicos.',true);
  const values={professional_name,headline,biography,subjects,city,modes};
  try{
    if(tutor) await api.patch('tutor_profiles','user_id',api.userId,values);
    else await api.insert('tutor_profiles',{user_id:api.userId,...values});
    flash('Borrador académico guardado de forma privada.');
    await loadTutor();
  }catch(e){onError(e);}
});
$('photo-form').addEventListener('submit',async event => {
  event.preventDefault();
  if(!tutor) return flash('Primero debe crear su borrador docente.',true);
  const form=event.currentTarget;
  const file=field(form,'photo').files?.[0];
  const error=validateAttachment(file);
  if(error || !['image/jpeg','image/png'].includes(file?.type)) return flash('La fotografía debe ser JPG o PNG de hasta 8 MB.',true);
  try {
    const path=makeObjectPath(api.userId,file,crypto.randomUUID());
    await api.upload('tutor-photos',path,file);
    await api.patch('tutor_profiles','user_id',api.userId,{photo_path:path});
    form.reset();
    flash('Foto guardada de forma privada. La imagen no se publicará antes de aprobar el perfil.');
    await loadTutor();
  }catch(e){onError(e);}
});
$('credential-form').addEventListener('submit',async event=>{
  event.preventDefault();
  if(!tutor) return flash('Guarde primero el borrador de su perfil.',true);
  const form=event.currentTarget;
  const file=field(form,'document').files?.[0];
  const error=validateAttachment(file);
  if(error) return flash(error,true);
  const credential_type=field(form,'credential_type').value;
  const issuing_institution=field(form,'issuing_institution').value.trim();
  const qualification=field(form,'qualification').value.trim();
  if(!['degree','certificate','license','other'].includes(credential_type)||
      issuing_institution.length<2||qualification.length<2) return flash('Revise los datos de la acreditación.',true);
  try{
    const path=makeObjectPath(api.userId,file,crypto.randomUUID());
    await api.upload('tutor-credentials',path,file);
    await api.insert('tutor_credentials',{tutor_id:api.userId,credential_type,issuing_institution,qualification,file_path:path});
    flash('Documento privado registrado. Pendiente de revisión humana.');
    form.reset();
    await loadTutor();
  }catch(e){onError(e);}
});
$('submit-tutor').addEventListener('click',async()=>{
  if(!tutor?.headline || !tutor.subjects?.length || !credentials.length) return flash('Antes de solicitar revisión, añada titular, materias y al menos una acreditación.',true);
  try {
    await api.patch('tutor_profiles','user_id',api.userId,{submitted_at:new Date().toISOString()});
    flash('Solicitud enviada. No implica aprobación automática ni autorización para trabajar con menores.');
    await loadTutor();
  }catch(e){onError(e);}
});
async function loadReviewQueue(){
  const profiles=await api.rows('tutor_profiles',{submitted_at:'not.is.null',order:'submitted_at.desc',limit:'30'});
  const statuses=await api.rows('tutor_verifications');
  const statusMap=new Map(statuses.map(x=>[x.tutor_id,x.status]));
  const list=$('staff-list');
  list.replaceChildren();
  if(!profiles.length) return list.append(text('p','No hay solicitudes enviadas.','hint'));
  for(const item of profiles){
    const card=text('div','', 'review-card');
    card.append(text('h4',item.professional_name),text('p','Estado: '+(statusMap.get(item.user_id)??'draft')+' · '+item.headline));
    const actions=text('div','', 'decision-actions');
    const inspect=text('button','Verificar expediente');
    inspect.addEventListener('click',()=>inspectTutor(item.user_id,card));
    actions.append(inspect);card.append(actions);list.append(card);
  }
}
async function inspectTutor(tutorId,card){
  try{
    const [docs,checks]=await Promise.all([
      api.rows('tutor_credentials',{tutor_id:'eq.'+tutorId}),
      api.rows('tutor_checks',{tutor_id:'eq.'+tutorId}),
    ]);
    const existing=card.querySelector('.review-extra');
    if(existing) existing.remove();
    const panel=text('div','', 'review-extra');
    panel.append(text('p','Acreditaciones: '+docs.length+' · Controles registrados: '+checks.length,'hint'));
    for(const doc of docs) {
      const row=text('div','', 'item');
      row.append(text('span',doc.qualification+' — '+doc.issuing_institution));
      const button=text('button','Registrar acreditación verificada');
      button.addEventListener('click',async()=>{
        const evidence_ticket=window.prompt('Ticket de evidencia interna (por ejemplo CRED-1234). No incluya datos personales.');
        if(!evidence_ticket) return;
        try{await api.reviewApplication('review_credential',{credential_id:doc.id,status:'verified',evidence_ticket:evidence_ticket.trim().toUpperCase()});flash('Documento marcado como verificado con ticket de revisión.');await inspectTutor(tutorId,card);}
        catch(e){onError(e);}
      });
      row.append(button);panel.append(row);
    }
    for(const checkType of ['identity','academic',...(staff?.staff_role==='admin'?['legal_eligibility','safeguarding_training']:[])]) {
      const button=text('button','Registrar control: '+checkType);
      button.addEventListener('click',async()=>{
        const evidence_ticket=window.prompt('Ticket del control '+checkType+' (por ejemplo CTRL-1234). Debe existir un procedimiento de verificación documentado.');
        if(!evidence_ticket) return;
        try {
          await api.reviewApplication('review_check',{tutor_id:tutorId,check_type:checkType,result:'passed',evidence_ticket:evidence_ticket.trim().toUpperCase()});
          flash('Control registrado con ticket de evidencia.'); await inspectTutor(tutorId,card);
        }catch(e){onError(e);}
      });
      panel.append(button);
    }
    const approveAdults=text('button','Aprobar solo adultos');
    approveAdults.addEventListener('click',async()=>{
      try{await api.reviewApplication('review_tutor',{tutor_id:tutorId,status:'approved_adults'});flash('Docente aprobado exclusivamente para estudiantes adultos.');await loadReviewQueue();}
      catch(e){onError(e);}
    });
    const reject=text('button','Rechazar');
    reject.addEventListener('click',async()=>{
      try{await api.reviewApplication('review_tutor',{tutor_id:tutorId,status:'rejected'});flash('Decisión de rechazo registrada.');await loadReviewQueue();}
      catch(e){onError(e);}
    });
    const buttons=text('div','', 'decision-actions');
    buttons.append(approveAdults);
    if(staff?.staff_role==='admin') {
      const approveMinors=text('button','Aprobar para menores (solo con 4 controles)');
      approveMinors.addEventListener('click',async()=>{
        if(!window.confirm('Confirme que completó de forma documentada todas las verificaciones legales, académicas y de protección aplicables.')) return;
        try { await api.reviewApplication('review_tutor',{tutor_id:tutorId,status:'approved_minors'});flash('Aprobación para menores registrada.');await loadReviewQueue();}
        catch(e){onError(e);}
      });
      buttons.append(approveMinors);
    }
    buttons.append(reject);
    panel.append(buttons);
    panel.append(text('p','Las aprobaciones para menores requieren controles adicionales; la aprobación solo para adultos no los autoriza.','hint'));
    card.append(panel);
  }catch(e){onError(e);}
}

async function loadGuardianReviewQueue() {
  const [learners,reviews]=await Promise.all([
    api.rows('learners',{order:'created_at.desc',limit:'30'}),
    api.rows('guardian_reviews')
  ]);
  const status=new Map(reviews.map(x=>[x.learner_id,x.status]));
  const list=$('guardian-review-list');
  list.replaceChildren();
  const pending=learners.filter(x=>status.get(x.id)==='pending');
  if(!pending.length) list.append(text('p','No hay representaciones pendientes en esta muestra.','hint'));
  for(const learner of pending){
    const card=text('div','', 'review-card');
    card.append(text('h4','Ficha privada: '+learner.nickname));
    card.append(text('p','Etapa y grado: '+learner.educational_stage+' · '+learner.grade_label));
    const approve=text('button','Registrar verificación de representación');
    approve.addEventListener('click',async()=>{
      const evidence_ticket=window.prompt('Ticket de expediente de representación validado de forma independiente (ej. GUARD-1234). No escriba nombres ni números de identidad.');
      if(!evidence_ticket) return;
      try {
        await api.reviewApplication('review_guardian',{learner_id:learner.id,status:'verified',evidence_ticket:evidence_ticket.trim().toUpperCase()});
        flash('Representación marcada como verificada por el equipo autorizado.');await loadGuardianReviewQueue();
      }catch(e){onError(e);}
    });
    const reject=text('button','Rechazar representación');
    reject.addEventListener('click',async()=>{
      const evidence_ticket=window.prompt('Ticket de decisión de rechazo (ej. GUARD-1234):');
      if(!evidence_ticket) return;
      try {
        await api.reviewApplication('review_guardian',{learner_id:learner.id,status:'rejected',evidence_ticket:evidence_ticket.trim().toUpperCase()});
        flash('Decisión de rechazo registrada.');await loadGuardianReviewQueue();
      }catch(e){onError(e);}
    });
    const actions=text('div','', 'decision-actions');
    actions.append(approve,reject);card.append(actions);list.append(card);
  }
}
