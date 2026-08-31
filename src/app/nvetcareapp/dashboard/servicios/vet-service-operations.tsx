'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { NvetAppointment, NvetAppointmentStatus } from '@/lib/nvetcareapp/appointments';
import type { NvetVetTransaction } from '@/lib/nvetcareapp/vet-operations';
import { nvetFetchWithRefresh } from '../nvet-fetch';

type ClinicalDraft = { diagnosis: string; treatment: string };

const STATUS_LABELS: Record<NvetAppointmentStatus, string> = {
  PENDING: 'Pendiente de pago',
  CONFIRMED: 'Confirmada',
  IN_PROGRESS: 'Atención en curso',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
  DISPUTED: 'En disputa',
};

const TX_LABELS: Record<NvetVetTransaction['status'], string> = {
  PENDING: 'Transferencia registrada',
  VERIFYING: 'Comprobante en revisión',
  CONFIRMED: 'Pago confirmado',
  LIQUIDATED: 'Liquidado',
  DISPUTED: 'Pago en disputa',
  FAILED: 'Pago rechazado',
};

function formatCop(value: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
}

async function readMessage(response: Response, fallback: string) {
  try {
    const data = (await response.json()) as { message?: string };
    return data.message || fallback;
  } catch {
    return fallback;
  }
}

export function VetServiceOperations({
  firstName,
  initialAppointments,
  initialTransactions,
  appointmentsAvailable,
  paymentsAvailable,
}: {
  firstName: string;
  initialAppointments: NvetAppointment[];
  initialTransactions: NvetVetTransaction[];
  appointmentsAvailable: boolean;
  paymentsAvailable: boolean;
}) {
  const router = useRouter();
  const [appointments, setAppointments] = useState(initialAppointments);
  const [transactions, setTransactions] = useState(initialTransactions);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [transferCodes, setTransferCodes] = useState<Record<string, string>>({});
  const [transferFiles, setTransferFiles] = useState<Record<string, File | null>>({});
  const [clinicalDrafts, setClinicalDrafts] = useState<Record<string, ClinicalDraft>>({});

  const transactionsByAppointment = useMemo(
    () => new Map(transactions.map((transaction) => [transaction.appointmentId, transaction])),
    [transactions],
  );

  function draftFor(appointment: NvetAppointment): ClinicalDraft {
    return clinicalDrafts[appointment.id] ?? {
      diagnosis: appointment.diagnosis ?? '',
      treatment: appointment.treatment ?? '',
    };
  }

  async function submitTransferEvidence(appointment: NvetAppointment, transaction: NvetVetTransaction) {
    const transferCode = (transferCodes[transaction.id] ?? '').trim();
    const file = transferFiles[transaction.id];
    const key = `transfer:${transaction.id}`;
    setErrors((current) => ({ ...current, [appointment.id]: '' }));

    if (transferCode.length < 4 || !file) {
      setErrors((current) => ({ ...current, [appointment.id]: 'Ingresa el código y adjunta el comprobante recibido.' }));
      return;
    }

    const form = new FormData();
    form.set('transferCode', transferCode);
    form.set('file', file);
    setBusyKey(key);

    try {
      const response = await nvetFetchWithRefresh(
        `/api/nvetcareapp/vet/transactions/${transaction.id}/verify-transfer`,
        { method: 'POST', body: form },
      );
      if (!response.ok) {
        const message = await readMessage(response, 'No se pudo registrar el comprobante.');
        setErrors((current) => ({ ...current, [appointment.id]: message }));
        return;
      }
      const updated = (await response.json()) as NvetVetTransaction;
      setTransactions((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setTransferFiles((current) => ({ ...current, [transaction.id]: null }));
    } catch {
      setErrors((current) => ({ ...current, [appointment.id]: 'No se pudo confirmar si el comprobante llegó al servidor.' }));
    } finally {
      setBusyKey(null);
    }
  }

  async function changeStatus(appointment: NvetAppointment, status: 'IN_PROGRESS' | 'COMPLETED') {
    const key = `status:${appointment.id}`;
    setBusyKey(key);
    setErrors((current) => ({ ...current, [appointment.id]: '' }));

    try {
      const response = await nvetFetchWithRefresh(`/api/nvetcareapp/appointments/${appointment.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        const message = await readMessage(response, 'No se pudo actualizar el servicio.');
        setErrors((current) => ({ ...current, [appointment.id]: message }));
        return;
      }
      const updated = (await response.json()) as NvetAppointment;
      setAppointments((current) => current.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)));
    } catch {
      setErrors((current) => ({ ...current, [appointment.id]: 'No se pudo actualizar el servicio.' }));
    } finally {
      setBusyKey(null);
    }
  }

  async function saveClinicalNotes(appointment: NvetAppointment) {
    const draft = draftFor(appointment);
    const diagnosis = draft.diagnosis.trim();
    const treatment = draft.treatment.trim();
    const key = `clinical:${appointment.id}`;

    if (diagnosis.length < 3) {
      setErrors((current) => ({ ...current, [appointment.id]: 'Registra un diagnóstico clínico antes de guardar.' }));
      return;
    }

    setBusyKey(key);
    setErrors((current) => ({ ...current, [appointment.id]: '' }));
    try {
      const response = await nvetFetchWithRefresh(
        `/api/nvetcareapp/vet/appointments/${appointment.id}/clinical-notes`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ diagnosis, treatment }),
        },
      );
      if (!response.ok) {
        const message = await readMessage(response, 'No se pudieron guardar las notas clínicas.');
        setErrors((current) => ({ ...current, [appointment.id]: message }));
        return;
      }
      const updated = (await response.json()) as NvetAppointment;
      setAppointments((current) => current.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)));
      setClinicalDrafts((current) => ({
        ...current,
        [appointment.id]: { diagnosis: updated.diagnosis ?? diagnosis, treatment: updated.treatment ?? treatment },
      }));
    } catch {
      setErrors((current) => ({ ...current, [appointment.id]: 'No se pudieron guardar las notas clínicas.' }));
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#F2F4F7] px-4 py-10 sm:px-8 sm:py-14">
      <div className="mx-auto max-w-6xl">
        <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#34B27A]">Nvet Care · Operación VET</p>
            <h1 className="mt-1 text-2xl font-semibold text-[#0D1B2A]">Servicios de {firstName}</h1>
            <p className="mt-2 max-w-3xl text-sm text-[#5B6670]">
              Valida la evidencia de transferencia, inicia únicamente citas con pago confirmado, registra el diagnóstico y completa la atención.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            <button type="button" onClick={() => router.refresh()} className="font-semibold text-[#5B6670] hover:text-[#0D1B2A]">Actualizar</button>
            <Link href="/nvetcareapp/dashboard" className="font-semibold text-[#0D1B2A] hover:text-[#34B27A]">Mi agenda</Link>
          </div>
        </div>

        {!appointmentsAvailable && (
          <div className="mb-4 rounded-xl border border-[#FF8A3D]/25 bg-[#FF8A3D]/[0.06] p-3 text-sm text-[#0D1B2A]">
            No se pudo cargar la agenda veterinaria. No se habilitarán cambios de estado hasta recuperar el servicio.
          </div>
        )}
        {!paymentsAvailable && (
          <div className="mb-4 rounded-xl border border-[#FF8A3D]/25 bg-[#FF8A3D]/[0.06] p-3 text-sm text-[#0D1B2A]">
            No se pudo consultar el estado financiero. Ninguna cita podrá iniciar desde esta pantalla sin evidencia de pago confirmada.
          </div>
        )}

        {appointments.length === 0 ? (
          <div className="rounded-2xl border border-[#0D1B2A]/10 bg-white p-8 text-center text-sm text-[#5B6670]">
            No tienes citas asignadas en este momento.
          </div>
        ) : (
          <div className="space-y-4">
            {appointments.map((appointment) => {
              const transaction = transactionsByAppointment.get(appointment.id);
              const draft = draftFor(appointment);
              const paymentReady = transaction?.status === 'CONFIRMED' || transaction?.status === 'LIQUIDATED';
              const clinicalSaved = Boolean(appointment.diagnosis?.trim());

              return (
                <section key={appointment.id} className="rounded-2xl border border-[#0D1B2A]/10 bg-white p-5 shadow-[0_1px_3px_rgba(13,27,42,0.04)]">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-semibold text-[#0D1B2A]">
                        {appointment.client.firstName} {appointment.client.lastName} · {appointment.pet.name}
                      </h2>
                      <p className="mt-1 text-xs text-[#5B6670]">
                        {appointment.serviceType} · {formatDate(appointment.date)} · {appointment.time} · {appointment.address}
                      </p>
                    </div>
                    <span className="rounded-full border border-[#0D1B2A]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#0D1B2A]">
                      {STATUS_LABELS[appointment.status]}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 border-t border-[#0D1B2A]/5 pt-4 sm:grid-cols-2">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#5B6670]">Valor</p>
                      <p className="mt-1 font-semibold text-[#0D1B2A]">{formatCop(appointment.amount)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#5B6670]">Estado financiero</p>
                      <p className="mt-1 text-sm font-semibold text-[#0D1B2A]">
                        {transaction ? TX_LABELS[transaction.status] : 'Sin transacción'}
                      </p>
                    </div>
                  </div>

                  {appointment.status === 'PENDING' && transaction?.paymentMethod === 'TRANSFER' && transaction.status === 'PENDING' && (
                    <div className="mt-4 rounded-xl border border-[#34B27A]/20 bg-[#34B27A]/[0.05] p-4">
                      <p className="text-sm font-semibold text-[#0D1B2A]">Confirmar evidencia recibida</p>
                      <p className="mt-1 text-xs text-[#5B6670]">
                        Adjunta el comprobante y código de la transferencia. Esto pasa el pago a revisión administrativa; no confirma ni liquida fondos por sí solo.
                      </p>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <input
                          value={transferCodes[transaction.id] ?? ''}
                          onChange={(event) => setTransferCodes((current) => ({ ...current, [transaction.id]: event.target.value }))}
                          minLength={4}
                          maxLength={50}
                          placeholder="Código de transferencia"
                          className="rounded-lg border border-[#0D1B2A]/15 px-3 py-2 text-sm outline-none focus:border-[#34B27A]"
                        />
                        <input
                          type="file"
                          accept="application/pdf,image/jpeg,image/png,image/webp"
                          onChange={(event) => setTransferFiles((current) => ({ ...current, [transaction.id]: event.target.files?.[0] ?? null }))}
                          className="rounded-lg border border-[#0D1B2A]/15 bg-white px-3 py-2 text-sm"
                        />
                      </div>
                      <button
                        type="button"
                        disabled={busyKey === `transfer:${transaction.id}`}
                        onClick={() => submitTransferEvidence(appointment, transaction)}
                        className="mt-3 rounded-lg bg-[#34B27A] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                      >
                        {busyKey === `transfer:${transaction.id}` ? 'Enviando…' : 'Enviar a revisión administrativa'}
                      </button>
                    </div>
                  )}

                  {appointment.status === 'PENDING' && transaction?.status === 'VERIFYING' && (
                    <p className="mt-4 rounded-xl border border-[#FF8A3D]/20 bg-[#FF8A3D]/[0.05] p-3 text-sm text-[#0D1B2A]">
                      El comprobante está en revisión administrativa. La cita permanecerá bloqueada hasta que el pago sea confirmado.
                    </p>
                  )}

                  {appointment.status === 'PENDING' && transaction?.status === 'FAILED' && (
                    <p className="mt-4 text-sm text-[#B54708]">La transferencia fue rechazada. El cliente debe registrar un nuevo intento de pago.</p>
                  )}

                  {appointment.status === 'PENDING' && !transaction && (
                    <p className="mt-4 text-sm text-[#5B6670]">Esperando que el cliente registre el pago de la cita.</p>
                  )}

                  {appointment.status === 'CONFIRMED' && (
                    <div className="mt-4 rounded-xl border border-[#34B27A]/20 bg-[#34B27A]/[0.05] p-4">
                      <p className="text-sm text-[#0D1B2A]">
                        {paymentReady
                          ? 'Pago confirmado. La atención puede iniciar.'
                          : 'La cita aparece confirmada, pero el pago no tiene un estado financiero apto. La operación queda bloqueada.'}
                      </p>
                      {paymentReady && (
                        <button
                          type="button"
                          disabled={busyKey === `status:${appointment.id}`}
                          onClick={() => changeStatus(appointment, 'IN_PROGRESS')}
                          className="mt-3 rounded-lg bg-[#34B27A] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                        >
                          {busyKey === `status:${appointment.id}` ? 'Iniciando…' : 'Iniciar atención'}
                        </button>
                      )}
                    </div>
                  )}

                  {appointment.status === 'IN_PROGRESS' && (
                    <div className="mt-4 border-t border-[#0D1B2A]/5 pt-4">
                      <p className="text-sm font-semibold text-[#0D1B2A]">Registro clínico</p>
                      <div className="mt-3 grid gap-3">
                        <textarea
                          value={draft.diagnosis}
                          onChange={(event) => setClinicalDrafts((current) => ({
                            ...current,
                            [appointment.id]: { ...draft, diagnosis: event.target.value },
                          }))}
                          maxLength={2000}
                          placeholder="Diagnóstico clínico"
                          className="min-h-24 w-full rounded-lg border border-[#0D1B2A]/15 p-3 text-sm outline-none focus:border-[#34B27A]"
                        />
                        <textarea
                          value={draft.treatment}
                          onChange={(event) => setClinicalDrafts((current) => ({
                            ...current,
                            [appointment.id]: { ...draft, treatment: event.target.value },
                          }))}
                          maxLength={3000}
                          placeholder="Tratamiento, indicaciones o seguimiento (opcional)"
                          className="min-h-24 w-full rounded-lg border border-[#0D1B2A]/15 p-3 text-sm outline-none focus:border-[#34B27A]"
                        />
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={busyKey === `clinical:${appointment.id}`}
                          onClick={() => saveClinicalNotes(appointment)}
                          className="rounded-lg bg-[#0D1B2A] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                        >
                          {busyKey === `clinical:${appointment.id}` ? 'Guardando…' : clinicalSaved ? 'Actualizar notas clínicas' : 'Guardar notas clínicas'}
                        </button>
                        <button
                          type="button"
                          disabled={!clinicalSaved || busyKey === `status:${appointment.id}`}
                          onClick={() => changeStatus(appointment, 'COMPLETED')}
                          className="rounded-lg border border-[#34B27A] px-4 py-2 text-sm font-semibold text-[#289463] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {busyKey === `status:${appointment.id}` ? 'Completando…' : 'Completar atención'}
                        </button>
                      </div>
                      {!clinicalSaved && <p className="mt-2 text-xs text-[#5B6670]">Debes guardar al menos el diagnóstico antes de completar el servicio.</p>}
                    </div>
                  )}

                  {appointment.status === 'COMPLETED' && (
                    <div className="mt-4 rounded-xl border border-[#0D1B2A]/10 bg-[#F8F9FA] p-4 text-sm text-[#0D1B2A]">
                      <p><strong>Diagnóstico:</strong> {appointment.diagnosis || 'No disponible'}</p>
                      {appointment.treatment && <p className="mt-2"><strong>Tratamiento:</strong> {appointment.treatment}</p>}
                      <p className="mt-3 text-xs text-[#5B6670]">
                        {transaction?.status === 'LIQUIDATED'
                          ? 'Liquidación administrativa completada.'
                          : transaction?.status === 'CONFIRMED'
                            ? 'Servicio completado. El pago confirmado queda en el ciclo de liquidación administrativa.'
                            : 'Servicio completado. Revisa el estado financiero antes de cualquier liquidación.'}
                      </p>
                    </div>
                  )}

                  {(appointment.status === 'CANCELLED' || appointment.status === 'DISPUTED') && (
                    <p className="mt-4 text-sm text-[#5B6670]">Esta cita no admite avance operativo desde esta pantalla.</p>
                  )}

                  {errors[appointment.id] && <p className="mt-3 text-xs font-medium text-[#B54708]">{errors[appointment.id]}</p>}
                </section>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
