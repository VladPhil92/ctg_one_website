'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, KeyRound, Loader2 } from 'lucide-react';

export function NvetResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    if (!token) {
      setOk(false);
      setMessage('El enlace no contiene un token de recuperación válido.');
      return;
    }
    if (password !== confirm) {
      setOk(false);
      setMessage('La confirmación de la contraseña no coincide.');
      return;
    }
    setBusy(true);
    try {
      const response = await fetch('/api/nvetcareapp/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = (await response.json().catch(() => null)) as { message?: string } | null;
      setOk(response.ok);
      setMessage(data?.message || (response.ok ? 'Contraseña actualizada.' : 'No se pudo actualizar la contraseña.'));
    } catch {
      setOk(false);
      setMessage('No se pudo procesar el cambio de contraseña.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F2F4F7] px-4 py-16 text-[#0D1B2A]">
      <div className="mx-auto max-w-md rounded-3xl border border-black/5 bg-white p-7 shadow-sm sm:p-8">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#34B27A]/10 text-[#237754]"><KeyRound className="h-5 w-5" /></span>
        <h1 className="mt-5 text-2xl font-bold">Crear nueva contraseña</h1>
        <p className="mt-2 text-sm leading-6 text-[#5B6670]">El enlace de recuperación es temporal. Al completar el cambio se invalidan las sesiones anteriores.</p>

        {!ok && (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <label className="block text-sm font-medium text-[#333A40]">Nueva contraseña
              <input required type="password" autoComplete="new-password" minLength={12} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 w-full rounded-xl border border-black/10 px-3.5 py-3 text-sm" />
            </label>
            <label className="block text-sm font-medium text-[#333A40]">Confirmar contraseña
              <input required type="password" autoComplete="new-password" minLength={12} maxLength={128} value={confirm} onChange={(event) => setConfirm(event.target.value)} className="mt-1 w-full rounded-xl border border-black/10 px-3.5 py-3 text-sm" />
            </label>
            <p className="text-[11px] leading-5 text-[#5B6670]">Mínimo 12 caracteres, con mayúscula, minúscula, número y símbolo.</p>
            <button disabled={busy || !token} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#0D1B2A] px-4 py-3 text-sm font-bold text-white disabled:opacity-50">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Actualizar contraseña
            </button>
          </form>
        )}

        {message && (
          <div className={`mt-4 flex items-start gap-2 rounded-xl p-3 text-sm ${ok ? 'bg-[#34B27A]/[0.07] text-[#237754]' : 'bg-red-50 text-red-700'}`} role={ok ? 'status' : 'alert'}>
            {ok && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}{message}
          </div>
        )}

        <Link href="/nvetcareapp/iniciar-sesion" className="mt-6 inline-block text-xs font-semibold text-[#237754]">Ir a iniciar sesión</Link>
      </div>
    </main>
  );
}
