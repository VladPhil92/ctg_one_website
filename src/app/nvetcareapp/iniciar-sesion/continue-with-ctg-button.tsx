'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

// "Continuar con mi cuenta CTG One" — Fase 4, docs/identity/ADR-001.
// Solo se muestra si ya hay una sesión de ctgone.com activa; alguien sin
// cuenta CTG One simplemente no la ve y usa el formulario existente debajo
// (no reemplazado, no deprecado). Additiva por completo: si esto falla por
// cualquier motivo, el formulario de siempre sigue funcionando igual.
export function ContinueWithCtgButton({ next, hasExplicitNext = false }: { next: string; hasExplicitNext?: boolean }) {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, email } = useAuth();

  const [needsTwoFactor, setNeedsTwoFactor] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (authLoading || !isAuthenticated) {
    return null;
  }

  async function exchange(code?: string) {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/nvetcareapp/auth/ctg-identity-exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ twoFactorCode: code || undefined }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        if (data?.error === 'TWO_FACTOR_REQUIRED') {
          setNeedsTwoFactor(true);
          setError('Ingresa el código de tu autenticador para continuar.');
          return;
        }
        setError(data?.message || 'No se pudo continuar con tu cuenta CTG One.');
        return;
      }

      if (!hasExplicitNext && data?.user?.role === 'VET') {
        router.push('/nvetcareapp/dashboard/veterinario');
        router.refresh();
        return;
      }

      router.push(next);
      router.refresh();
    } catch {
      setError('No se pudo contactar el servicio. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mb-6">
      <button
        type="button"
        onClick={() => exchange(needsTwoFactor ? twoFactorCode : undefined)}
        disabled={submitting || (needsTwoFactor && !twoFactorCode)}
        className="w-full flex items-center justify-center gap-2 rounded-lg border border-[#0D1B2A]/15 bg-white px-4 py-2.5 text-sm font-medium text-[#0D1B2A] transition hover:bg-[#0D1B2A]/5 disabled:opacity-60"
      >
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
        Continuar con mi cuenta CTG One{email ? ` (${email})` : ''}
      </button>

      {needsTwoFactor && (
        <div className="mt-3">
          <label htmlFor="ctgTwoFactorCode" className="block text-sm font-medium text-[#333A40] mb-1">
            Código del autenticador
          </label>
          <input
            id="ctgTwoFactorCode"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={twoFactorCode}
            onChange={(e) => setTwoFactorCode(e.target.value)}
            className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-[#0D1B2A] focus:outline-none focus:ring-2 focus:ring-[#34B27A]"
          />
          <button
            type="button"
            onClick={() => exchange(twoFactorCode)}
            disabled={submitting || !twoFactorCode}
            className="mt-2 w-full rounded-lg bg-[#0D1B2A] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#0D1B2A]/90 disabled:opacity-60"
          >
            {submitting && <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />}
            Confirmar
          </button>
        </div>
      )}

      {error && (
        <p className="mt-2 text-sm text-[#B91C1C]" role="alert">
          {error}
        </p>
      )}

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-black/10" />
        <span className="text-xs uppercase tracking-wide text-[#4A5A68]">o</span>
        <div className="h-px flex-1 bg-black/10" />
      </div>
    </div>
  );
}
