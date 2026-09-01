'use client';

import { useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PawPrint, Loader2 } from 'lucide-react';
import { safeRedirectPath } from '@/lib/security/safe-redirect';
import { ContinueWithCtgButton } from './continue-with-ctg-button';

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedNext = searchParams.get('next');
  const next = safeRedirectPath(requestedNext, '/nvetcareapp/dashboard');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [needsTwoFactor, setNeedsTwoFactor] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/nvetcareapp/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, twoFactorCode: twoFactorCode || undefined }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        if (data?.error === 'TWO_FACTOR_REQUIRED') {
          setNeedsTwoFactor(true);
          setError('Ingresa el código de tu autenticador para continuar.');
          return;
        }
        setError(data?.message || 'No se pudo iniciar sesión. Verifica tus datos.');
        return;
      }

      const destination = !requestedNext && data?.user?.role === 'VET'
        ? '/nvetcareapp/dashboard/veterinario'
        : next;
      router.push(destination);
      router.refresh();
    } catch {
      setError('No se pudo contactar el servicio. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F2F4F7] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-8">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#34B27A]">
            <PawPrint className="h-5 w-5 text-white" strokeWidth={2.5} />
          </span>
          <span className="text-lg font-semibold text-[#0D1B2A]">Nvet Care</span>
        </div>

        <div className="rounded-2xl border border-black/5 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-semibold text-[#0D1B2A] mb-1">Iniciar sesión</h1>
          <p className="text-sm text-[#4A5A68] mb-6">Accede a tu cuenta para continuar en Nvet Care.</p>

          <ContinueWithCtgButton next={next} hasExplicitNext={Boolean(requestedNext)} />

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#333A40] mb-1">
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-[#0D1B2A] focus:outline-none focus:ring-2 focus:ring-[#34B27A]"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#333A40] mb-1">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-[#0D1B2A] focus:outline-none focus:ring-2 focus:ring-[#34B27A]"
              />
            </div>

            {needsTwoFactor && (
              <div>
                <label htmlFor="twoFactorCode" className="block text-sm font-medium text-[#333A40] mb-1">
                  Código del autenticador
                </label>
                <input
                  id="twoFactorCode"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value)}
                  className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-[#0D1B2A] focus:outline-none focus:ring-2 focus:ring-[#34B27A]"
                />
              </div>
            )}

            {error && (
              <p className="text-sm text-[#B91C1C]" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#0D1B2A] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#0D1B2A]/90 disabled:opacity-60"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
