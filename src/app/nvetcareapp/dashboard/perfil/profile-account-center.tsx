'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import {
  CheckCircle2,
  KeyRound,
  Laptop,
  Mail,
  Save,
  ShieldCheck,
  Smartphone,
  UserRound,
} from 'lucide-react';
import { nvetFetchWithRefresh } from '../nvet-fetch';

type ClientProfile = {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  identitySource: 'CTG_ONE' | 'NVET_LOCAL';
};

type UserSession = {
  id: string;
  userAgent?: string | null;
  ipAddress?: string | null;
  deviceLabel?: string | null;
  lastUsedAt: string;
  createdAt: string;
  expiresAt: string;
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

function deviceIcon(session: UserSession) {
  const haystack = `${session.deviceLabel ?? ''} ${session.userAgent ?? ''}`.toLowerCase();
  return /iphone|android|mobile|ipad/.test(haystack) ? Smartphone : Laptop;
}

export function ProfileAccountCenter({
  initialProfile,
  initialSessions,
}: {
  initialProfile: ClientProfile;
  initialSessions: UserSession[];
}) {
  const router = useRouter();
  const [profile, setProfile] = useState(initialProfile);
  const [sessions, setSessions] = useState(initialSessions);
  const [firstName, setFirstName] = useState(initialProfile.firstName ?? '');
  const [lastName, setLastName] = useState(initialProfile.lastName ?? '');
  const [phone, setPhone] = useState(initialProfile.phone ?? '');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);

  const changed = useMemo(
    () =>
      firstName.trim() !== (profile.firstName ?? '') ||
      lastName.trim() !== (profile.lastName ?? '') ||
      phone.trim() !== (profile.phone ?? ''),
    [firstName, lastName, phone, profile],
  );

  const saveProfile = () => {
    setError(null);
    setSuccess(null);

    const payload: { firstName?: string; lastName?: string; phone?: string } = {};
    if (firstName.trim() !== (profile.firstName ?? '')) payload.firstName = firstName.trim();
    if (lastName.trim() !== (profile.lastName ?? '')) payload.lastName = lastName.trim();
    if (phone.trim() !== (profile.phone ?? '')) payload.phone = phone.trim();

    if (Object.keys(payload).length === 0) return;

    startTransition(async () => {
      const response = await nvetFetchWithRefresh('/api/nvetcareapp/client/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await response.json().catch(() => null)) as (ClientProfile & { message?: string }) | null;
      if (!response.ok || !data) {
        setError(data?.message || 'No se pudo actualizar el perfil.');
        return;
      }

      setProfile(data);
      setFirstName(data.firstName ?? '');
      setLastName(data.lastName ?? '');
      setPhone(data.phone ?? '');
      setSuccess('Perfil actualizado correctamente.');
      router.refresh();
    });
  };

  const revokeSession = (sessionId: string) => {
    setError(null);
    setSuccess(null);
    setRevokingSessionId(sessionId);
    startTransition(async () => {
      try {
        const response = await nvetFetchWithRefresh(`/api/nvetcareapp/client/sessions/${sessionId}`, {
          method: 'DELETE',
        });
        const data = (await response.json().catch(() => null)) as { message?: string } | null;
        if (!response.ok) {
          setError(data?.message || 'No se pudo cerrar esa sesión.');
          return;
        }
        setSessions((current) => current.filter((session) => session.id !== sessionId));
        setSuccess('La sesión fue revocada.');
      } finally {
        setRevokingSessionId(null);
      }
    });
  };

  return (
    <div className="space-y-6">
      {(error || success) && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            error ? 'border-red-200 bg-red-50 text-red-700' : 'border-[#34B27A]/25 bg-[#34B27A]/[0.07] text-[#237754]'
          }`}
          role={error ? 'alert' : 'status'}
        >
          {error || success}
        </div>
      )}

      <section className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
        <article className="rounded-3xl border border-[#0D1B2A]/10 bg-white p-6 shadow-[0_1px_3px_rgba(13,27,42,0.04)] sm:p-7">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#34B27A]/10 text-[#237754]">
              <UserRound className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-base font-bold text-[#0D1B2A]">Datos de contacto</h2>
              <p className="mt-1 text-xs leading-5 text-[#5B6670]">
                Estos datos pertenecen a tu perfil operativo de Nvet Care. La identidad de acceso no se modifica desde esta pantalla.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-xs font-semibold text-[#44505B]">
              Nombre
              <input
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                maxLength={50}
                autoComplete="given-name"
                className="w-full rounded-xl border border-[#0D1B2A]/10 bg-white px-3.5 py-3 text-sm font-medium text-[#0D1B2A] outline-none transition focus:border-[#34B27A]/60 focus:ring-2 focus:ring-[#34B27A]/10"
              />
            </label>
            <label className="space-y-2 text-xs font-semibold text-[#44505B]">
              Apellido
              <input
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                maxLength={50}
                autoComplete="family-name"
                className="w-full rounded-xl border border-[#0D1B2A]/10 bg-white px-3.5 py-3 text-sm font-medium text-[#0D1B2A] outline-none transition focus:border-[#34B27A]/60 focus:ring-2 focus:ring-[#34B27A]/10"
              />
            </label>
            <label className="space-y-2 text-xs font-semibold text-[#44505B] sm:col-span-2">
              Teléfono
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                maxLength={16}
                inputMode="tel"
                autoComplete="tel"
                placeholder="+573001234567"
                className="w-full rounded-xl border border-[#0D1B2A]/10 bg-white px-3.5 py-3 text-sm font-medium text-[#0D1B2A] outline-none transition focus:border-[#34B27A]/60 focus:ring-2 focus:ring-[#34B27A]/10"
              />
              <span className="block font-normal text-[#5B6670]">Usa formato internacional. Puedes dejarlo vacío para eliminarlo.</span>
            </label>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={saveProfile}
              disabled={isPending || !changed}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0D1B2A] px-5 py-3 text-xs font-bold text-white transition hover:bg-[#16293D] disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Save className="h-4 w-4" aria-hidden="true" />
              {isPending ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </article>

        <aside className="space-y-4">
          <article className="rounded-3xl border border-[#0D1B2A]/10 bg-white p-6">
            <div className="flex items-center gap-2 text-[#237754]">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              <h2 className="text-sm font-bold text-[#0D1B2A]">Identidad y seguridad</h2>
            </div>
            <dl className="mt-5 space-y-4 text-xs">
              <div>
                <dt className="font-semibold text-[#5B6670]">Correo de acceso</dt>
                <dd className="mt-1 break-all font-medium text-[#0D1B2A]">{profile.email}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-[#0D1B2A]/8 pt-4">
                <div>
                  <dt className="font-semibold text-[#5B6670]">Fuente de identidad</dt>
                  <dd className="mt-1 font-medium text-[#0D1B2A]">
                    {profile.identitySource === 'CTG_ONE' ? 'Cuenta CTG One' : 'Cuenta Nvet local'}
                  </dd>
                </div>
                <KeyRound className="h-4 w-4 text-[#34B27A]" aria-hidden="true" />
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-[#0D1B2A]/8 pt-4">
                <div>
                  <dt className="font-semibold text-[#5B6670]">Correo verificado</dt>
                  <dd className="mt-1 font-medium text-[#0D1B2A]">{profile.emailVerified ? 'Verificado' : 'Pendiente'}</dd>
                </div>
                <CheckCircle2 className={`h-4 w-4 ${profile.emailVerified ? 'text-[#34B27A]' : 'text-[#5B6670]'}`} aria-hidden="true" />
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-[#0D1B2A]/8 pt-4">
                <div>
                  <dt className="font-semibold text-[#5B6670]">Autenticación en dos pasos</dt>
                  <dd className="mt-1 font-medium text-[#0D1B2A]">{profile.twoFactorEnabled ? 'Activa' : 'No activa'}</dd>
                </div>
                <ShieldCheck className={`h-4 w-4 ${profile.twoFactorEnabled ? 'text-[#34B27A]' : 'text-[#5B6670]'}`} aria-hidden="true" />
              </div>
            </dl>
          </article>

          <article className="rounded-3xl border border-[#0D1B2A]/10 bg-white p-6">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-[#237754]" aria-hidden="true" />
              <h2 className="text-sm font-bold text-[#0D1B2A]">Canales de avisos</h2>
            </div>
            <div className="mt-4 space-y-3 text-xs">
              <div className="flex items-center justify-between rounded-xl bg-[#34B27A]/[0.07] px-3 py-2.5">
                <span className="font-semibold text-[#0D1B2A]">Notificaciones dentro de Nvet</span>
                <span className="font-bold text-[#237754]">Activas</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-[#F2F4F7] px-3 py-2.5">
                <span className="font-semibold text-[#5B6670]">Correo</span>
                <span className="font-bold text-[#5B6670]">No desplegado</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-[#F2F4F7] px-3 py-2.5">
                <span className="font-semibold text-[#5B6670]">Push</span>
                <span className="font-bold text-[#5B6670]">No desplegado</span>
              </div>
            </div>
          </article>
        </aside>
      </section>

      <section className="rounded-3xl border border-[#0D1B2A]/10 bg-white p-6 shadow-[0_1px_3px_rgba(13,27,42,0.04)] sm:p-7">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0D1B2A]/[0.05] text-[#0D1B2A]">
            <Laptop className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-base font-bold text-[#0D1B2A]">Sesiones activas</h2>
            <p className="mt-1 text-xs leading-5 text-[#5B6670]">
              Revisa los dispositivos con sesión Nvet vigente y revoca los que ya no reconozcas o no utilices.
            </p>
          </div>
        </div>

        {sessions.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-[#0D1B2A]/15 bg-[#F8F9FA] p-6 text-center text-sm text-[#5B6670]">
            No hay otras sesiones activas disponibles en el registro.
          </div>
        ) : (
          <div className="mt-6 divide-y divide-[#0D1B2A]/8 overflow-hidden rounded-2xl border border-[#0D1B2A]/10">
            {sessions.map((session) => {
              const DeviceIcon = deviceIcon(session);
              return (
                <div key={session.id} className="flex flex-col gap-4 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F2F4F7] text-[#5B6670]">
                      <DeviceIcon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#0D1B2A]">{session.deviceLabel || 'Dispositivo sin nombre'}</p>
                      <p className="mt-1 text-[11px] text-[#5B6670]">Último uso: {formatMoment(session.lastUsedAt)}</p>
                      <p className="mt-1 text-[11px] text-[#5B6670]/80">Vence: {formatMoment(session.expiresAt)}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => revokeSession(session.id)}
                    disabled={isPending || revokingSessionId === session.id}
                    className="inline-flex shrink-0 items-center justify-center rounded-xl border border-red-200 px-4 py-2.5 text-xs font-bold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {revokingSessionId === session.id ? 'Cerrando…' : 'Cerrar sesión'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
