'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useMemo, useState, useTransition } from 'react';
import type {
  NvetBetaEvidenceRecord,
  NvetBetaOperationsSnapshot,
} from '@/lib/nvetcareapp/beta-types';
import { nvetFetchWithRefresh } from '../nvet-fetch';

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100';
const buttonClass =
  'rounded-xl bg-[#0D1B2A] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#16283d] disabled:cursor-not-allowed disabled:opacity-50';
const dangerButtonClass =
  'rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50';
const successButtonClass =
  'rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50';

function localDateTimeValue(date = new Date()) {
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return shifted.toISOString().slice(0, 16);
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed);
}

function badgeClass(status: string) {
  const normalized = status.toUpperCase();
  if (['VERIFIED', 'APPROVED', 'ACTIVE', 'READY-TO-ENABLE'].includes(normalized)) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  }
  if (['CONFLICTED', 'MISCONFIGURED', 'REJECTED'].includes(normalized)) {
    return 'border-red-200 bg-red-50 text-red-800';
  }
  if (['EXPIRED', 'REVOKED', 'PAUSED'].includes(normalized)) {
    return 'border-amber-200 bg-amber-50 text-amber-800';
  }
  return 'border-slate-200 bg-slate-50 text-slate-700';
}

function StatusBadge({ value }: { value: string }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${badgeClass(value)}`}>
      {value}
    </span>
  );
}

async function readMessage(response: Response) {
  try {
    const payload = (await response.json()) as { message?: string; error?: string };
    return payload.message || payload.error || `Error ${response.status}`;
  } catch {
    return `Error ${response.status}`;
  }
}

export function BetaOperationsPanel({ snapshot }: { snapshot: NvetBetaOperationsSnapshot }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteReason, setInviteReason] = useState('');
  const [activationHours, setActivationHours] = useState('24');
  const [activationReason, setActivationReason] = useState('');
  const [gate, setGate] = useState(snapshot.evidenceSummary.gates[0]?.gate ?? '');
  const [environment, setEnvironment] = useState<'production' | 'staging'>('production');
  const [reference, setReference] = useState('');
  const [observedAt, setObservedAt] = useState(localDateTimeValue());
  const [expiresAt, setExpiresAt] = useState('');
  const [evidenceNote, setEvidenceNote] = useState('');

  const readiness = snapshot.readiness;
  const cohort = snapshot.cohort;
  const activation = snapshot.activation;
  const summary = snapshot.evidenceSummary;
  const history = snapshot.evidenceHistory;

  const progress = useMemo(() => {
    if (!summary.totalGates) return 0;
    return Math.round((summary.verifiedGates / summary.totalGates) * 100);
  }, [summary.totalGates, summary.verifiedGates]);

  async function mutate(path: string, payload: Record<string, unknown>, successMessage: string) {
    setFeedback(null);
    const response = await nvetFetchWithRefresh(`/api/nvetcareapp/admin/beta/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      setFeedback(await readMessage(response));
      return false;
    }

    setFeedback(successMessage);
    startTransition(() => router.refresh());
    return true;
  }

  async function handleInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = inviteEmail.trim().toLowerCase();
    if (!email) return;
    const ok = await mutate(
      'cohort/invite',
      { email, ...(inviteReason.trim() ? { reason: inviteReason.trim() } : {}) },
      `Invitación beta registrada para ${email}.`,
    );
    if (ok) {
      setInviteEmail('');
      setInviteReason('');
    }
  }

  async function revokeMember(userId: string, email: string | null) {
    const reason = window.prompt(`Motivo para revocar a ${email || userId}:`);
    if (!reason || reason.trim().length < 3) return;
    if (!window.confirm('Esta acción revoca la membresía beta mediante un evento append-only. ¿Continuar?')) return;
    await mutate(`cohort/${encodeURIComponent(userId)}/revoke`, { reason: reason.trim() }, 'Membresía beta revocada.');
  }

  async function authorizeActivation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const durationHours = Number(activationHours);
    if (!Number.isInteger(durationHours) || durationHours < 1 || durationHours > 168) {
      setFeedback('La autorización debe durar entre 1 y 168 horas.');
      return;
    }
    if (!window.confirm('Nvet revalidará todos los gates antes de emitir la autorización. ¿Continuar?')) return;
    await mutate(
      'activation/authorize',
      {
        durationHours,
        ...(activationReason.trim() ? { reason: activationReason.trim() } : {}),
      },
      'Autorización operacional emitida.',
    );
  }

  async function revokeActivation() {
    const reason = window.prompt('Motivo de revocación de la autorización operacional:');
    if (!reason?.trim()) return;
    if (!window.confirm('La revocación bloqueará nuevas reservas beta que requieran autorización activa. ¿Continuar?')) return;
    await mutate('activation/revoke', { reason: reason.trim() }, 'Autorización operacional revocada.');
  }

  async function submitEvidence(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!gate || reference.trim().length < 3 || !observedAt) return;

    const payload: Record<string, unknown> = {
      gate,
      environment,
      reference: reference.trim(),
      observedAt: new Date(observedAt).toISOString(),
    };
    if (expiresAt) payload.expiresAt = new Date(expiresAt).toISOString();
    if (evidenceNote.trim()) payload.note = evidenceNote.trim();

    const ok = await mutate('evidence', payload, 'Evidencia registrada como pendiente de decisión.');
    if (ok) {
      setReference('');
      setEvidenceNote('');
      setExpiresAt('');
      setObservedAt(localDateTimeValue());
    }
  }

  async function decideEvidence(record: NvetBetaEvidenceRecord, action: 'approve' | 'reject' | 'revoke') {
    const label = action === 'approve' ? 'aprobar' : action === 'reject' ? 'rechazar' : 'revocar';
    const reason = window.prompt(`Motivo opcional para ${label} evidencia ${record.evidenceId.slice(0, 8)}:`) ?? '';
    if (!window.confirm(`¿Confirmas ${label} esta evidencia? La decisión se registra en el ledger append-only.`)) return;
    await mutate(`evidence/${encodeURIComponent(record.evidenceId)}/${action}`, reason.trim() ? { reason: reason.trim() } : {}, `Evidencia ${label === 'aprobar' ? 'aprobada' : label === 'rechazar' ? 'rechazada' : 'revocada'}.`);
  }

  return (
    <div className="space-y-6">
      {feedback && (
        <div role="status" className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-medium text-sky-900">
          {feedback}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">Estado operacional</p>
          <div className="mt-3"><StatusBadge value={readiness.activation.state} /></div>
          <p className="mt-3 text-sm text-slate-600">Booking: <strong>{readiness.runtime.bookingEnabled ? 'ON' : 'OFF'}</strong> · Beta provider: <strong>{readiness.runtime.closedBetaEnabled ? 'ON' : 'OFF'}</strong></p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">Evidencia producción</p>
          <p className="mt-2 text-3xl font-black text-[#0D1B2A]">{progress}%</p>
          <p className="mt-1 text-sm text-slate-600">{summary.verifiedGates}/{summary.totalGates} gates verificados</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">Cohorte</p>
          <p className="mt-2 text-3xl font-black text-[#0D1B2A]">{cohort.activeMemberships}/{cohort.maxInitialClients}</p>
          <p className="mt-1 text-sm text-slate-600">{cohort.eligibleActiveMembers} elegibles · {cohort.remainingSlots} cupos</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">Cobertura Cartagena</p>
          <p className="mt-2 text-3xl font-black text-[#0D1B2A]">{readiness.vetCoverage.verifiedActiveVets}/{readiness.vetCoverage.minimumRequired}</p>
          <p className="mt-1 text-sm text-slate-600">Veterinarios verificados y activos</p>
        </article>
      </section>

      {readiness.activation.blockingReasons.length > 0 && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="font-bold text-amber-950">Blockers activos</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {readiness.activation.blockingReasons.map((reason) => <StatusBadge key={reason} value={reason} />)}
          </div>
        </section>
      )}

      <section className="grid gap-6 xl:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-[#0D1B2A]">Cohorte Beta</h2>
              <p className="mt-1 text-sm text-slate-600">Solo CLIENT activos y con correo verificado pueden ser invitados.</p>
            </div>
            <StatusBadge value={cohort.configured ? 'ACTIVE' : 'PENDING'} />
          </div>

          <form onSubmit={handleInvite} className="mt-5 grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-semibold text-slate-700">Email CLIENT
              <input className={`${inputClass} mt-1`} type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} required />
            </label>
            <label className="text-sm font-semibold text-slate-700">Motivo
              <input className={`${inputClass} mt-1`} value={inviteReason} onChange={(event) => setInviteReason(event.target.value)} maxLength={500} placeholder="Piloto inicial Cartagena" />
            </label>
            <button className={`${buttonClass} sm:col-span-2`} disabled={isPending || cohort.remainingSlots <= 0}>Invitar a la cohorte</button>
          </form>

          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500"><tr><th className="py-2 pr-3">Participante</th><th className="py-2 pr-3">Elegibilidad</th><th className="py-2 pr-3">Legal</th><th className="py-2">Acción</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {cohort.members.map((member) => (
                  <tr key={member.userId}>
                    <td className="py-3 pr-3"><p className="font-semibold text-slate-900">{[member.firstName, member.lastName].filter(Boolean).join(' ') || member.email || 'CLIENT'}</p><p className="text-xs text-slate-500">{member.email || member.userId}</p></td>
                    <td className="py-3 pr-3"><StatusBadge value={member.eligible ? 'VERIFIED' : 'CONFLICTED'} /></td>
                    <td className="py-3 pr-3"><StatusBadge value={member.legalAccepted ? 'APPROVED' : 'PENDING'} /></td>
                    <td className="py-3"><button type="button" className={dangerButtonClass} disabled={isPending} onClick={() => revokeMember(member.userId, member.email)}>Revocar</button></td>
                  </tr>
                ))}
                {cohort.members.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-slate-500">No hay participantes activos.</td></tr>}
              </tbody>
            </table>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-[#0D1B2A]">Autorización de activación</h2>
              <p className="mt-1 text-sm text-slate-600">Autoriza por lease temporal; no modifica las variables del proveedor.</p>
            </div>
            <StatusBadge value={activation.status.state} />
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-slate-50 p-3"><dt className="text-slate-500">Elegible</dt><dd className="mt-1 font-bold text-slate-900">{activation.prerequisites.eligible ? 'Sí' : 'No'}</dd></div>
            <div className="rounded-xl bg-slate-50 p-3"><dt className="text-slate-500">Expira</dt><dd className="mt-1 font-bold text-slate-900">{formatDate(activation.status.expiresAt)}</dd></div>
          </dl>
          {activation.prerequisites.blockers.length > 0 && <p className="mt-4 text-sm text-amber-800">{activation.prerequisites.blockers.join(' · ')}</p>}

          <form onSubmit={authorizeActivation} className="mt-5 space-y-3">
            <label className="block text-sm font-semibold text-slate-700">Duración (horas)
              <input className={`${inputClass} mt-1`} type="number" min={1} max={168} value={activationHours} onChange={(event) => setActivationHours(event.target.value)} />
            </label>
            <label className="block text-sm font-semibold text-slate-700">Razón operacional
              <textarea className={`${inputClass} mt-1 min-h-20`} value={activationReason} onChange={(event) => setActivationReason(event.target.value)} maxLength={500} />
            </label>
            <div className="flex flex-wrap gap-2">
              <button className={buttonClass} disabled={isPending || !activation.prerequisites.eligible || activation.status.state === 'ACTIVE'}>Autorizar</button>
              <button type="button" className={dangerButtonClass} disabled={isPending || activation.status.state !== 'ACTIVE'} onClick={revokeActivation}>Revocar autorización</button>
            </div>
          </form>
        </article>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-[#0D1B2A]">Evidence Control Plane</h2>
            <p className="mt-1 text-sm text-slate-600">La evidencia de staging es informativa; solo producción puede satisfacer un gate.</p>
          </div>
          <StatusBadge value={summary.eligibleForOperatorActivation ? 'VERIFIED' : 'PENDING'} />
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {summary.gates.map((item) => (
            <div key={item.gate} className="rounded-xl border border-slate-200 p-3">
              <p className="truncate text-xs font-bold text-slate-700" title={item.gate}>{item.gate}</p>
              <div className="mt-2"><StatusBadge value={item.status} /></div>
            </div>
          ))}
        </div>

        <form onSubmit={submitEvidence} className="mt-6 grid gap-3 lg:grid-cols-2">
          <label className="text-sm font-semibold text-slate-700">Gate
            <select className={`${inputClass} mt-1`} value={gate} onChange={(event) => setGate(event.target.value)} required>
              {summary.gates.map((item) => <option key={item.gate} value={item.gate}>{item.gate}</option>)}
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-700">Ambiente
            <select className={`${inputClass} mt-1`} value={environment} onChange={(event) => setEnvironment(event.target.value as 'production' | 'staging')}>
              <option value="production">production</option><option value="staging">staging</option>
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-700 lg:col-span-2">Referencia redactada
            <input className={`${inputClass} mt-1`} value={reference} onChange={(event) => setReference(event.target.value)} minLength={3} maxLength={500} placeholder="Run ID, ticket, acta o referencia privada sin credenciales" required />
          </label>
          <label className="text-sm font-semibold text-slate-700">Observada
            <input className={`${inputClass} mt-1`} type="datetime-local" value={observedAt} onChange={(event) => setObservedAt(event.target.value)} required />
          </label>
          <label className="text-sm font-semibold text-slate-700">Expira (opcional)
            <input className={`${inputClass} mt-1`} type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} />
          </label>
          <label className="text-sm font-semibold text-slate-700 lg:col-span-2">Nota
            <textarea className={`${inputClass} mt-1 min-h-20`} value={evidenceNote} onChange={(event) => setEvidenceNote(event.target.value)} maxLength={500} />
          </label>
          <button className={`${buttonClass} lg:col-span-2`} disabled={isPending}>Registrar evidencia</button>
        </form>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500"><tr><th className="py-2 pr-3">Gate</th><th className="py-2 pr-3">Ambiente</th><th className="py-2 pr-3">Estado</th><th className="py-2 pr-3">Observada</th><th className="py-2">Decisión</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {history.evidence.map((record) => (
                <tr key={record.evidenceId}>
                  <td className="py-3 pr-3"><p className="font-semibold text-slate-900">{record.gate}</p><p className="max-w-xs truncate text-xs text-slate-500" title={record.reference}>{record.reference}</p></td>
                  <td className="py-3 pr-3">{record.environment}</td>
                  <td className="py-3 pr-3"><StatusBadge value={record.status} /></td>
                  <td className="py-3 pr-3 text-slate-600">{formatDate(record.observedAt)}</td>
                  <td className="py-3"><div className="flex flex-wrap gap-1.5">
                    {record.status === 'PENDING' && <><button type="button" className={successButtonClass} disabled={isPending} onClick={() => decideEvidence(record, 'approve')}>Aprobar</button><button type="button" className={dangerButtonClass} disabled={isPending} onClick={() => decideEvidence(record, 'reject')}>Rechazar</button></>}
                    {record.status === 'APPROVED' && <button type="button" className={dangerButtonClass} disabled={isPending} onClick={() => decideEvidence(record, 'revoke')}>Revocar</button>}
                  </div></td>
                </tr>
              ))}
              {history.evidence.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-slate-500">No hay evidencia registrada todavía.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-700">
        <h2 className="font-bold text-[#0D1B2A]">Frontera de activación</h2>
        <p className="mt-2">Esta consola no cambia automáticamente Railway ni autoriza un lanzamiento comercial. Una autorización activa sigue requiriendo que el proveedor tenga la configuración correcta y que Nvet revalide evidencia, cohorte, cobertura veterinaria, soporte y mercado en cada reserva.</p>
      </section>
    </div>
  );
}
