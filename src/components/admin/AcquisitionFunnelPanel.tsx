'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, RefreshCw, Target, Users, Zap } from 'lucide-react';
import { Button } from '@/components/ui/Button';

type FunnelStages = {
  home_viewed: number;
  create_account_clicked: number;
  signup_started: number;
  email_verified: number;
  first_login: number;
  dashboard_viewed: number;
  first_service_used: number;
};

type FunnelSnapshot = {
  generated_at: string;
  window_days: number;
  stages: FunnelStages;
  conversion_pct: {
    home_to_create_account: number;
    create_account_to_signup: number;
    signup_to_verified: number;
    verified_to_first_login: number;
    first_login_to_dashboard: number;
    dashboard_to_first_service: number;
    home_to_first_service: number;
  };
  first_service_breakdown: Record<string, number>;
};

const STAGES: Array<{ key: keyof FunnelStages; label: string; short: string }> = [
  { key: 'home_viewed', label: 'Home viewed', short: 'Home' },
  { key: 'create_account_clicked', label: 'Crear cuenta', short: 'CTA' },
  { key: 'signup_started', label: 'Registro iniciado', short: 'Signup' },
  { key: 'email_verified', label: 'Email verificado', short: 'Verified' },
  { key: 'first_login', label: 'Primer login', short: 'Login' },
  { key: 'dashboard_viewed', label: 'Dashboard visto', short: 'Dashboard' },
  { key: 'first_service_used', label: 'Primer servicio', short: 'Activated' },
];

const CONVERSIONS: Array<{ key: keyof FunnelSnapshot['conversion_pct']; label: string }> = [
  { key: 'home_to_create_account', label: 'Home → Crear cuenta' },
  { key: 'create_account_to_signup', label: 'Crear cuenta → Registro' },
  { key: 'signup_to_verified', label: 'Registro → Email verificado' },
  { key: 'verified_to_first_login', label: 'Verificado → Primer login' },
  { key: 'first_login_to_dashboard', label: 'Login → Dashboard' },
  { key: 'dashboard_to_first_service', label: 'Dashboard → Primer servicio' },
];

const SERVICE_LABELS: Record<string, string> = {
  investment: 'Investment',
  wallet: 'Wallet',
  identity: 'Identity',
  knowledge: 'Knowledge',
  nvet: 'Nvet Care',
};

function formatPct(value: number) {
  return `${Number.isFinite(value) ? value.toFixed(2) : '0.00'}%`;
}

export function AcquisitionFunnelPanel() {
  const [windowDays, setWindowDays] = useState(30);
  const [snapshot, setSnapshot] = useState<FunnelSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/analytics/funnel?days=${windowDays}`, { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'No fue posible cargar el embudo.');
      setSnapshot(payload as FunnelSnapshot);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible cargar el embudo.');
    } finally {
      setLoading(false);
    }
  }, [windowDays]);

  useEffect(() => { void refresh(); }, [refresh]);

  const maxStage = useMemo(() => {
    if (!snapshot) return 1;
    return Math.max(1, ...Object.values(snapshot.stages));
  }, [snapshot]);

  const serviceBreakdown = useMemo(() => {
    if (!snapshot) return [];
    return Object.entries(snapshot.first_service_breakdown)
      .sort((a, b) => b[1] - a[1]);
  }, [snapshot]);

  return (
    <div className="space-y-6">
      <header className="rounded-[28px] border border-white/10 p-6 sm:p-8" style={{ background: 'linear-gradient(135deg,rgba(18,18,18,.98),rgba(7,7,7,.95))' }}>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-3 text-[9px] uppercase tracking-[.28em] text-accent">CTG One · Growth Intelligence</p>
            <h1 className="font-outfit text-3xl font-semibold sm:text-5xl">Acquisition & Activation</h1>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-text-muted">
              Embudo first-party desde la visita inicial hasta el primer servicio utilizado. Sólo muestra agregados y conversiones; los eventos raw permanecen fuera del navegador.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {[7, 30, 90].map(days => (
              <button
                key={days}
                type="button"
                onClick={() => setWindowDays(days)}
                className={`rounded-xl border px-3 py-2 text-[9px] uppercase tracking-[.12em] transition-colors ${windowDays === days ? 'border-accent/40 bg-accent/[.10] text-accent' : 'border-white/10 bg-white/[.025] text-text-muted hover:text-white'}`}
              >
                {days} días
              </button>
            ))}
            <Button variant="secondary" size="sm" onClick={() => void refresh()} disabled={loading}>
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> {loading ? 'Actualizando' : 'Actualizar'}
            </Button>
          </div>
        </div>
      </header>

      {error && <div className="rounded-xl border border-red-500/30 bg-red-500/[.06] px-4 py-3 text-sm text-red-300">{error}</div>}

      {snapshot && (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <article className="rounded-2xl border border-white/10 bg-white/[.02] p-5">
              <Users size={18} className="mb-4 text-accent" />
              <p className="text-[9px] uppercase tracking-[.15em] text-text-dim">Entradas al funnel</p>
              <p className="mt-2 font-outfit text-3xl font-semibold">{snapshot.stages.home_viewed.toLocaleString()}</p>
            </article>
            <article className="rounded-2xl border border-white/10 bg-white/[.02] p-5">
              <Target size={18} className="mb-4 text-accent" />
              <p className="text-[9px] uppercase tracking-[.15em] text-text-dim">Usuarios activados</p>
              <p className="mt-2 font-outfit text-3xl font-semibold">{snapshot.stages.first_service_used.toLocaleString()}</p>
            </article>
            <article className="rounded-2xl border border-white/10 bg-white/[.02] p-5">
              <Zap size={18} className="mb-4 text-accent" />
              <p className="text-[9px] uppercase tracking-[.15em] text-text-dim">Conversión total</p>
              <p className="mt-2 font-outfit text-3xl font-semibold">{formatPct(snapshot.conversion_pct.home_to_first_service)}</p>
            </article>
            <article className="rounded-2xl border border-white/10 bg-white/[.02] p-5">
              <Activity size={18} className="mb-4 text-accent" />
              <p className="text-[9px] uppercase tracking-[.15em] text-text-dim">Ventana</p>
              <p className="mt-2 font-outfit text-3xl font-semibold">{snapshot.window_days} días</p>
            </article>
          </section>

          <section className="rounded-[24px] border border-white/10 bg-white/[.018] p-5 sm:p-6">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <p className="text-[9px] uppercase tracking-[.18em] text-accent">Funnel depth</p>
                <h2 className="mt-2 font-outfit text-xl font-semibold">Volumen por etapa</h2>
              </div>
              <p className="text-[10px] text-text-dim">Base relativa · {maxStage.toLocaleString()}</p>
            </div>
            <div className="space-y-3">
              {STAGES.map(stage => {
                const value = snapshot.stages[stage.key];
                const width = Math.max(value > 0 ? 2 : 0, (value / maxStage) * 100);
                return (
                  <div key={stage.key} className="grid grid-cols-[92px_1fr_auto] items-center gap-3 sm:grid-cols-[150px_1fr_auto]">
                    <div>
                      <p className="text-[10px] text-white sm:hidden">{stage.short}</p>
                      <p className="hidden text-[10px] text-white sm:block">{stage.label}</p>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/[.05]">
                      <div className="h-full rounded-full bg-accent/70 transition-all duration-500" style={{ width: `${Math.min(100, width)}%` }} />
                    </div>
                    <p className="min-w-12 text-right font-mono text-[10px] text-text-muted">{value.toLocaleString()}</p>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <article className="rounded-[24px] border border-white/10 bg-white/[.018] p-5 sm:p-6 lg:col-span-2">
              <p className="text-[9px] uppercase tracking-[.18em] text-accent">Stage conversion</p>
              <h2 className="mt-2 font-outfit text-xl font-semibold">Conversión entre hitos</h2>
              <div className="mt-6 space-y-4">
                {CONVERSIONS.map(item => {
                  const value = snapshot.conversion_pct[item.key];
                  return (
                    <div key={item.key}>
                      <div className="mb-2 flex items-center justify-between gap-4 text-[10px]">
                        <span className="text-text-muted">{item.label}</span>
                        <span className="font-mono text-white">{formatPct(value)}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/[.05]">
                        <div className="h-full rounded-full bg-accent/70" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>

            <article className="rounded-[24px] border border-white/10 bg-white/[.018] p-5 sm:p-6">
              <p className="text-[9px] uppercase tracking-[.18em] text-accent">Activation mix</p>
              <h2 className="mt-2 font-outfit text-xl font-semibold">Primer servicio utilizado</h2>
              <div className="mt-6 space-y-3">
                {serviceBreakdown.length === 0 && <p className="text-sm text-text-dim">Aún no hay activaciones registradas en esta ventana.</p>}
                {serviceBreakdown.map(([service, value]) => (
                  <div key={service} className="flex items-center justify-between gap-4 rounded-xl border border-white/[.07] bg-white/[.02] px-4 py-3">
                    <span className="text-xs text-text-muted">{SERVICE_LABELS[service] ?? service}</span>
                    <span className="font-mono text-xs text-white">{value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <p className="text-[10px] text-text-dim">Snapshot generado · {new Date(snapshot.generated_at).toLocaleString()}</p>
        </>
      )}
    </div>
  );
}
