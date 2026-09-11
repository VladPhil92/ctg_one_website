'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  WORLDMAKERS_AUDIENCES,
  WORLDMAKERS_AUDIENCE_LABELS,
  WORLDMAKERS_INTEREST_STATUSES,
  WORLDMAKERS_STATUS_LABELS,
  type WorldMakersAudience,
  type WorldMakersInterestStatus,
} from '@/lib/worldmakers/community';

type CommunityRow = {
  id: string;
  email: string;
  display_name: string | null;
  audience: WorldMakersAudience;
  wants_product_updates: boolean;
  wants_playtesting: boolean;
  wants_educator_pilot: boolean;
  wants_family_research: boolean;
  source_path: string;
  status: WorldMakersInterestStatus;
  admin_notes: string | null;
  submission_count: number;
  first_registered_at: string;
  last_registered_at: string;
  shortlisted_at: string | null;
  ready_to_invite_at: string | null;
  contacted_at: string | null;
  withdrawn_at: string | null;
  created_at: string;
  updated_at: string;
};

type CountItem<T extends string, K extends string> = Record<K, T> & { count: number };

type Payload = {
  rows: CommunityRow[];
  statusCounts: CountItem<WorldMakersInterestStatus, 'status'>[];
  audienceCounts: CountItem<WorldMakersAudience, 'audience'>[];
};

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function interestLabels(row: CommunityRow) {
  const labels: string[] = [];
  if (row.wants_product_updates) labels.push('Updates');
  if (row.wants_playtesting) labels.push('Playtest');
  if (row.wants_educator_pilot) labels.push('Educación');
  if (row.wants_family_research) labels.push('Familias');
  return labels;
}

export function WorldMakersCommunityPanel() {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [audienceFilter, setAudienceFilter] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (audienceFilter) params.set('audience', audienceFilter);

    try {
      const response = await fetch(`/api/admin/worldmakers/interest${params.size ? `?${params.toString()}` : ''}`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No fue posible cargar la comunidad.');
      setPayload(data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible cargar la comunidad.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, audienceFilter]);

  useEffect(() => { void load(); }, [load]);

  const total = useMemo(
    () => payload?.statusCounts.reduce((sum, item) => sum + item.count, 0) ?? 0,
    [payload],
  );

  async function updateRow(row: CommunityRow, status: WorldMakersInterestStatus, adminNotes?: string | null) {
    setUpdatingId(row.id);
    setError('');
    try {
      const response = await fetch('/api/admin/worldmakers/interest', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id, status, ...(adminNotes !== undefined ? { adminNotes } : {}) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No fue posible actualizar el perfil.');
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible actualizar el perfil.');
    } finally {
      setUpdatingId(null);
    }
  }

  function editNotes(row: CommunityRow) {
    const next = window.prompt('Notas internas (máx. 1200 caracteres):', row.admin_notes ?? '');
    if (next === null) return;
    void updateRow(row, row.status, next.slice(0, 1200));
  }

  return (
    <div className="mx-auto max-w-[1540px] px-4 pb-16 pt-28 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[.22em] text-accent">World Makers · Community OS</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Interés, selección y preparación de acceso</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-text-dim">Este panel administra perfiles adultos de interés. Un registro no equivale a beta, una preselección no equivale a invitación y “contactado” debe representar una acción humana real.</p>
        </div>
        <button onClick={() => void load()} className="rounded-xl border border-white/10 bg-white/[.04] px-4 py-2 text-xs font-semibold text-white hover:bg-white/[.07]">Actualizar</button>
      </div>

      <div className="mb-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ['Total', total],
          ['Registrados', payload?.statusCounts.find((item) => item.status === 'registered')?.count ?? 0],
          ['En revisión', payload?.statusCounts.find((item) => item.status === 'reviewing')?.count ?? 0],
          ['Preseleccionados', payload?.statusCounts.find((item) => item.status === 'shortlisted')?.count ?? 0],
          ['Listos para invitar', payload?.statusCounts.find((item) => item.status === 'ready_to_invite')?.count ?? 0],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-2xl border border-white/[.07] bg-white/[.025] p-4">
            <p className="text-[9px] uppercase tracking-[.18em] text-text-dim">{label}</p>
            <strong className="mt-2 block text-2xl font-semibold text-white">{value}</strong>
          </div>
        ))}
      </div>

      <div className="mb-5 flex flex-wrap gap-3 rounded-2xl border border-white/[.07] bg-white/[.02] p-3">
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-xs text-white">
          <option value="">Todos los estados</option>
          {WORLDMAKERS_INTEREST_STATUSES.map((status) => <option key={status} value={status}>{WORLDMAKERS_STATUS_LABELS[status]}</option>)}
        </select>
        <select value={audienceFilter} onChange={(event) => setAudienceFilter(event.target.value)} className="rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-xs text-white">
          <option value="">Todas las audiencias</option>
          {WORLDMAKERS_AUDIENCES.map((audience) => <option key={audience} value={audience}>{WORLDMAKERS_AUDIENCE_LABELS[audience]}</option>)}
        </select>
      </div>

      {error && <div className="mb-5 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</div>}
      {loading && <div className="rounded-2xl border border-white/[.07] bg-white/[.02] p-8 text-sm text-text-dim">Cargando perfiles…</div>}

      {!loading && payload && (
        <div className="overflow-hidden rounded-2xl border border-white/[.07] bg-black/20">
          <div className="overflow-x-auto">
            <table className="min-w-[1180px] w-full text-left text-xs">
              <thead className="border-b border-white/[.07] bg-white/[.025] text-[9px] uppercase tracking-[.14em] text-text-dim">
                <tr><th className="px-4 py-3">Perfil</th><th className="px-4 py-3">Audiencia</th><th className="px-4 py-3">Intereses</th><th className="px-4 py-3">Registro</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3">Notas</th></tr>
              </thead>
              <tbody>
                {payload.rows.map((row) => (
                  <tr key={row.id} className="border-b border-white/[.05] align-top last:border-0">
                    <td className="px-4 py-4"><strong className="block text-white">{row.display_name || 'Sin nombre'}</strong><span className="mt-1 block text-text-dim">{row.email}</span><span className="mt-1 block text-[10px] text-text-dim">Fuente: {row.source_path}</span></td>
                    <td className="px-4 py-4 text-text-dim">{WORLDMAKERS_AUDIENCE_LABELS[row.audience]}</td>
                    <td className="px-4 py-4"><div className="flex max-w-[220px] flex-wrap gap-1">{interestLabels(row).map((label) => <span key={label} className="rounded-full border border-accent/15 bg-accent/[.06] px-2 py-1 text-[9px] text-accent">{label}</span>)}</div></td>
                    <td className="px-4 py-4 text-text-dim"><span className="block">{formatDate(row.first_registered_at)}</span><span className="mt-1 block text-[10px]">Último: {formatDate(row.last_registered_at)} · {row.submission_count} envíos</span></td>
                    <td className="px-4 py-4"><select disabled={updatingId === row.id} value={row.status} onChange={(event) => void updateRow(row, event.target.value as WorldMakersInterestStatus)} className="rounded-lg border border-white/10 bg-black/60 px-2 py-2 text-[10px] text-white">{WORLDMAKERS_INTEREST_STATUSES.map((status) => <option key={status} value={status}>{WORLDMAKERS_STATUS_LABELS[status]}</option>)}</select></td>
                    <td className="px-4 py-4"><p className="max-w-[260px] whitespace-pre-wrap text-text-dim">{row.admin_notes || '—'}</p><button disabled={updatingId === row.id} onClick={() => editNotes(row)} className="mt-2 text-[10px] font-semibold text-accent hover:underline">Editar notas</button></td>
                  </tr>
                ))}
                {payload.rows.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-text-dim">No hay perfiles para estos filtros.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
