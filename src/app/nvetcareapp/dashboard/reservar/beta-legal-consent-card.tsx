'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';
import { NVET_BETA_PRIVACY_VERSION, NVET_BETA_TERMS_VERSION } from '@/lib/nvetcareapp/legal';

type LegalStatus = {
  accepted?: boolean;
  acceptedAt?: string | null;
  terms?: { version?: string };
  privacy?: { version?: string };
};

export function BetaLegalConsentCard({ onAcceptanceChange }: { onAcceptanceChange: (accepted: boolean) => void }) {
  const [loading, setLoading] = useState(true);
  const [accepted, setAccepted] = useState(false);
  const [checked, setChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [versionMismatch, setVersionMismatch] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const response = await fetch('/api/nvetcareapp/beta/legal', { cache: 'no-store' });
        const data = (await response.json().catch(() => null)) as LegalStatus | null;
        if (!active) return;
        if (!response.ok || !data) {
          setError('No pudimos verificar el consentimiento legal. La reserva permanece bloqueada.');
          onAcceptanceChange(false);
          return;
        }
        const synced =
          data.terms?.version === NVET_BETA_TERMS_VERSION &&
          data.privacy?.version === NVET_BETA_PRIVACY_VERSION;
        setVersionMismatch(!synced);
        const currentAccepted = synced && data.accepted === true;
        setAccepted(currentAccepted);
        setChecked(currentAccepted);
        onAcceptanceChange(currentAccepted);
      } catch {
        if (active) {
          setError('No pudimos verificar el consentimiento legal. La reserva permanece bloqueada.');
          onAcceptanceChange(false);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [onAcceptanceChange]);

  async function acceptCurrent() {
    if (!checked || versionMismatch) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch('/api/nvetcareapp/beta/legal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accepted: true,
          termsVersion: NVET_BETA_TERMS_VERSION,
          privacyVersion: NVET_BETA_PRIVACY_VERSION,
        }),
      });
      const data = (await response.json().catch(() => null)) as LegalStatus | { message?: string } | null;
      if (!response.ok) {
        setError((data && 'message' in data && data.message) || 'No se pudo registrar la aceptación.');
        onAcceptanceChange(false);
        return;
      }
      setAccepted(true);
      onAcceptanceChange(true);
    } catch {
      setError('No se pudo registrar la aceptación. Intenta de nuevo.');
      onAcceptanceChange(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-2xl border border-[#34B27A]/20 bg-[#34B27A]/[0.05] p-4" aria-labelledby="nvet-legal-consent-title">
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#237754]" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h3 id="nvet-legal-consent-title" className="text-sm font-bold text-[#0D1B2A]">Consentimiento y condiciones vigentes</h3>
          <p className="mt-1 text-xs leading-5 text-[#5B6670]">
            Antes de reservar, debes aceptar expresamente los <Link className="font-semibold text-[#237754] underline-offset-2 hover:underline" href="/nvetcareapp/terminos" target="_blank">Términos</Link> y la{' '}
            <Link className="font-semibold text-[#237754] underline-offset-2 hover:underline" href="/nvetcareapp/privacidad" target="_blank">Política de Privacidad</Link> vigentes.
          </p>

          {loading ? (
            <p className="mt-3 inline-flex items-center gap-2 text-xs text-[#5B6670]"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Verificando aceptación…</p>
          ) : accepted ? (
            <p className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-[#237754]"><CheckCircle2 className="h-4 w-4" /> Aceptación vigente registrada</p>
          ) : versionMismatch ? (
            <p className="mt-3 text-xs font-semibold text-[#B54708]" role="alert">
              Las versiones públicas y las exigidas por el backend no coinciden. La reserva queda bloqueada hasta sincronizarlas.
            </p>
          ) : (
            <div className="mt-3 space-y-3">
              <label className="flex cursor-pointer items-start gap-2 text-xs leading-5 text-[#33414D]">
                <input className="mt-1" type="checkbox" checked={checked} onChange={(event) => setChecked(event.target.checked)} />
                <span>He leído y acepto los Términos y la Política de Privacidad vigentes de Nvet Care.</span>
              </label>
              <button
                type="button"
                onClick={() => void acceptCurrent()}
                disabled={!checked || submitting}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#0D1B2A] px-4 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-45"
              >
                {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Registrar aceptación
              </button>
            </div>
          )}

          {error && <p className="mt-3 text-xs font-semibold text-[#B91C1C]" role="alert">{error}</p>}
        </div>
      </div>
    </section>
  );
}
