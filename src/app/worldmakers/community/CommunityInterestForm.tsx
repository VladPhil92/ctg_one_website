'use client';

import { FormEvent, useMemo, useState } from 'react';
import { CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';
import {
  WORLDMAKERS_AUDIENCES,
  WORLDMAKERS_AUDIENCE_LABELS,
  type WorldMakersAudience,
} from '@/lib/worldmakers/community';
import styles from './community.module.css';

type Props = {
  initialAudience: WorldMakersAudience;
};

type FormState = {
  displayName: string;
  email: string;
  audience: WorldMakersAudience;
  wantsProductUpdates: boolean;
  wantsPlaytesting: boolean;
  wantsEducatorPilot: boolean;
  wantsFamilyResearch: boolean;
  adultConfirmed: boolean;
  privacyConsent: boolean;
  website: string;
};

const initialPreferences: Pick<FormState, 'wantsProductUpdates' | 'wantsPlaytesting' | 'wantsEducatorPilot' | 'wantsFamilyResearch'> = {
  wantsProductUpdates: true,
  wantsPlaytesting: false,
  wantsEducatorPilot: false,
  wantsFamilyResearch: false,
};

function emptyForm(initialAudience: WorldMakersAudience): FormState {
  return {
    displayName: '',
    email: '',
    audience: initialAudience,
    ...initialPreferences,
    adultConfirmed: false,
    privacyConsent: false,
    website: '',
  };
}

export default function CommunityInterestForm({ initialAudience }: Props) {
  const [form, setForm] = useState<FormState>(() => emptyForm(initialAudience));
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const hasPreference = useMemo(
    () => form.wantsProductUpdates || form.wantsPlaytesting || form.wantsEducatorPilot || form.wantsFamilyResearch,
    [form.wantsProductUpdates, form.wantsPlaytesting, form.wantsEducatorPilot, form.wantsFamilyResearch],
  );

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hasPreference || !form.adultConfirmed || !form.privacyConsent) {
      setStatus('error');
      setMessage('Selecciona al menos un interés y confirma las condiciones de privacidad y mayoría de edad.');
      return;
    }

    setStatus('submitting');
    setMessage('');

    try {
      const response = await fetch('/api/worldmakers/interest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, sourcePath: '/community' }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || payload.accepted !== true) {
        throw new Error(typeof payload.error === 'string' ? payload.error : 'No fue posible completar el registro.');
      }

      setStatus('success');
      setMessage('Solicitud recibida. Por seguridad no confirmamos si este correo ya existía. Un envío repetido no modifica ni reactiva un perfil previo; cualquier cambio futuro requerirá verificación de control del correo.');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'No fue posible completar el registro.');
    }
  }

  function resetForAnotherRegistration() {
    setForm(emptyForm(initialAudience));
    setMessage('');
    setStatus('idle');
  }

  if (status === 'success') {
    return (
      <div className={styles.successCard} role="status">
        <CheckCircle2 size={34} aria-hidden="true" />
        <h3>Solicitud recibida.</h3>
        <p>{message}</p>
        <button type="button" onClick={resetForAnotherRegistration}>Registrar otro correo</button>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <div className={styles.formHeader}>
        <span><ShieldCheck size={18} aria-hidden="true" /> Registro adulto y privacidad minimizada</span>
        <p>No solicites ni ingreses datos personales de niños. Este formulario está destinado a adultos responsables, educadores, investigadores, desarrolladores y testers mayores de 18 años.</p>
      </div>

      <div className={styles.twoColumns}>
        <label>
          <span>Nombre o identificación profesional <small>opcional</small></span>
          <input
            type="text"
            autoComplete="name"
            maxLength={80}
            value={form.displayName}
            onChange={(event) => set('displayName', event.target.value)}
            placeholder="Ej. Ana Martínez / Colegio Horizonte"
          />
        </label>
        <label>
          <span>Correo electrónico</span>
          <input
            required
            type="email"
            autoComplete="email"
            maxLength={254}
            value={form.email}
            onChange={(event) => set('email', event.target.value)}
            placeholder="tu@correo.com"
          />
        </label>
      </div>

      <label>
        <span>¿Desde qué rol te interesa World Makers?</span>
        <select value={form.audience} onChange={(event) => set('audience', event.target.value as WorldMakersAudience)}>
          {WORLDMAKERS_AUDIENCES.map((audience) => (
            <option key={audience} value={audience}>{WORLDMAKERS_AUDIENCE_LABELS[audience]}</option>
          ))}
        </select>
      </label>

      <fieldset className={styles.preferences}>
        <legend>Elige qué quieres recibir o explorar</legend>
        <label><input type="checkbox" checked={form.wantsProductUpdates} onChange={(event) => set('wantsProductUpdates', event.target.checked)} /><span><strong>Actualizaciones de producto</strong><small>Hitos públicos, novedades del desarrollo y disponibilidad futura.</small></span></label>
        <label><input type="checkbox" checked={form.wantsPlaytesting} onChange={(event) => set('wantsPlaytesting', event.target.checked)} /><span><strong>Pruebas controladas</strong><small>Interés en participar como tester adulto cuando exista una build elegible.</small></span></label>
        <label><input type="checkbox" checked={form.wantsEducatorPilot} onChange={(event) => set('wantsEducatorPilot', event.target.checked)} /><span><strong>Pilotos educativos</strong><small>Revisión pedagógica, instituciones, docentes y escenarios de aula.</small></span></label>
        <label><input type="checkbox" checked={form.wantsFamilyResearch} onChange={(event) => set('wantsFamilyResearch', event.target.checked)} /><span><strong>Investigación con familias</strong><small>Seguridad, privacidad, Parent Portal y comprensión del producto.</small></span></label>
      </fieldset>

      <div className={styles.consentBox}>
        <label><input type="checkbox" checked={form.adultConfirmed} onChange={(event) => set('adultConfirmed', event.target.checked)} /><span>Confirmo que tengo 18 años o más y que no estoy registrando datos personales de un menor.</span></label>
        <label><input type="checkbox" checked={form.privacyConsent} onChange={(event) => set('privacyConsent', event.target.checked)} /><span>Acepto que CTG One Technology use estos datos para gestionar mi interés en World Makers y las preferencias seleccionadas. Puedo solicitar retiro o corrección escribiendo a direccion@ctgone.com.</span></label>
      </div>

      <div className={styles.honeypot} aria-hidden="true">
        <label>Website<input tabIndex={-1} autoComplete="off" value={form.website} onChange={(event) => set('website', event.target.value)} /></label>
      </div>

      {status === 'error' && <p className={styles.error} role="alert">{message}</p>}

      <button className={styles.submit} type="submit" disabled={status === 'submitting'}>
        {status === 'submitting' ? <><Loader2 className={styles.spin} size={18} /> Registrando…</> : 'Registrar mi interés'}
      </button>
      <p className={styles.finePrint}>El registro no garantiza selección, invitación ni fecha de acceso. World Makers mantiene separados este registro adulto y cualquier identidad infantil futura del videojuego.</p>
    </form>
  );
}
