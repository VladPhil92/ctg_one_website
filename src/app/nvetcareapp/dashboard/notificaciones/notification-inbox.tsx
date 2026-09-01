'use client';

import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import { Bell, CalendarDays, CheckCheck, PawPrint, WalletCards } from 'lucide-react';
import { nvetFetchWithRefresh } from '../nvet-fetch';

type NotificationItem = {
  id: string;
  type: string;
  category: string;
  title: string;
  message: string;
  safeHref: string | null;
  occurredAt: string;
  readAt?: string | null;
};

function formatMoment(value: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/Bogota',
  }).format(new Date(value));
}

function categoryLabel(category: string): string {
  if (category === 'PREVENTIVE') return 'Prevención';
  if (category === 'PAYMENT') return 'Pagos';
  return 'Citas';
}

function categoryIcon(category: string) {
  if (category === 'PREVENTIVE') return PawPrint;
  if (category === 'PAYMENT') return WalletCards;
  return CalendarDays;
}

export function NotificationInbox({ initialItems }: { initialItems: NotificationItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const unread = useMemo(() => items.filter((item) => !item.readAt).length, [items]);

  const markRead = (id: string) => {
    setError(null);
    startTransition(async () => {
      const response = await nvetFetchWithRefresh(`/api/nvetcareapp/notifications/${id}/read`, {
        method: 'PATCH',
      });
      const data = await response.json().catch(() => null) as { readAt?: string; message?: string } | null;
      if (!response.ok) {
        setError(data?.message || 'No se pudo actualizar la notificación.');
        return;
      }
      const readAt = data?.readAt || new Date().toISOString();
      setItems((current) => current.map((item) => (item.id === id ? { ...item, readAt } : item)));
    });
  };

  const markAllRead = () => {
    setError(null);
    startTransition(async () => {
      const response = await nvetFetchWithRefresh('/api/nvetcareapp/notifications/read-all', {
        method: 'PATCH',
      });
      const data = await response.json().catch(() => null) as { readAt?: string; message?: string } | null;
      if (!response.ok) {
        setError(data?.message || 'No se pudieron actualizar las notificaciones.');
        return;
      }
      const readAt = data?.readAt || new Date().toISOString();
      setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt || readAt })));
    });
  };

  if (items.length === 0) {
    return (
      <section className="rounded-3xl border border-dashed border-[#34B27A]/30 bg-white p-10 text-center">
        <Bell className="mx-auto h-7 w-7 text-[#34B27A]" aria-hidden="true" />
        <h2 className="mt-3 text-base font-bold text-[#0D1B2A]">Todo está al día</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#5B6670]">
          Cuando cambie una cita, un pago o una fecha preventiva relevante, aparecerá aquí.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4" aria-label="Centro de notificaciones Nvet Care">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[#5B6670]">
          {unread > 0 ? `${unread} notificación${unread === 1 ? '' : 'es'} sin leer` : 'No tienes notificaciones pendientes de lectura'}
        </p>
        <button
          type="button"
          onClick={markAllRead}
          disabled={isPending || unread === 0}
          className="inline-flex items-center gap-2 rounded-xl border border-[#0D1B2A]/10 bg-white px-4 py-2.5 text-xs font-bold text-[#0D1B2A] transition hover:border-[#34B27A]/30 hover:text-[#237754] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CheckCheck className="h-4 w-4" aria-hidden="true" />
          Marcar todas como leídas
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {items.map((item) => {
          const unreadItem = !item.readAt;
          const Icon = categoryIcon(item.category);
          return (
            <article
              key={item.id}
              className={`rounded-2xl border bg-white p-5 shadow-[0_1px_3px_rgba(13,27,42,0.04)] transition ${
                unreadItem ? 'border-[#34B27A]/30' : 'border-[#0D1B2A]/10'
              }`}
            >
              <div className="flex items-start gap-4">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${unreadItem ? 'bg-[#34B27A]/10 text-[#237754]' : 'bg-[#F2F4F7] text-[#5B6670]'}`}>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-[#0D1B2A]/10 bg-[#F7F8FA] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.08em] text-[#5B6670]">
                          {categoryLabel(item.category)}
                        </span>
                        {unreadItem && (
                          <span className="rounded-full bg-[#34B27A] px-2 py-1 text-[9px] font-bold uppercase tracking-[0.08em] text-white">
                            Nueva
                          </span>
                        )}
                      </div>
                      <h2 className="mt-2 text-sm font-bold text-[#0D1B2A]">{item.title}</h2>
                      <p className="mt-1 text-sm leading-6 text-[#5B6670]">{item.message}</p>
                      <p className="mt-2 text-[11px] text-[#5B6670]/80">{formatMoment(item.occurredAt)}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {item.safeHref && (
                      <Link
                        href={item.safeHref}
                        onClick={() => unreadItem && markRead(item.id)}
                        className="inline-flex items-center rounded-lg bg-[#0D1B2A] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#16293D]"
                      >
                        Ver detalle
                      </Link>
                    )}
                    {unreadItem && (
                      <button
                        type="button"
                        onClick={() => markRead(item.id)}
                        disabled={isPending}
                        className="inline-flex items-center rounded-lg border border-[#0D1B2A]/10 px-3 py-2 text-xs font-semibold text-[#5B6670] transition hover:border-[#34B27A]/30 hover:text-[#237754] disabled:opacity-50"
                      >
                        Marcar como leída
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
