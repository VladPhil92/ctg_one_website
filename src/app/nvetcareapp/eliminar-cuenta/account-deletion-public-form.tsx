'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { CheckCircle2, Loader2, ShieldAlert } from 'lucide-react';

export function AccountDeletionPublicForm() {
  const [email, setEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [code, setCode] = useState('');
  const [requestBusy, setRequestBusy] = useState(false);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [requestMessage, setRequestMessage] = useState<string | null>(null);
  const [confirmMessage, setConfirmMessage] = useState<string | null>(null);
  const [deleted, setDeleted] = useState(false);

  async function requestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRequestBusy(true);
    setRequestMessage(null);
    try {
      const response = await fetch('/api/nvetcareapp/account-deletion/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = (await response.json().catch(() => null)) as { message?: string } | null;
      setRequestMessage(data?.message || 'Solicitud procesada.');
      if (response.ok) setConfirmEmail(email);
    } catch {
      setRequestMessage('No se pudo procesar la solicitud. Intenta de nuevo.');
    } finally {
      setRequestBusy(false);
    }
  }

  async function confirmDeletion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setConfirmBusy(true);
    setConfirmMessage(null);
    try {
      const response = await fetch('/api/nvetcareapp/account-deletion/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: confirmEmail, verificationCode: code }),
      });
      const data = (await response.json().catch(() => null)) as { message?: string } | null;
      setConfirmMessage(data?.message || 'No se pudo completar la solicitud.');
      setDeleted(response.ok);
    } catch {
      setConfirmMessage('No se pudo procesar la confirmación. Intenta de nuevo.');
    } finally {
      setConfirmBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {deleted && (
        <div className="flex items-start gap-3 rounded-2xl border border-[#34B27A]/20 bg-[#34B27A]/[0.07] p-4 text-sm text-[#237754]" role="status">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div><strong>Solicitud completada.</strong><p className="mt-1">{confirmMessage}</p></div>
        </div>
      )}

      <form onSubmit={requestCode} className="rounded-3xl border border-[#0D1B2A]/10 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-[#0D1B2A]">1. Solicita un código</h2>
        <p className="mt-2 text-sm leading-6 text-[#5B6670]">
          Por privacidad, la respuesta no confirma si un correo está registrado. Si existe una cuenta elegible, recibirás un código temporal.
        </p>
        <label className="mt-5 block text-xs font-semibold text-[#44505B]">Correo de la cuenta
          <input required type="email" autoComplete="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 w-full rounded-xl border border-[#0D1B2A]/10 px-3.5 py-3 text-sm" />
        </label>
        <button disabled={requestBusy} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#0D1B2A] px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
          {requestBusy && <Loader2 className="h-4 w-4 animate-spin" />} Solicitar código
        </button>
        {requestMessage && <p className="mt-3 text-xs leading-5 text-[#5B6670]" role="status">{requestMessage}</p>}
      </form>

      <form onSubmit={confirmDeletion} className="rounded-3xl border border-red-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 text-red-700"><ShieldAlert className="h-5 w-5" /><h2 className="text-lg font-bold text-[#0D1B2A]">2. Confirma la eliminación</h2></div>
        <p className="mt-2 text-sm leading-6 text-[#5B6670]">
          El código vence en 30 minutos. La eliminación puede bloquearse si existen citas activas, disputas, fondos o movimientos pendientes.
        </p>
        <div className="mt-5 grid gap-3">
          <label className="block text-xs font-semibold text-[#44505B]">Correo de la cuenta
            <input required type="email" autoComplete="email" maxLength={254} value={confirmEmail} onChange={(event) => setConfirmEmail(event.target.value)} className="mt-1 w-full rounded-xl border border-red-200 px-3.5 py-3 text-sm" />
          </label>
          <label className="block text-xs font-semibold text-[#44505B]">Código de eliminación
            <input required autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value)} pattern="[0-9]{10}\.[A-Fa-f0-9]{32}" className="mt-1 w-full rounded-xl border border-red-200 px-3.5 py-3 font-mono text-sm" />
          </label>
        </div>
        <button disabled={confirmBusy || deleted} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-red-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
          {confirmBusy && <Loader2 className="h-4 w-4 animate-spin" />} Confirmar y eliminar cuenta
        </button>
        {!deleted && confirmMessage && <p className="mt-3 text-xs font-semibold text-[#B91C1C]" role="alert">{confirmMessage}</p>}
      </form>

      <div className="rounded-2xl bg-[#F7FAF8] p-4 text-xs leading-5 text-[#5B6670]">
        <strong className="text-[#0D1B2A]">Retención limitada:</strong> algunos registros clínicos, financieros, profesionales o de auditoría pueden conservarse de forma limitada o pseudonimizada cuando sean necesarios para continuidad, trazabilidad, seguridad o una obligación aplicable. Consulta la{' '}
        <Link href="/nvetcareapp/privacidad" className="font-semibold text-[#237754]">Política de Privacidad</Link>.
      </div>
    </div>
  );
}
