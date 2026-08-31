'use client';

import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  HeartPulse,
  Pill,
  Plus,
  ShieldCheck,
  Syringe,
  Trash2,
} from 'lucide-react';
import {
  EMPTY_NVET_PET_HEALTH_PROFILE,
  type NvetAllergySeverity,
  type NvetConditionStatus,
  type NvetPet,
  type NvetPetHealthProfileInput,
  type NvetPreventiveCareStatus,
  type NvetPreventiveCareType,
} from '@/lib/nvetcareapp/pet-health-contract';
import { nvetFetchWithRefresh } from '../../../nvet-fetch';

const inputClass =
  'mt-1.5 w-full rounded-xl border border-[#0D1B2A]/15 bg-white px-3 py-2.5 text-sm font-normal outline-none transition focus:border-[#34B27A] focus:ring-2 focus:ring-[#34B27A]/15';
const buttonClass =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-[#0D1B2A] px-3.5 py-2.5 text-xs font-bold text-white transition hover:bg-[#16293D] disabled:cursor-not-allowed disabled:opacity-50';

function formatDate(value?: string | null): string {
  if (!value) return 'Sin fecha';
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

function optional(value: string): string | undefined {
  const normalized = value.trim();
  return normalized || undefined;
}

function initialHealthProfile(pet: NvetPet): NvetPetHealthProfileInput {
  const health = pet.healthProfile;
  if (health?.schemaVersion === 1 && health.source === 'OWNER_REPORTED') {
    return {
      allergies: [...health.allergies],
      medications: [...health.medications],
      conditions: [...health.conditions],
      vaccinations: [...health.vaccinations],
      deworming: [...health.deworming],
      preventiveCare: [...health.preventiveCare],
    };
  }
  return {
    allergies: [...EMPTY_NVET_PET_HEALTH_PROFILE.allergies],
    medications: [...EMPTY_NVET_PET_HEALTH_PROFILE.medications],
    conditions: [...EMPTY_NVET_PET_HEALTH_PROFILE.conditions],
    vaccinations: [...EMPTY_NVET_PET_HEALTH_PROFILE.vaccinations],
    deworming: [...EMPTY_NVET_PET_HEALTH_PROFILE.deworming],
    preventiveCare: [...EMPTY_NVET_PET_HEALTH_PROFILE.preventiveCare],
  };
}

function Section({
  title,
  description,
  count,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  count: number;
  icon: typeof HeartPulse;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-[#0D1B2A]/10 bg-white p-5 shadow-[0_1px_3px_rgba(13,27,42,0.04)] sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#34B27A]/10 text-[#237754]">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-base font-bold text-[#0D1B2A]">{title}</h2>
            <p className="mt-1 text-xs leading-5 text-[#5B6670]">{description}</p>
          </div>
        </div>
        <span className="rounded-full border border-[#0D1B2A]/10 bg-[#F7F8FA] px-3 py-1 text-xs font-bold text-[#5B6670]">
          {count}
        </span>
      </div>
      {children}
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="rounded-2xl bg-[#F7F8FA] p-4 text-xs leading-5 text-[#5B6670]">{text}</p>;
}

function RemoveButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#0D1B2A]/10 text-[#5B6670] transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
      aria-label={label}
    >
      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
    </button>
  );
}

export function PetHealthRecordManager({ pet }: { pet: NvetPet }) {
  const [profile, setProfile] = useState<NvetPetHealthProfileInput>(() => initialHealthProfile(pet));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [updatedAt, setUpdatedAt] = useState(pet.healthProfileUpdatedAt ?? null);

  const [allergy, setAllergy] = useState({ substance: '', reaction: '', severity: 'MODERATE' as NvetAllergySeverity, notedAt: '' });
  const [medication, setMedication] = useState({ name: '', dosage: '', frequency: '', startedAt: '', endedAt: '', active: true, notes: '' });
  const [condition, setCondition] = useState({ name: '', diagnosedAt: '', status: 'ACTIVE' as NvetConditionStatus, notes: '' });
  const [vaccination, setVaccination] = useState({ vaccine: '', administeredAt: '', nextDueAt: '', batch: '', provider: '' });
  const [deworming, setDeworming] = useState({ product: '', administeredAt: '', nextDueAt: '', notes: '' });
  const [care, setCare] = useState({ type: 'CHECKUP' as NvetPreventiveCareType, title: '', dueAt: '', status: 'PENDING' as NvetPreventiveCareStatus, notes: '' });

  const activeMedications = profile.medications.filter((item) => item.active).length;
  const pendingCare = useMemo(
    () =>
      profile.preventiveCare
        .filter((item) => item.status === 'PENDING')
        .sort((a, b) => a.dueAt.localeCompare(b.dueAt)),
    [profile.preventiveCare],
  );
  const nextCare = pendingCare[0];
  const duePreventiveCount = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return [
      ...profile.vaccinations.flatMap((item) => (item.nextDueAt ? [item.nextDueAt] : [])),
      ...profile.deworming.flatMap((item) => (item.nextDueAt ? [item.nextDueAt] : [])),
      ...pendingCare.map((item) => item.dueAt),
    ].filter((date) => date <= today).length;
  }, [pendingCare, profile.deworming, profile.vaccinations]);

  function removeItem(section: keyof NvetPetHealthProfileInput, id: string) {
    setProfile((current) => ({
      ...current,
      [section]: (current[section] as Array<{ id: string }>).filter((item) => item.id !== id),
    }) as NvetPetHealthProfileInput);
    setSuccess('');
  }

  async function saveProfile() {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const response = await nvetFetchWithRefresh(`/api/nvetcareapp/client/pets/${pet.id}/health-profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      const payload = (await response.json().catch(() => null)) as NvetPet | { message?: string } | null;
      if (!response.ok) {
        setError(payload && 'message' in payload && payload.message ? payload.message : 'No se pudo guardar el expediente preventivo.');
        return;
      }
      const saved = payload as NvetPet;
      setProfile(initialHealthProfile(saved));
      setUpdatedAt(saved.healthProfileUpdatedAt ?? new Date().toISOString());
      setSuccess('Expediente preventivo sincronizado con Nvet Care.');
    } catch {
      setError('No se pudo sincronizar el expediente preventivo en este momento.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl bg-[#0D1B2A] p-6 text-white sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-[#8BE0B5]">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              <p className="text-[10px] font-bold uppercase tracking-[0.12em]">Información reportada por el cuidador</p>
            </div>
            <h2 className="mt-3 text-xl font-bold">Perfil preventivo de {pet.name}</h2>
            <p className="mt-2 text-sm leading-6 text-white/65">
              Registra antecedentes y prevención que conoces de tu mascota. Estos datos complementan, pero no reemplazan, diagnósticos y tratamientos documentados por un veterinario.
            </p>
            <p className="mt-3 text-xs text-white/45">
              {updatedAt ? `Última sincronización: ${new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(updatedAt))}` : 'Aún no existe un perfil preventivo sincronizado.'}
            </p>
          </div>
          <button
            type="button"
            onClick={saveProfile}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-[#34B27A] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#289463] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            {saving ? 'Guardando...' : 'Guardar expediente'}
          </button>
        </div>
      </section>

      {error && <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {success && <p role="status" className="rounded-2xl border border-[#34B27A]/20 bg-[#34B27A]/10 px-4 py-3 text-sm text-[#237754]">{success}</p>}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-[#0D1B2A]/10 bg-white p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#5B6670]">Alergias reportadas</p>
          <p className="mt-2 text-2xl font-bold text-[#0D1B2A]">{profile.allergies.length}</p>
        </article>
        <article className="rounded-2xl border border-[#0D1B2A]/10 bg-white p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#5B6670]">Medicamentos activos</p>
          <p className="mt-2 text-2xl font-bold text-[#0D1B2A]">{activeMedications}</p>
        </article>
        <article className="rounded-2xl border border-[#0D1B2A]/10 bg-white p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#5B6670]">Vacunas registradas</p>
          <p className="mt-2 text-2xl font-bold text-[#0D1B2A]">{profile.vaccinations.length}</p>
        </article>
        <article className="rounded-2xl border border-[#0D1B2A]/10 bg-white p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#5B6670]">Acciones vencidas</p>
          <p className={`mt-2 text-2xl font-bold ${duePreventiveCount ? 'text-[#B95A1D]' : 'text-[#0D1B2A]'}`}>{duePreventiveCount}</p>
          <p className="mt-1 text-[11px] text-[#5B6670]">{nextCare ? `Próxima: ${formatDate(nextCare.dueAt)}` : 'Sin controles pendientes'}</p>
        </article>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <Section title="Alergias" description="Sustancias y reacciones que conoces de tu mascota." count={profile.allergies.length} icon={AlertTriangle}>
          <div className="space-y-3">
            {profile.allergies.length === 0 ? <EmptyState text="No hay alergias reportadas." /> : profile.allergies.map((item) => (
              <article key={item.id} className="flex items-start justify-between gap-3 rounded-2xl border border-[#0D1B2A]/10 p-4">
                <div>
                  <p className="text-sm font-bold text-[#0D1B2A]">{item.substance}</p>
                  <p className="mt-1 text-xs text-[#5B6670]">Severidad: {item.severity} {item.reaction ? `· ${item.reaction}` : ''}</p>
                  {item.notedAt && <p className="mt-1 text-[11px] text-[#5B6670]">Observada: {formatDate(item.notedAt)}</p>}
                </div>
                <RemoveButton onClick={() => removeItem('allergies', item.id)} label={`Eliminar alergia ${item.substance}`} />
              </article>
            ))}
          </div>
          <details className="mt-4 rounded-2xl border border-dashed border-[#34B27A]/30 bg-[#34B27A]/[0.03] p-4">
            <summary className="cursor-pointer text-xs font-bold text-[#237754]">+ Agregar alergia</summary>
            <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={(event) => {
              event.preventDefault();
              if (!allergy.substance.trim()) return;
              setProfile((current) => ({ ...current, allergies: [...current.allergies, { id: crypto.randomUUID(), substance: allergy.substance.trim(), severity: allergy.severity, ...(optional(allergy.reaction) ? { reaction: optional(allergy.reaction) } : {}), ...(allergy.notedAt ? { notedAt: allergy.notedAt } : {}) }] }));
              setAllergy({ substance: '', reaction: '', severity: 'MODERATE', notedAt: '' });
            }}>
              <label className="text-xs font-semibold text-[#0D1B2A]">Sustancia<input className={inputClass} value={allergy.substance} onChange={(e) => setAllergy((v) => ({ ...v, substance: e.target.value }))} maxLength={100} required /></label>
              <label className="text-xs font-semibold text-[#0D1B2A]">Severidad<select className={inputClass} value={allergy.severity} onChange={(e) => setAllergy((v) => ({ ...v, severity: e.target.value as NvetAllergySeverity }))}><option value="MILD">Leve</option><option value="MODERATE">Moderada</option><option value="SEVERE">Severa</option></select></label>
              <label className="text-xs font-semibold text-[#0D1B2A]">Reacción<input className={inputClass} value={allergy.reaction} onChange={(e) => setAllergy((v) => ({ ...v, reaction: e.target.value }))} maxLength={250} /></label>
              <label className="text-xs font-semibold text-[#0D1B2A]">Fecha observada<input type="date" className={inputClass} value={allergy.notedAt} onChange={(e) => setAllergy((v) => ({ ...v, notedAt: e.target.value }))} /></label>
              <button className={buttonClass} type="submit"><Plus className="h-3.5 w-3.5" />Agregar</button>
            </form>
          </details>
        </Section>

        <Section title="Medicamentos" description="Medicamentos o suplementos que recibe actualmente o recibió antes." count={profile.medications.length} icon={Pill}>
          <div className="space-y-3">
            {profile.medications.length === 0 ? <EmptyState text="No hay medicamentos reportados." /> : profile.medications.map((item) => (
              <article key={item.id} className="rounded-2xl border border-[#0D1B2A]/10 p-4">
                <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-bold text-[#0D1B2A]">{item.name}</p><p className="mt-1 text-xs text-[#5B6670]">{item.dosage || 'Dosis no indicada'} {item.frequency ? `· ${item.frequency}` : ''}</p></div><RemoveButton onClick={() => removeItem('medications', item.id)} label={`Eliminar medicamento ${item.name}`} /></div>
                <div className="mt-3 flex flex-wrap items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${item.active ? 'bg-[#34B27A]/10 text-[#237754]' : 'bg-[#0D1B2A]/5 text-[#5B6670]'}`}>{item.active ? 'Activo' : 'Finalizado'}</span><button type="button" className="text-[11px] font-bold text-[#237754]" onClick={() => setProfile((current) => ({ ...current, medications: current.medications.map((entry) => entry.id === item.id ? { ...entry, active: !entry.active } : entry) }))}>{item.active ? 'Marcar finalizado' : 'Reactivar'}</button></div>
              </article>
            ))}
          </div>
          <details className="mt-4 rounded-2xl border border-dashed border-[#34B27A]/30 bg-[#34B27A]/[0.03] p-4">
            <summary className="cursor-pointer text-xs font-bold text-[#237754]">+ Agregar medicamento</summary>
            <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={(event) => {
              event.preventDefault(); if (!medication.name.trim()) return;
              setProfile((current) => ({ ...current, medications: [...current.medications, { id: crypto.randomUUID(), name: medication.name.trim(), active: medication.active, ...(optional(medication.dosage) ? { dosage: optional(medication.dosage) } : {}), ...(optional(medication.frequency) ? { frequency: optional(medication.frequency) } : {}), ...(medication.startedAt ? { startedAt: medication.startedAt } : {}), ...(medication.endedAt ? { endedAt: medication.endedAt } : {}), ...(optional(medication.notes) ? { notes: optional(medication.notes) } : {}) }] }));
              setMedication({ name: '', dosage: '', frequency: '', startedAt: '', endedAt: '', active: true, notes: '' });
            }}>
              <label className="text-xs font-semibold text-[#0D1B2A]">Nombre<input className={inputClass} value={medication.name} onChange={(e) => setMedication((v) => ({ ...v, name: e.target.value }))} required maxLength={120} /></label>
              <label className="text-xs font-semibold text-[#0D1B2A]">Dosis<input className={inputClass} value={medication.dosage} onChange={(e) => setMedication((v) => ({ ...v, dosage: e.target.value }))} maxLength={120} /></label>
              <label className="text-xs font-semibold text-[#0D1B2A]">Frecuencia<input className={inputClass} value={medication.frequency} onChange={(e) => setMedication((v) => ({ ...v, frequency: e.target.value }))} maxLength={120} /></label>
              <label className="text-xs font-semibold text-[#0D1B2A]">Inicio<input type="date" className={inputClass} value={medication.startedAt} onChange={(e) => setMedication((v) => ({ ...v, startedAt: e.target.value }))} /></label>
              <label className="text-xs font-semibold text-[#0D1B2A]">Fin<input type="date" className={inputClass} value={medication.endedAt} onChange={(e) => setMedication((v) => ({ ...v, endedAt: e.target.value }))} /></label>
              <label className="flex items-center gap-2 pt-6 text-xs font-semibold text-[#0D1B2A]"><input type="checkbox" checked={medication.active} onChange={(e) => setMedication((v) => ({ ...v, active: e.target.checked }))} />Actualmente activo</label>
              <label className="sm:col-span-2 text-xs font-semibold text-[#0D1B2A]">Notas<input className={inputClass} value={medication.notes} onChange={(e) => setMedication((v) => ({ ...v, notes: e.target.value }))} maxLength={300} /></label>
              <button className={buttonClass} type="submit"><Plus className="h-3.5 w-3.5" />Agregar</button>
            </form>
          </details>
        </Section>

        <Section title="Antecedentes y condiciones" description="Condiciones conocidas. El nombre aquí es reportado por el cuidador, no un nuevo diagnóstico clínico." count={profile.conditions.length} icon={HeartPulse}>
          <div className="space-y-3">
            {profile.conditions.length === 0 ? <EmptyState text="No hay antecedentes reportados." /> : profile.conditions.map((item) => (
              <article key={item.id} className="rounded-2xl border border-[#0D1B2A]/10 p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-bold text-[#0D1B2A]">{item.name}</p><p className="mt-1 text-xs text-[#5B6670]">Estado: {item.status}{item.diagnosedAt ? ` · ${formatDate(item.diagnosedAt)}` : ''}</p>{item.notes && <p className="mt-2 text-xs leading-5 text-[#5B6670]">{item.notes}</p>}</div><RemoveButton onClick={() => removeItem('conditions', item.id)} label={`Eliminar antecedente ${item.name}`} /></div>{item.status === 'ACTIVE' && <button type="button" className="mt-3 text-[11px] font-bold text-[#237754]" onClick={() => setProfile((current) => ({ ...current, conditions: current.conditions.map((entry) => entry.id === item.id ? { ...entry, status: 'RESOLVED' } : entry) }))}>Marcar resuelto</button>}</article>
            ))}
          </div>
          <details className="mt-4 rounded-2xl border border-dashed border-[#34B27A]/30 bg-[#34B27A]/[0.03] p-4"><summary className="cursor-pointer text-xs font-bold text-[#237754]">+ Agregar antecedente</summary><form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); if (!condition.name.trim()) return; setProfile((current) => ({ ...current, conditions: [...current.conditions, { id: crypto.randomUUID(), name: condition.name.trim(), status: condition.status, ...(condition.diagnosedAt ? { diagnosedAt: condition.diagnosedAt } : {}), ...(optional(condition.notes) ? { notes: optional(condition.notes) } : {}) }] })); setCondition({ name: '', diagnosedAt: '', status: 'ACTIVE', notes: '' }); }}><label className="text-xs font-semibold text-[#0D1B2A]">Condición<input className={inputClass} value={condition.name} onChange={(e) => setCondition((v) => ({ ...v, name: e.target.value }))} required maxLength={120} /></label><label className="text-xs font-semibold text-[#0D1B2A]">Estado<select className={inputClass} value={condition.status} onChange={(e) => setCondition((v) => ({ ...v, status: e.target.value as NvetConditionStatus }))}><option value="ACTIVE">Activa</option><option value="RESOLVED">Resuelta</option><option value="UNKNOWN">Sin confirmar</option></select></label><label className="text-xs font-semibold text-[#0D1B2A]">Fecha conocida<input type="date" className={inputClass} value={condition.diagnosedAt} onChange={(e) => setCondition((v) => ({ ...v, diagnosedAt: e.target.value }))} /></label><label className="text-xs font-semibold text-[#0D1B2A]">Notas<input className={inputClass} value={condition.notes} onChange={(e) => setCondition((v) => ({ ...v, notes: e.target.value }))} maxLength={300} /></label><button className={buttonClass} type="submit"><Plus className="h-3.5 w-3.5" />Agregar</button></form></details>
        </Section>

        <Section title="Vacunación" description="Trazabilidad de vacunas aplicadas y próximas fechas conocidas." count={profile.vaccinations.length} icon={Syringe}>
          <div className="space-y-3">{profile.vaccinations.length === 0 ? <EmptyState text="No hay vacunas registradas." /> : [...profile.vaccinations].sort((a, b) => b.administeredAt.localeCompare(a.administeredAt)).map((item) => <article key={item.id} className="flex items-start justify-between gap-3 rounded-2xl border border-[#0D1B2A]/10 p-4"><div><p className="text-sm font-bold text-[#0D1B2A]">{item.vaccine}</p><p className="mt-1 text-xs text-[#5B6670]">Aplicada: {formatDate(item.administeredAt)}</p><p className="mt-1 text-xs text-[#237754]">{item.nextDueAt ? `Próxima: ${formatDate(item.nextDueAt)}` : 'Próxima fecha no registrada'}</p>{item.provider && <p className="mt-1 text-[11px] text-[#5B6670]">Proveedor: {item.provider}</p>}</div><RemoveButton onClick={() => removeItem('vaccinations', item.id)} label={`Eliminar vacuna ${item.vaccine}`} /></article>)}</div>
          <details className="mt-4 rounded-2xl border border-dashed border-[#34B27A]/30 bg-[#34B27A]/[0.03] p-4"><summary className="cursor-pointer text-xs font-bold text-[#237754]">+ Registrar vacuna</summary><form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); if (!vaccination.vaccine.trim() || !vaccination.administeredAt) return; setProfile((current) => ({ ...current, vaccinations: [...current.vaccinations, { id: crypto.randomUUID(), vaccine: vaccination.vaccine.trim(), administeredAt: vaccination.administeredAt, ...(vaccination.nextDueAt ? { nextDueAt: vaccination.nextDueAt } : {}), ...(optional(vaccination.batch) ? { batch: optional(vaccination.batch) } : {}), ...(optional(vaccination.provider) ? { provider: optional(vaccination.provider) } : {}) }] })); setVaccination({ vaccine: '', administeredAt: '', nextDueAt: '', batch: '', provider: '' }); }}><label className="text-xs font-semibold text-[#0D1B2A]">Vacuna<input className={inputClass} value={vaccination.vaccine} onChange={(e) => setVaccination((v) => ({ ...v, vaccine: e.target.value }))} required maxLength={120} /></label><label className="text-xs font-semibold text-[#0D1B2A]">Aplicación<input type="date" className={inputClass} value={vaccination.administeredAt} onChange={(e) => setVaccination((v) => ({ ...v, administeredAt: e.target.value }))} required /></label><label className="text-xs font-semibold text-[#0D1B2A]">Próxima dosis<input type="date" className={inputClass} value={vaccination.nextDueAt} onChange={(e) => setVaccination((v) => ({ ...v, nextDueAt: e.target.value }))} /></label><label className="text-xs font-semibold text-[#0D1B2A]">Proveedor<input className={inputClass} value={vaccination.provider} onChange={(e) => setVaccination((v) => ({ ...v, provider: e.target.value }))} maxLength={120} /></label><label className="text-xs font-semibold text-[#0D1B2A]">Lote<input className={inputClass} value={vaccination.batch} onChange={(e) => setVaccination((v) => ({ ...v, batch: e.target.value }))} maxLength={80} /></label><button className={buttonClass} type="submit"><Plus className="h-3.5 w-3.5" />Agregar</button></form></details>
        </Section>

        <Section title="Desparasitación" description="Productos administrados y próximos refuerzos conocidos." count={profile.deworming.length} icon={ShieldCheck}>
          <div className="space-y-3">{profile.deworming.length === 0 ? <EmptyState text="No hay desparasitaciones registradas." /> : [...profile.deworming].sort((a, b) => b.administeredAt.localeCompare(a.administeredAt)).map((item) => <article key={item.id} className="flex items-start justify-between gap-3 rounded-2xl border border-[#0D1B2A]/10 p-4"><div><p className="text-sm font-bold text-[#0D1B2A]">{item.product}</p><p className="mt-1 text-xs text-[#5B6670]">Administrado: {formatDate(item.administeredAt)}</p><p className="mt-1 text-xs text-[#237754]">{item.nextDueAt ? `Próxima: ${formatDate(item.nextDueAt)}` : 'Próxima fecha no registrada'}</p></div><RemoveButton onClick={() => removeItem('deworming', item.id)} label={`Eliminar desparasitación ${item.product}`} /></article>)}</div>
          <details className="mt-4 rounded-2xl border border-dashed border-[#34B27A]/30 bg-[#34B27A]/[0.03] p-4"><summary className="cursor-pointer text-xs font-bold text-[#237754]">+ Registrar desparasitación</summary><form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); if (!deworming.product.trim() || !deworming.administeredAt) return; setProfile((current) => ({ ...current, deworming: [...current.deworming, { id: crypto.randomUUID(), product: deworming.product.trim(), administeredAt: deworming.administeredAt, ...(deworming.nextDueAt ? { nextDueAt: deworming.nextDueAt } : {}), ...(optional(deworming.notes) ? { notes: optional(deworming.notes) } : {}) }] })); setDeworming({ product: '', administeredAt: '', nextDueAt: '', notes: '' }); }}><label className="text-xs font-semibold text-[#0D1B2A]">Producto<input className={inputClass} value={deworming.product} onChange={(e) => setDeworming((v) => ({ ...v, product: e.target.value }))} required maxLength={120} /></label><label className="text-xs font-semibold text-[#0D1B2A]">Administración<input type="date" className={inputClass} value={deworming.administeredAt} onChange={(e) => setDeworming((v) => ({ ...v, administeredAt: e.target.value }))} required /></label><label className="text-xs font-semibold text-[#0D1B2A]">Próxima dosis<input type="date" className={inputClass} value={deworming.nextDueAt} onChange={(e) => setDeworming((v) => ({ ...v, nextDueAt: e.target.value }))} /></label><label className="text-xs font-semibold text-[#0D1B2A]">Notas<input className={inputClass} value={deworming.notes} onChange={(e) => setDeworming((v) => ({ ...v, notes: e.target.value }))} maxLength={300} /></label><button className={buttonClass} type="submit"><Plus className="h-3.5 w-3.5" />Agregar</button></form></details>
        </Section>

        <Section title="Próximos controles" description="Agenda preventiva que puedes preparar incluso antes de tener un veterinario asignado." count={profile.preventiveCare.length} icon={CalendarClock}>
          <div className="space-y-3">{profile.preventiveCare.length === 0 ? <EmptyState text="No hay controles preventivos registrados." /> : [...profile.preventiveCare].sort((a, b) => a.dueAt.localeCompare(b.dueAt)).map((item) => <article key={item.id} className="rounded-2xl border border-[#0D1B2A]/10 p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-bold text-[#0D1B2A]">{item.title}</p><p className="mt-1 text-xs text-[#5B6670]">{item.type} · {formatDate(item.dueAt)}</p>{item.notes && <p className="mt-2 text-xs leading-5 text-[#5B6670]">{item.notes}</p>}</div><RemoveButton onClick={() => removeItem('preventiveCare', item.id)} label={`Eliminar control ${item.title}`} /></div><div className="mt-3 flex items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${item.status === 'PENDING' ? 'bg-[#FF8A3D]/10 text-[#A6531B]' : item.status === 'COMPLETED' ? 'bg-[#34B27A]/10 text-[#237754]' : 'bg-[#0D1B2A]/5 text-[#5B6670]'}`}>{item.status}</span>{item.status === 'PENDING' && <button type="button" className="text-[11px] font-bold text-[#237754]" onClick={() => setProfile((current) => ({ ...current, preventiveCare: current.preventiveCare.map((entry) => entry.id === item.id ? { ...entry, status: 'COMPLETED' } : entry) }))}>Marcar completado</button>}</div></article>)}</div>
          <details className="mt-4 rounded-2xl border border-dashed border-[#34B27A]/30 bg-[#34B27A]/[0.03] p-4"><summary className="cursor-pointer text-xs font-bold text-[#237754]">+ Agregar control</summary><form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); if (!care.title.trim() || !care.dueAt) return; setProfile((current) => ({ ...current, preventiveCare: [...current.preventiveCare, { id: crypto.randomUUID(), type: care.type, title: care.title.trim(), dueAt: care.dueAt, status: care.status, ...(optional(care.notes) ? { notes: optional(care.notes) } : {}) }] })); setCare({ type: 'CHECKUP', title: '', dueAt: '', status: 'PENDING', notes: '' }); }}><label className="text-xs font-semibold text-[#0D1B2A]">Tipo<select className={inputClass} value={care.type} onChange={(e) => setCare((v) => ({ ...v, type: e.target.value as NvetPreventiveCareType }))}><option value="CHECKUP">Control general</option><option value="VACCINATION">Vacunación</option><option value="DEWORMING">Desparasitación</option><option value="DENTAL">Dental</option><option value="LAB">Laboratorio</option><option value="OTHER">Otro</option></select></label><label className="text-xs font-semibold text-[#0D1B2A]">Nombre<input className={inputClass} value={care.title} onChange={(e) => setCare((v) => ({ ...v, title: e.target.value }))} required maxLength={120} /></label><label className="text-xs font-semibold text-[#0D1B2A]">Fecha prevista<input type="date" className={inputClass} value={care.dueAt} onChange={(e) => setCare((v) => ({ ...v, dueAt: e.target.value }))} required /></label><label className="text-xs font-semibold text-[#0D1B2A]">Estado<select className={inputClass} value={care.status} onChange={(e) => setCare((v) => ({ ...v, status: e.target.value as NvetPreventiveCareStatus }))}><option value="PENDING">Pendiente</option><option value="COMPLETED">Completado</option><option value="CANCELLED">Cancelado</option></select></label><label className="sm:col-span-2 text-xs font-semibold text-[#0D1B2A]">Notas<input className={inputClass} value={care.notes} onChange={(e) => setCare((v) => ({ ...v, notes: e.target.value }))} maxLength={300} /></label><button className={buttonClass} type="submit"><Plus className="h-3.5 w-3.5" />Agregar</button></form></details>
        </Section>
      </div>
    </div>
  );
}
