'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Cookie, Settings2, X } from 'lucide-react';
import { NVET_COOKIE_POLICY_VERSION } from '@/lib/nvetcareapp/legal';

const STORAGE_KEY = 'nvet_cookie_consent';
const COOKIE_NAME = 'nvet_cookie_consent';

type Consent = {
  version: string;
  necessary: true;
  analytics: boolean;
  decidedAt: string;
};

function persistConsent(analytics: boolean) {
  const consent: Consent = {
    version: NVET_COOKIE_POLICY_VERSION,
    necessary: true,
    analytics,
    decidedAt: new Date().toISOString(),
  };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
  } catch {
    // The preference cookie remains the fallback when localStorage is unavailable.
  }
  const maxAge = 60 * 60 * 24 * 180;
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(JSON.stringify(consent))}; Max-Age=${maxAge}; Path=/; SameSite=Lax; Secure`;
  window.dispatchEvent(new CustomEvent('nvet-cookie-consent-changed', { detail: consent }));
}

function readConsent(): Consent | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Consent>;
    if (parsed.version !== NVET_COOKIE_POLICY_VERSION || parsed.necessary !== true || typeof parsed.analytics !== 'boolean') {
      return null;
    }
    return parsed as Consent;
  } catch {
    return null;
  }
}

export function NvetCookieConsent() {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [hasDecision, setHasDecision] = useState(false);

  useEffect(() => {
    const existing = readConsent();
    if (existing) {
      setAnalytics(existing.analytics);
      setHasDecision(true);
      return;
    }
    setOpen(true);
  }, []);

  const save = (nextAnalytics: boolean) => {
    persistConsent(nextAnalytics);
    setAnalytics(nextAnalytics);
    setHasDecision(true);
    setSettings(false);
    setOpen(false);
  };

  if (!open && hasDecision) {
    return (
      <button
        type="button"
        onClick={() => {
          setSettings(true);
          setOpen(true);
        }}
        className="fixed bottom-20 left-3 z-[70] inline-flex min-h-11 items-center gap-2 rounded-full border border-[#0D1B2A]/10 bg-white px-4 py-2 text-xs font-bold text-[#0D1B2A] shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#34B27A]"
      >
        <Settings2 className="h-4 w-4" aria-hidden="true" />
        Cookies
      </button>
    );
  }

  if (!open) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-[80] mx-auto max-w-3xl rounded-3xl border border-[#0D1B2A]/10 bg-white p-5 text-[#0D1B2A] shadow-2xl sm:bottom-5 sm:p-6" role="dialog" aria-modal="false" aria-labelledby="nvet-cookie-title">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#34B27A]/10 text-[#237754]">
          <Cookie className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="nvet-cookie-title" className="text-base font-bold">Tus preferencias de cookies en Nvet Care</h2>
              <p className="mt-1 text-xs leading-5 text-[#5B6670]">
                Usamos tecnologías necesarias para sesión y seguridad. Las analíticas de Nvet solo deben activarse cuando las aceptas.
                Consulta la <Link className="font-semibold text-[#237754] underline-offset-2 hover:underline" href="/nvetcareapp/cookies">Política de Cookies</Link>.
              </p>
            </div>
            {hasDecision && (
              <button type="button" aria-label="Cerrar configuración de cookies" onClick={() => setOpen(false)} className="rounded-lg p-2 text-[#5B6670] hover:bg-[#F2F4F7]">
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>

          {settings && (
            <div className="mt-4 space-y-2 rounded-2xl bg-[#F7FAF8] p-4 text-xs">
              <label className="flex items-start justify-between gap-4">
                <span><strong>Necesarias</strong><span className="mt-1 block text-[#5B6670]">Sesión, seguridad y preferencia de consentimiento.</span></span>
                <input type="checkbox" checked readOnly disabled aria-label="Cookies necesarias, siempre activas" />
              </label>
              <label className="flex items-start justify-between gap-4 border-t border-[#0D1B2A]/8 pt-3">
                <span><strong>Analíticas</strong><span className="mt-1 block text-[#5B6670]">Medición de uso y mejora del producto Nvet.</span></span>
                <input type="checkbox" checked={analytics} onChange={(event) => setAnalytics(event.target.checked)} aria-label="Permitir cookies analíticas" />
              </label>
              <div className="flex items-start justify-between gap-4 border-t border-[#0D1B2A]/8 pt-3 opacity-70">
                <span><strong>Marketing</strong><span className="mt-1 block text-[#5B6670]">Nvet Care no las habilita en esta versión.</span></span>
                <input type="checkbox" checked={false} readOnly disabled aria-label="Cookies de marketing no habilitadas" />
              </div>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => save(false)} className="min-h-11 rounded-xl border border-[#0D1B2A]/12 px-4 py-2 text-xs font-bold">
              Solo necesarias
            </button>
            {!settings && (
              <button type="button" onClick={() => setSettings(true)} className="min-h-11 rounded-xl border border-[#0D1B2A]/12 px-4 py-2 text-xs font-bold">
                Configurar
              </button>
            )}
            <button type="button" onClick={() => save(settings ? analytics : true)} className="min-h-11 rounded-xl bg-[#0D1B2A] px-4 py-2 text-xs font-bold text-white">
              {settings ? 'Guardar preferencias' : 'Aceptar analíticas'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
