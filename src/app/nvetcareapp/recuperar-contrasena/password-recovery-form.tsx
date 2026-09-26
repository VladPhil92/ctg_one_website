'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { CheckCircle2, Loader2, Mail } from 'lucide-react';

export function PasswordRecoveryForm() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch('/api/nvetcareapp/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = (await response.json().catch(() => null)) as { message?: string } | null;
      setOk(response.ok);
      setMessage(data?.message || 'Solicitud procesada.');
    } catch {
      setOk(false);
      setMessage('No se pudo procesar la solicitud. Intenta de nuevo.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F2F4F7] px-4 py-16 text-[#0D1B2A]">
      <div className="mx-auto max-w-md rounded-3xl border border-black/5 bg-white p-7 shadow-sm sm:p-8">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#34B27A]/10 text-[#237754]"><Mail className="h-5 w-5" /></span>
        <h1 className="mt-5 text-2xl font-bold">Recuperar contraseña</h1>
        <p className="mt-2 text-sm leading-6 text-[#5B6670]">
          Este flujo aplica a cuentas Nvet con contraseña local. Si accedes mediante CTG One, gestiona las credenciales desde tu identidad CTG One.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block text-sm font-medium text-[#333A40]">Correo electrónico
            <input required type="email" autoComplete="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 w-full rounded-xl border border-black/10 px-3.5 py-3 text-sm" />
          </label>
          <button disabled={busy} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#0D1B2A] px-4 py-3 text-sm font-bold text-white disabled:opacity-50">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Enviar instrucciones
          </button>
        </form>

        {message && (
          <div className={`mt-4 flex items-start gap-2 rounded-xl p-3 text-sm ${ok ? 'bg-[#34B27A]/[0.07] text-[#237754]' : 'bg-red-50 text-red-700'}`} role={ok ? 'status' : 'alert'}>
            {ok && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}{message}
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-xs">
          <Link className="font-semibold text-[#237754]" href="/nvetcareapp/iniciar-sesion">Volver a iniciar sesión</Link>
          <Link className="font-semibold text-[#237754]" href="/nvetcareapp/privacidad">Privacidad</Link>
        </div>
      </div>
    </main>
  );
}
