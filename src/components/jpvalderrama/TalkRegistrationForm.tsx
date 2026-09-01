'use client';

import { useState, type FormEvent } from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

type RegistrationResponse = {
  ok?: boolean;
  alreadyRegistered?: boolean;
};

export function TalkRegistrationForm() {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('submitting');
    setAlreadyRegistered(false);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = {
      eventSlug: 'filosofia-o-dinero',
      fullName: String(formData.get('fullName') ?? ''),
      email: String(formData.get('email') ?? ''),
      phone: String(formData.get('phone') ?? ''),
      consent: formData.get('consent') === 'on',
      website: String(formData.get('website') ?? ''),
    };

    try {
      const response = await fetch('/api/jpvalderrama/events/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = (await response.json().catch(() => ({}))) as RegistrationResponse;
      if (!response.ok || !result.ok) {
        setStatus('error');
        return;
      }

      setAlreadyRegistered(Boolean(result.alreadyRegistered));
      setStatus('success');
      form.reset();
    } catch {
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <div role="status" className="border border-[#6f0d12]/18 bg-[#fffaf2] p-7 sm:p-8">
        <CheckCircle2 className="h-8 w-8 text-[#6f0d12]" aria-hidden="true" />
        <h3 className="mt-5 font-serif text-3xl text-[#17110e]">
          {alreadyRegistered ? 'Tu correo ya estaba registrado.' : 'Tu registro fue recibido.'}
        </h3>
        <p className="mt-4 font-serif text-[16px] leading-7 text-[#564a42]">
          {alreadyRegistered
            ? 'No necesitas enviar el formulario de nuevo. Conservamos tu registro para esta conferencia.'
            : 'Quedaste registrado para recibir las instrucciones operativas de la conferencia.'}
        </p>
        <p className="mt-4 text-sm leading-6 text-[#665950]">
          Este formulario no cobra ni confirma el pago del ticket. El proceso de pago se gestiona por separado.
        </p>
        <button
          type="button"
          onClick={() => setStatus('idle')}
          className="mt-6 text-[10px] font-bold uppercase tracking-[.15em] text-[#6f0d12] underline decoration-[#6f0d12]/35 underline-offset-4"
        >
          Registrar otra persona
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="border border-[#6f0d12]/18 bg-[#fffaf2] p-7 sm:p-8" noValidate>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#6f0d12]">Inscripción</p>
        <h3 className="mt-3 font-serif text-3xl text-[#17110e]">Reserva tu registro</h3>
        <p className="mt-4 font-serif text-[16px] leading-7 text-[#665950]">
          Completa tus datos para quedar registrado en la conferencia. El ticket tiene un valor de $10.000; este formulario no procesa el pago.
        </p>
      </div>

      <div className="mt-7 grid gap-5">
        <label className="grid gap-2 text-sm font-semibold text-[#3e342e]">
          Nombre completo
          <input
            name="fullName"
            autoComplete="name"
            required
            minLength={2}
            maxLength={120}
            className="min-h-12 border border-[#6f0d12]/22 bg-[#fbf7f1] px-4 font-normal text-[#17110e] outline-none transition focus:border-[#6f0d12] focus:ring-2 focus:ring-[#6f0d12]/12"
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-[#3e342e]">
          Correo electrónico
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            className="min-h-12 border border-[#6f0d12]/22 bg-[#fbf7f1] px-4 font-normal text-[#17110e] outline-none transition focus:border-[#6f0d12] focus:ring-2 focus:ring-[#6f0d12]/12"
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-[#3e342e]">
          WhatsApp o teléfono <span className="font-normal text-[#665950]">(opcional)</span>
          <input
            name="phone"
            type="tel"
            autoComplete="tel"
            maxLength={32}
            className="min-h-12 border border-[#6f0d12]/22 bg-[#fbf7f1] px-4 font-normal text-[#17110e] outline-none transition focus:border-[#6f0d12] focus:ring-2 focus:ring-[#6f0d12]/12"
          />
        </label>
        <div className="absolute left-[-10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
          <label>
            Sitio web
            <input name="website" tabIndex={-1} autoComplete="off" />
          </label>
        </div>
        <label className="flex items-start gap-3 text-sm leading-6 text-[#564a42]">
          <input name="consent" type="checkbox" required className="mt-1 h-4 w-4 accent-[#6f0d12]" />
          <span>Acepto que mis datos sean utilizados para gestionar esta inscripción y las comunicaciones directamente relacionadas con la conferencia.</span>
        </label>
      </div>

      {status === 'error' ? (
        <p role="alert" className="mt-5 border-l-2 border-[#6f0d12] pl-4 text-sm leading-6 text-[#6f0d12]">
          No pudimos guardar tu registro en este momento. Intenta nuevamente o comunícate por WhatsApp al 3186428218.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-sm bg-[#6f0d12] px-6 text-xs font-bold uppercase tracking-[.13em] text-[#fffaf2] transition hover:bg-[#570a0e] disabled:cursor-wait disabled:opacity-65"
      >
        {status === 'submitting' ? 'Guardando registro…' : 'Registrarme'}
        {status !== 'submitting' ? <ArrowRight className="h-4 w-4" aria-hidden="true" /> : null}
      </button>
      <p className="mt-4 text-xs leading-5 text-[#665950]">
        No se solicita información de pago, contraseñas ni documentos de identidad en este formulario.
      </p>
    </form>
  );
}
