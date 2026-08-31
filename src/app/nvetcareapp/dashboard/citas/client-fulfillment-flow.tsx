'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { NvetAppointment } from '@/lib/nvetcareapp/appointments';
import type { NvetClientReview, NvetClientTransaction } from '@/lib/nvetcareapp/client-fulfillment';
import { nvetFetchWithRefresh } from '../nvet-fetch';

type PaymentAttempt = { fingerprint: string; requestId: string } | null;
type ReviewDraft = { rating: number; comment: string };

const STATUS_LABELS: Record<NvetAppointment['status'], string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmada',
  IN_PROGRESS: 'En curso',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
  DISPUTED: 'En disputa',
};

const TRANSACTION_LABELS: Record<NvetClientTransaction['status'], string> = {
  PENDING: 'Pago registrado',
  VERIFYING: 'En verificación',
  CONFIRMED: 'Pago confirmado',
  LIQUIDATED: 'Liquidado',
  DISPUTED: 'En disputa',
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
    const body = (await response.json()) as { message?: string };
    return body.message || fallback;
  } catch {
    return fallback;
  }
}

export function ClientFulfillmentFlow({
  initialAppointments,
  initialTransactions,
  initialReviews,
  paymentsAvailable,
  reviewsAvailable,
}: {
  initialAppointments: NvetAppointment[];
  initialTransactions: NvetClientTransaction[];
  initialReviews: NvetClientReview[];
  paymentsAvailable: boolean;
  reviewsAvailable: boolean;
}) {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [reviews, setReviews] = useState(initialReviews);
  const [paymentAttempt, setPaymentAttempt] = useState<PaymentAttempt>(null);
  const [busyPaymentId, setBusyPaymentId] = useState<string | null>(null);
  const [busyReviewId, setBusyReviewId] = useState<string | null>(null);
  const [paymentErrors, setPaymentErrors] = useState<Record<string, string>>({});
  const [reviewErrors, setReviewErrors] = useState<Record<string, string>>({});
  const [reviewDrafts, setReviewDrafts] = useState<Record<string, ReviewDraft>>({});

  const transactionsByAppointment = useMemo(
    () => new Map(transactions.map((transaction) => [transaction.appointmentId, transaction])),
    [transactions],
  );
  const reviewsByAppointment = useMemo(
    () => new Map(reviews.map((review) => [review.appointmentId, review])),
    [reviews],
  );

  async function startTransfer(appointmentId: string) {
    const fingerprint = JSON.stringify({ appointmentId, paymentMethod: 'TRANSFER' });
    const requestId = paymentAttempt?.fingerprint === fingerprint ? paymentAttempt.requestId : crypto.randomUUID();
    setPaymentAttempt({ fingerprint, requestId });
    setBusyPaymentId(appointmentId);
    setPaymentErrors((current) => ({ ...current, [appointmentId]: '' }));

    try {
      const response = await nvetFetchWithRefresh('/api/nvetcareapp/client/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentId, requestId }),
      });

      if (!response.ok) {
        const message = await readMessage(response, 'No se pudo iniciar la verificación del pago.');
        setPaymentErrors((current) => ({ ...current, [appointmentId]: message }));
        return;
      }

      const transaction = (await response.json()) as NvetClientTransaction;
      setTransactions((current) => [transaction, ...current.filter((item) => item.appointmentId !== appointmentId)]);
      setPaymentAttempt(null);
    } catch {
      setPaymentErrors((current) => ({
        ...current,
        [appointmentId]: 'No se pudo confirmar si la solicitud llegó al servidor. Puedes reintentar sin duplicar el pago.',
      }));
    } finally {
      setBusyPaymentId(null);
    }
  }

  async function submitReview(appointmentId: string) {
    const draft = reviewDrafts[appointmentId] ?? { rating: 5, comment: '' };
    setBusyReviewId(appointmentId);
    setReviewErrors((current) => ({ ...current, [appointmentId]: '' }));

    try {
      const response = await nvetFetchWithRefresh('/api/nvetcareapp/client/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentId, rating: draft.rating, comment: draft.comment }),
      });

      if (!response.ok) {
        const message = await readMessage(response, 'No se pudo enviar tu calificación.');
        setReviewErrors((current) => ({ ...current, [appointmentId]: message }));
        return;
      }

      const review = (await response.json()) as NvetClientReview;
      setReviews((current) => [review, ...current.filter((item) => item.appointmentId !== appointmentId)]);
    } catch {
      setReviewErrors((current) => ({ ...current, [appointmentId]: 'No se pudo enviar tu calificación.' }));
    } finally {
      setBusyReviewId(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#F2F4F7] px-4 py-10 sm:px-8 sm:py-14">
      <div className="mx-auto max-w-5xl">
        <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#34B27A]">Nvet Care</p>
            <h1 className="mt-1 text-2xl font-semibold text-[#0D1B2A]">Pagos, servicio y calificación</h1>
            <p className="mt-2 max-w-2xl text-sm text-[#5B6670]">
              Sigue el estado operativo de cada cita, registra la transferencia para verificación y califica el servicio cuando termine.
            </p>
          </div>
          <div className="flex gap-3 text-sm">
            <Link href="/nvetcareapp/dashboard" className="font-semibold text-[#0D1B2A] hover:text-[#34B27A]">Panel</Link>
            <Link href="/nvetcareapp/dashboard/reservar" className="font-semibold text-[#34B27A]">Nueva cita</Link>
          </div>
        </div>

        {!paymentsAvailable && (
          <div className="mb-4 rounded-xl border border-[#FF8A3D]/25 bg-[#FF8A3D]/[0.06] p-3 text-sm text-[#0D1B2A]">
            El estado de pagos no está disponible temporalmente. Las citas siguen visibles y no se ejecutará ningún cargo desde esta pantalla.
          </div>
        )}

        {initialAppointments.length === 0 ? (
          <div className="rounded-2xl border border-[#0D1B2A]/10 bg-white p-8 text-center text-sm text-[#5B6670]">
            Todavía no tienes citas. <Link href="/nvetcareapp/dashboard/reservar" className="font-semibold text-[#34B27A]">Agendar una cita</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {initialAppointments.map((appointment) => {
              const transaction = transactionsByAppointment.get(appointment.id);
              const review = reviewsByAppointment.get(appointment.id);
              const canStartTransfer =
                paymentsAvailable &&
                appointment.status === 'PENDING' &&
                appointment.paymentMethod === 'TRANSFER' &&
                (!transaction || transaction.status === 'FAILED');
              const draft = reviewDrafts[appointment.id] ?? { rating: 5, comment: '' };

              return (
                <section key={appointment.id} className="rounded-2xl border border-[#0D1B2A]/10 bg-white p-5 shadow-[0_1px_3px_rgba(13,27,42,0.04)]">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-semibold text-[#0D1B2A]">
                        {appointment.vet.user.firstName} {appointment.vet.user.lastName}
                      </h2>
                      <p className="mt-1 text-xs text-[#5B6670]">
                        {appointment.serviceType} · {appointment.pet.name} · {formatDate(appointment.date)} · {appointment.time}
                      </p>
                    </div>
                    <span className="rounded-full border border-[#0D1B2A]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#0D1B2A]">
                      {STATUS_LABELS[appointment.status]}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 border-t border-[#0D1B2A]/5 pt-4 sm:grid-cols-2">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#5B6670]">Valor oficial</p>
                      <p className="mt-1 text-base font-semibold text-[#0D1B2A]">{formatCop(appointment.amount)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#5B6670]">Pago</p>
                      <p className="mt-1 text-sm font-semibold text-[#0D1B2A]">
                        {transaction ? TRANSACTION_LABELS[transaction.status] : 'Sin transacción iniciada'}
                      </p>
                    </div>
                  </div>

                  {canStartTransfer && (
                    <div className="mt-4 rounded-xl border border-[#34B27A]/20 bg-[#34B27A]/[0.05] p-4">
                      <p className="text-sm text-[#0D1B2A]">
                        Registra el pago por transferencia para abrir su verificación. Este paso <strong>no debita dinero</strong> ni habilita CTG/PSE; solo crea la transacción pendiente contra el monto oficial de la cita.
                      </p>
                      <button
                        type="button"
                        disabled={busyPaymentId === appointment.id}
                        onClick={() => startTransfer(appointment.id)}
                        className="mt-3 rounded-lg bg-[#34B27A] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {busyPaymentId === appointment.id ? 'Procesando…' : transaction?.status === 'FAILED' ? 'Reintentar registro' : 'Iniciar verificación de transferencia'}
                      </button>
                      {paymentErrors[appointment.id] && <p className="mt-2 text-xs text-[#B54708]">{paymentErrors[appointment.id]}</p>}
                    </div>
                  )}

                  {appointment.paymentMethod !== 'TRANSFER' && !transaction && (
                    <p className="mt-4 text-xs text-[#5B6670]">
                      Este método de pago no está habilitado en el flujo web de producción actual. No se enviará ningún cargo desde esta pantalla.
                    </p>
                  )}

                  {appointment.status === 'COMPLETED' && (
                    <div className="mt-4 border-t border-[#0D1B2A]/5 pt-4">
                      {review ? (
                        <p className="text-sm text-[#0D1B2A]">Tu calificación: <strong>{review.rating}/5</strong>{review.comment ? ` · ${review.comment}` : ''}</p>
                      ) : reviewsAvailable ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <label htmlFor={`rating-${appointment.id}`} className="text-sm font-medium text-[#0D1B2A]">Calificación</label>
                            <select
                              id={`rating-${appointment.id}`}
                              value={draft.rating}
                              onChange={(event) => setReviewDrafts((current) => ({
                                ...current,
                                [appointment.id]: { ...draft, rating: Number(event.target.value) },
                              }))}
                              className="rounded-lg border border-[#0D1B2A]/15 bg-white px-3 py-2 text-sm"
                            >
                              {[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating}/5</option>)}
                            </select>
                          </div>
                          <textarea
                            value={draft.comment}
                            onChange={(event) => setReviewDrafts((current) => ({
                              ...current,
                              [appointment.id]: { ...draft, comment: event.target.value },
                            }))}
                            maxLength={1000}
                            placeholder="Comentario opcional (mínimo 10 caracteres si lo escribes)"
                            className="min-h-24 w-full rounded-lg border border-[#0D1B2A]/15 p-3 text-sm text-[#0D1B2A] outline-none focus:border-[#34B27A]"
                          />
                          <button
                            type="button"
                            disabled={busyReviewId === appointment.id}
                            onClick={() => submitReview(appointment.id)}
                            className="rounded-lg bg-[#0D1B2A] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                          >
                            {busyReviewId === appointment.id ? 'Enviando…' : 'Enviar calificación'}
                          </button>
                          {reviewErrors[appointment.id] && <p className="text-xs text-[#B54708]">{reviewErrors[appointment.id]}</p>}
                        </div>
                      ) : (
                        <p className="text-xs text-[#5B6670]">Las calificaciones no están disponibles temporalmente.</p>
                      )}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
