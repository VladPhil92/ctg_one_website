'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Clock3, RefreshCw, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { HealthCheck, SystemHealthSnapshot } from '@/lib/observability/health';

const statusMeta = {
  healthy: { label: 'Healthy', icon: CheckCircle2, className: 'text-emerald-300 border-emerald-500/20 bg-emerald-500/[.06]' },
  degraded: { label: 'Degraded', icon: AlertTriangle, className: 'text-amber-300 border-amber-500/20 bg-amber-500/[.06]' },
  unhealthy: { label: 'Unhealthy', icon: ShieldAlert, className: 'text-red-300 border-red-500/20 bg-red-500/[.06]' },
  pending_schema: { label: 'Pending schema', icon: Clock3, className: 'text-sky-300 border-sky-500/20 bg-sky-500/[.06]' },
} as const;

function CheckCard({ check }: { check: HealthCheck }) {
  const meta = statusMeta[check.status];
  const Icon = meta.icon;
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[.02] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-white">{check.label}</p>
          <p className="mt-2 text-xs leading-relaxed text-text-muted">{check.detail}</p>
        </div>
        <div className={`shrink-0 rounded-full border px-3 py-1.5 text-[9px] uppercase tracking-[.12em] flex items-center gap-1.5 ${meta.className}`}>
          <Icon size={12} /> {meta.label}
        </div>
      </div>
      {typeof check.latencyMs === 'number' && (
        <p className="mt-4 text-[10px] text-text-dim">Latency · {check.latencyMs} ms</p>
      )}
    </article>
  );
}

export function SystemHealthPanel() {
  const [snapshot, setSnapshot] = useState<SystemHealthSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/system-health', { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Health check failed');
      setSnapshot(payload as SystemHealthSnapshot);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Health check failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  return (
    <div className="space-y-6">
      <header className="rounded-[28px] border border-white/10 p-6 sm:p-8" style={{ background: 'linear-gradient(135deg,rgba(18,18,18,.98),rgba(7,7,7,.95))' }}>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
          <div>
            <p className="text-[9px] uppercase tracking-[.28em] text-accent mb-3">CTG One · Reliability</p>
            <h1 className="text-3xl sm:text-5xl font-outfit font-semibold">System Health</h1>
            <p className="text-sm text-text-muted mt-3 max-w-3xl leading-relaxed">Diagnóstico read-only del runtime, Supabase, esquema de inversión y migraciones operativas. Los componentes aún no instalados se reportan como pendientes sin degradar el resto de CTG One.</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => void refresh()} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> {loading ? 'Checking' : 'Refresh'}
          </Button>
        </div>
      </header>

      {error && <div className="rounded-xl border border-red-500/30 bg-red-500/[.06] text-red-300 px-4 py-3 text-sm">{error}</div>}

      {snapshot && (
        <>
          <section className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/[.02] p-5 lg:col-span-1">
              <Activity size={18} className="text-accent mb-4" />
              <p className="text-[9px] uppercase tracking-[.15em] text-text-dim">Overall</p>
              <p className="text-xl font-outfit font-semibold mt-1 capitalize">{snapshot.status}</p>
            </div>
            {[
              ['Healthy', snapshot.summary.healthy],
              ['Degraded', snapshot.summary.degraded],
              ['Unhealthy', snapshot.summary.unhealthy],
              ['Pending schema', snapshot.summary.pendingSchema],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-2xl border border-white/10 bg-white/[.02] p-5">
                <p className="text-[9px] uppercase tracking-[.15em] text-text-dim">{label}</p>
                <p className="text-3xl font-outfit font-semibold mt-2">{value}</p>
              </div>
            ))}
          </section>

          <section className="grid lg:grid-cols-2 gap-4">
            {snapshot.checks.map(check => <CheckCard key={check.id} check={check} />)}
          </section>

          <p className="text-[10px] text-text-dim">Last checked · {new Date(snapshot.checkedAt).toLocaleString()}</p>
        </>
      )}
    </div>
  );
}
