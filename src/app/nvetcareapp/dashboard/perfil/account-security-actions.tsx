'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { AlertTriangle, KeyRound, Loader2, ShieldCheck, Trash2 } from 'lucide-react';

type Blocker = {
  code: string;
  message: string;
  count?: number;
};

type DeletionReadiness = {
  canDelete: boolean;
  reauthMethod: 'PASSWORD' | 'SESSION';
  twoFactorRequired: boolean;
  blockers: Blocker[];
  confirmationPhrase: string;
  retainedCategories: string[];
  erasedCategories: string[];
};

export function AccountSecurityActions({
  identitySource,
  twoFactorEnabled,
}: {
  identitySource: 'CTG_ONE' | 'NVET_LOCAL';
  twoFactorEnabled: boolean;
}) {
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [readiness, setReadiness] = useState<DeletionReadiness | null>(null);
  const [deletionBusy, setDeletionBusy] = useState(false);
  const [deletionError, setDeletionError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError(null);
    if (newPassword !== confirmPassword) {
      setPasswordError('La confirmación de la nueva contraseña no coincide.');
      return;
    }
    setPasswordBusy(true);
    try {
      const response = await fetch('/api/nvetcareapp/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) {
        setPasswordError(data?.message || 'No se pudo cambiar la contraseña.');
        return;
      }
      window.location.assign('/nvetcareapp/iniciar-sesion?passwordChanged=1');
    } catch {
      setPasswordError('No se pudo contactar el servicio de seguridad.');
    } finally {
      setPasswordBusy(false);
    }
  }

  async function openDeletion() {
    setDeleteOpen(true);
    setDeletionError(null);
    setReadiness(null);
    try {
      const response = await fetch('/api/nvetcareapp/auth/account', { cache: 'no-store' });
      const data = (await response.json().catch(() => null)) as DeletionReadiness | { message?: string } | null;
      if (!response.ok || !data || !('canDelete' in data)) {
        setDeletionError((data && 'message' in data && data.message) || 'No se pudo verificar si la cuenta puede eliminarse.');
        return;
      }
      setReadiness(data);
    } catch {
      setDeletionError('No se pudo verificar si la cuenta puede eliminarse.');
    }
  }

  async function deleteAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!readiness?.canDelete) return;
    setDeletionBusy(true);
    setDeletionError(null);
    try {
      const response = await fetch('/api/nvetcareapp/auth/account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmation,
          ...(readiness.reauthMethod === 'PASSWORD' ? { currentPassword: deletePassword } : {}),
          ...(readiness.twoFactorRequired ? { twoFactorCode } : {}),
        }),
      });
      const data = (await response.json().catch(() => null)) as { message?: string; blockers?: Blocker[] } | null;
      if (!response.ok) {
        setDeletionError(data?.message || 'No se pudo eliminar la cuenta.');
        if (data?.blockers) {
          setReadiness((current) => current ? { ...current, canDelete: false, blockers: data.blockers ?? [] } : current);
        }
        return;
      }
      window.location.assign('/nvetcareapp?accountDeleted=1');
    } catch {
      setDeletionError('No se pudo contactar el servicio de cuenta.');
    } finally {
      setDeletionBusy(false);
    }
  }

  return (
    <section className="mt-6 grid gap-6 lg:grid-cols-2">
      <article className="rounded-3xl border border-[#0D1B2A]/10 bg-white p-6 shadow-[0_1px_3px_rgba(13,27,42,0.04)] sm:p-7">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#34B27A]/10 text-[#237754]">
            <KeyRound className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-base font-bold text-[#0D1B2A]">Contraseña y acceso</h2>
            <p className="mt-1 text-xs leading-5 text-[#5B6670]">
              {identitySource === 'NVET_LOCAL'
                ? 'Cambia tu contraseña local. Al hacerlo se cierran las sesiones y deberás iniciar sesión de nuevo.'
                : 'Esta cuenta usa identidad federada de CTG One; Nvet no mantiene una contraseña local independiente para este acceso.'}
            </p>
          </div>
        </div>

        {identitySource === 'NVET_LOCAL' ? (
          <>
            <button type="button" onClick={() => setPasswordOpen((value) => !value)} className="mt-5 min-h-11 rounded-xl bg-[#0D1B2A] px-4 py-2 text-xs font-bold text-white">
              {passwordOpen ? 'Cancelar cambio' : 'Cambiar contraseña'}
            </button>
            {passwordOpen && (
              <form className="mt-5 space-y-3" onSubmit={changePassword}>
                <label className="block text-xs font-semibold text-[#44505B]">Contraseña actual
                  <input required autoComplete="current-password" type="password" maxLength={128} value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="mt-1 w-full rounded-xl border border-[#0D1B2A]/10 px-3.5 py-3 text-sm" />
                </label>
                <label className="block text-xs font-semibold text-[#44505B]">Nueva contraseña
                  <input required autoComplete="new-password" type="password" minLength={12} maxLength={128} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="mt-1 w-full rounded-xl border border-[#0D1B2A]/10 px-3.5 py-3 text-sm" />
                </label>
                <label className="block text-xs font-semibold text-[#44505B]">Confirmar nueva contraseña
                  <input required autoComplete="new-password" type="password" minLength={12} maxLength={128} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="mt-1 w-full rounded-xl border border-[#0D1B2A]/10 px-3.5 py-3 text-sm" />
                </label>
                <p className="text-[11px] leading-5 text-[#5B6670]">Mínimo 12 caracteres, con mayúscula, minúscula, número y símbolo.</p>
                {passwordError && <p role="alert" className="text-xs font-semibold text-[#B91C1C]">{passwordError}</p>}
                <button disabled={passwordBusy} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#34B27A] px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
                  {passwordBusy && <Loader2 className="h-4 w-4 animate-spin" />} Guardar nueva contraseña
                </button>
              </form>
            )}
          </>
        ) : (
          <div className="mt-5 rounded-2xl bg-[#F7FAF8] p-4 text-xs leading-5 text-[#5B6670]">
            Para modificar las credenciales principales utiliza el flujo de seguridad de tu cuenta CTG One.
          </div>
        )}
      </article>

      <article className="rounded-3xl border border-red-200 bg-white p-6 shadow-[0_1px_3px_rgba(13,27,42,0.04)] sm:p-7">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-700">
            <Trash2 className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-base font-bold text-[#0D1B2A]">Privacidad y eliminación de cuenta</h2>
            <p className="mt-1 text-xs leading-5 text-[#5B6670]">
              Puedes solicitar la eliminación desde aquí o utilizar el recurso público sin tener la aplicación instalada.
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" onClick={() => void openDeletion()} className="min-h-11 rounded-xl border border-red-200 px-4 py-2 text-xs font-bold text-red-700 hover:bg-red-50">
            Revisar eliminación
          </button>
          <Link href="/nvetcareapp/eliminar-cuenta" className="inline-flex min-h-11 items-center rounded-xl border border-[#0D1B2A]/10 px-4 py-2 text-xs font-bold text-[#0D1B2A]">
            Recurso público
          </Link>
        </div>

        {deleteOpen && (
          <div className="mt-5 border-t border-red-100 pt-5">
            {!readiness && !deletionError && <p className="inline-flex items-center gap-2 text-xs text-[#5B6670]"><Loader2 className="h-4 w-4 animate-spin" /> Verificando obligaciones abiertas…</p>}

            {readiness && !readiness.canDelete && (
              <div className="rounded-2xl bg-amber-50 p-4">
                <p className="flex items-center gap-2 text-xs font-bold text-amber-900"><AlertTriangle className="h-4 w-4" /> La cuenta aún no puede eliminarse</p>
                <ul className="mt-2 space-y-1 text-xs leading-5 text-amber-900">
                  {readiness.blockers.map((blocker) => <li key={blocker.code}>• {blocker.message}{typeof blocker.count === 'number' ? ` (${blocker.count})` : ''}</li>)}
                </ul>
              </div>
            )}

            {readiness?.canDelete && (
              <form className="space-y-3" onSubmit={deleteAccount}>
                <div className="rounded-2xl bg-[#F7FAF8] p-4 text-xs leading-5 text-[#5B6670]">
                  <p className="font-bold text-[#0D1B2A]">Antes de continuar</p>
                  <p className="mt-1">Se eliminarán credenciales, sesiones y datos operativos que ya no deban conservarse. Algunos registros clínicos, financieros o de auditoría pueden conservarse de forma limitada o pseudonimizada por continuidad, trazabilidad, seguridad u obligaciones aplicables.</p>
                </div>
                <label className="block text-xs font-semibold text-[#44505B]">Escribe exactamente “{readiness.confirmationPhrase}”
                  <input required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="mt-1 w-full rounded-xl border border-red-200 px-3.5 py-3 text-sm" />
                </label>
                {readiness.reauthMethod === 'PASSWORD' && (
                  <label className="block text-xs font-semibold text-[#44505B]">Contraseña actual
                    <input required autoComplete="current-password" type="password" value={deletePassword} onChange={(event) => setDeletePassword(event.target.value)} className="mt-1 w-full rounded-xl border border-red-200 px-3.5 py-3 text-sm" />
                  </label>
                )}
                {(readiness.twoFactorRequired || twoFactorEnabled) && (
                  <label className="block text-xs font-semibold text-[#44505B]">Código del autenticador
                    <input required inputMode="numeric" autoComplete="one-time-code" minLength={6} maxLength={8} value={twoFactorCode} onChange={(event) => setTwoFactorCode(event.target.value.replace(/\D/g, ''))} className="mt-1 w-full rounded-xl border border-red-200 px-3.5 py-3 text-sm" />
                  </label>
                )}
                <button disabled={deletionBusy || confirmation !== readiness.confirmationPhrase} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-red-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-45">
                  {deletionBusy && <Loader2 className="h-4 w-4 animate-spin" />} Eliminar definitivamente mi cuenta
                </button>
              </form>
            )}

            {deletionError && <p role="alert" className="mt-3 text-xs font-semibold text-[#B91C1C]">{deletionError}</p>}
          </div>
        )}

        <div className="mt-5 flex items-center gap-2 text-[11px] leading-5 text-[#5B6670]">
          <ShieldCheck className="h-4 w-4 shrink-0 text-[#237754]" aria-hidden="true" />
          <span>Consulta también la <Link className="font-semibold text-[#237754]" href="/nvetcareapp/privacidad">Política de Privacidad</Link>.</span>
        </div>
      </article>
    </section>
  );
}
