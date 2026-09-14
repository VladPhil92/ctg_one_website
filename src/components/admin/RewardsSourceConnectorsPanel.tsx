'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Activity, ArrowLeft, KeyRound, RefreshCw, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/Button';

type Connector = {
  id: string;
  pilot_unit_id: string;
  connector_code: string;
  name: string;
  source_domain: string;
  auth_scheme: 'ed25519_v1';
  key_fingerprint_sha256: string;
  stage: 'draft' | 'validated' | 'archived';
  ingestion_enabled: boolean;
  max_clock_skew_seconds: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};
type Allowlist = { connector_id: string; event_code: string };
type Attempt = {
  id: string;
  connector_id: string;
  external_event_id: string | null;
  event_code: string | null;
  outcome: string;
  http_status: number;
  detail_code: string;
  created_at: string;
};
type Reconciliation = {
  id: string;
  connector_id: string;
  window_start: string;
  window_end: string;
  declared_original_count: number;
  declared_reversal_count: number;
  declared_amount_cents: number;
  observed_original_count: number;
  observed_reversal_count: number;
  observed_amount_cents: number;
  accepted_delivery_count: number;
  rejected_delivery_count: number;
  hypothetical_eligible_points: number;
  original_count_delta: number;
  reversal_count_delta: number;
  amount_delta_cents: number;
  status: 'matched' | 'mismatch';
  created_at: string;
};
type ConnectorPayload = {
  phase: 'signed_source_connectors_v4';
  commercialStatus: 'inactive';
  ledgerEffects: false;
  sourceAuth: 'ed25519_v1';
  connectors: Connector[];
  allowlist: Allowlist[];
  attempts: Attempt[];
  reconciliations: Reconciliation[];
};
type PilotUnit = { id: string; code: string; name: string; source_domain: string; stage: 'draft' | 'validated' | 'archived' };
type ControlPlanePayload = { units: PilotUnit[] };

const inputClass = 'w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none transition focus:border-accent/45';
const labelClass = 'mb-1.5 block text-[9px] font-medium uppercase tracking-[.14em] text-text-dim';

function centsToCop(cents: number) {
  return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(Math.floor(cents / 100));
}

function localInput(date: Date) {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

async function postAction(body: Record<string, unknown>) {
  const response = await fetch('/api/admin/rewards/source-connectors', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error ?? 'No fue posible ejecutar la operación.');
  return payload;
}

export function RewardsSourceConnectorsPanel() {
  const [data, setData] = useState<ConnectorPayload | null>(null);
  const [units, setUnits] = useState<PilotUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [connectorsResponse, controlPlaneResponse] = await Promise.all([
        fetch('/api/admin/rewards/source-connectors', { cache: 'no-store' }),
        fetch('/api/admin/rewards/control-plane', { cache: 'no-store' }),
      ]);
      const [connectorsPayload, controlPlanePayload] = await Promise.all([
        connectorsResponse.json(),
        controlPlaneResponse.json(),
      ]);
      if (!connectorsResponse.ok) throw new Error(connectorsPayload.error ?? 'No fue posible cargar Source Connectors.');
      if (!controlPlaneResponse.ok) throw new Error(controlPlanePayload.error ?? 'No fue posible cargar Rewards Lab.');
      setData(connectorsPayload as ConnectorPayload);
      setUnits((controlPlanePayload as ControlPlanePayload).units ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible cargar Source Connectors.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const allowlistByConnector = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const item of data?.allowlist ?? []) map.set(item.connector_id, [...(map.get(item.connector_id) ?? []), item.event_code]);
    return map;
  }, [data?.allowlist]);

  async function run(action: () => Promise<unknown>, success: string) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
      setNotice(success);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operación fallida.');
    } finally {
      setBusy(false);
    }
  }

  function createConnector(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const formElement = event.currentTarget;
    void run(async () => {
      await postAction({
        action: 'create_connector',
        pilotUnitId: form.get('pilotUnitId'),
        connectorCode: form.get('connectorCode'),
        name: form.get('name'),
        publicKeyPem: form.get('publicKeyPem'),
        maxClockSkewSeconds: Number(form.get('maxClockSkewSeconds') ?? 300),
        notes: form.get('notes'),
      });
      formElement.reset();
    }, 'Conector creado en draft. CTG One almacenó únicamente la clave pública.');
  }

  function replaceAllowlist(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const eventCodes = String(form.get('eventCodes') ?? '').split(',').map(code => code.trim()).filter(Boolean);
    void run(() => postAction({ action: 'replace_allowlist', connectorId: form.get('connectorId'), eventCodes }), 'Allowlist actualizada.');
  }

  function rotateKey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void run(() => postAction({ action: 'rotate_key', connectorId: form.get('connectorId'), publicKeyPem: form.get('publicKeyPem') }), 'Clave pública rotada. La ingestión quedó apagada por seguridad.');
  }

  function reconcile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void run(() => postAction({
      action: 'reconcile',
      connectorId: form.get('connectorId'),
      windowStart: new Date(String(form.get('windowStart'))).toISOString(),
      windowEnd: new Date(String(form.get('windowEnd'))).toISOString(),
      exportDigest: form.get('exportDigest'),
      declaredOriginalCount: Number(form.get('declaredOriginalCount') ?? 0),
      declaredReversalCount: Number(form.get('declaredReversalCount') ?? 0),
      declaredAmountCents: Math.round(Number(form.get('declaredAmountCop') ?? 0) * 100),
    }), 'Reconciliación registrada. El resultado sigue siendo evidencia shadow, no settlement.');
  }

  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  return (
    <div className="space-y-6">
      <header className="rounded-[28px] border border-white/10 p-6 sm:p-8" style={{ background: 'linear-gradient(135deg,rgba(18,18,18,.98),rgba(7,7,7,.95))' }}>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link href="/admin/rewards/shadow" className="mb-4 inline-flex items-center gap-2 text-[9px] uppercase tracking-[.16em] text-text-dim hover:text-white"><ArrowLeft size={13} /> Rewards Shadow</Link>
            <p className="mb-3 text-[9px] uppercase tracking-[.28em] text-accent">CTG Rewards · Signed Source Connectors v4</p>
            <h1 className="font-outfit text-3xl font-semibold sm:text-5xl">Fuentes firmadas, economía todavía en sombra</h1>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-text-muted">Conecta sistemas origen mediante Ed25519, controla replay y allowlists, y reconcilia lo declarado por la fuente contra la evidencia observada por CTG One.</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => void refresh()} disabled={loading || busy}><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Actualizar</Button>
        </div>
      </header>

      <div className="rounded-2xl border border-amber-400/25 bg-amber-400/[.055] p-5 text-sm text-amber-100">
        <div className="flex gap-3"><ShieldAlert size={20} className="mt-0.5 shrink-0 text-amber-300" /><div><strong>SIGNED SOURCE — SHADOW ONLY.</strong><p className="mt-1 text-xs leading-relaxed text-amber-100/70">Habilitar ingestión autoriza únicamente entrada al motor sombra. No acredita puntos, no toca `reward_accounts` ni `reward_ledger_entries`, no activa redención y no conecta con CTGO.</p></div></div>
      </div>

      {error && <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/[.06] px-4 py-3 text-sm text-red-300">{error}</div>}
      {notice && <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[.05] px-4 py-3 text-sm text-emerald-200">{notice}</div>}

      <section className="grid gap-4 lg:grid-cols-2">
        <form onSubmit={createConnector} className="rounded-[24px] border border-white/10 bg-white/[.018] p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-3"><KeyRound size={18} className="text-accent" /><div><h2 className="font-outfit text-xl font-semibold">Registrar fuente</h2><p className="text-xs text-text-dim">La clave privada permanece en el sistema origen.</p></div></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label><span className={labelClass}>Unidad piloto</span><select name="pilotUnitId" required className={inputClass} defaultValue=""><option value="" disabled>Selecciona unidad</option>{units.filter(unit => unit.stage !== 'archived').map(unit => <option key={unit.id} value={unit.id}>{unit.name} · {unit.stage}</option>)}</select></label>
            <label><span className={labelClass}>Connector code</span><input name="connectorCode" required placeholder="pisao_pos" className={inputClass} /></label>
            <label className="sm:col-span-2"><span className={labelClass}>Nombre</span><input name="name" required placeholder="PISÁO POS Cartagena" className={inputClass} /></label>
            <label><span className={labelClass}>Clock skew máximo (s)</span><input name="maxClockSkewSeconds" type="number" min="30" max="900" defaultValue="300" required className={inputClass} /></label>
            <label><span className={labelClass}>Notas</span><input name="notes" placeholder="Piloto firmado" className={inputClass} /></label>
            <label className="sm:col-span-2"><span className={labelClass}>Ed25519 public key PEM</span><textarea name="publicKeyPem" required rows={6} placeholder="-----BEGIN PUBLIC KEY-----" className={inputClass} /></label>
          </div>
          <Button className="mt-5" type="submit" disabled={busy}>Crear conector draft</Button>
        </form>

        <div className="rounded-[24px] border border-white/10 bg-white/[.018] p-5 sm:p-6">
          <h2 className="font-outfit text-xl font-semibold">Contrato de firma v1</h2>
          <p className="mt-2 text-xs leading-relaxed text-text-muted">Cada POST a <code>/api/rewards/source-events/&lt;connectorCode&gt;</code> firma exactamente cinco líneas. El digest corresponde al body JSON crudo recibido.</p>
          <div className="mt-4 rounded-xl border border-white/10 bg-black/35 p-4 font-mono text-[11px] leading-6 text-text-muted">ctg-rewards-source-v1<br />&lt;connectorCode&gt;<br />&lt;unixTimestampSeconds&gt;<br />&lt;nonce&gt;<br />&lt;sha256(rawBody)&gt;</div>
          <div className="mt-4 space-y-2 text-xs text-text-dim"><p><strong className="text-white">x-ctg-rewards-timestamp</strong> · Unix seconds</p><p><strong className="text-white">x-ctg-rewards-nonce</strong> · 16–128 chars, anti-replay</p><p><strong className="text-white">x-ctg-rewards-signature</strong> · Ed25519 signature, Base64</p></div>
        </div>
      </section>

      <section className="rounded-[24px] border border-white/10 bg-white/[.018] p-5 sm:p-6">
        <div className="mb-5 flex items-center gap-3"><Activity size={18} className="text-accent" /><h2 className="font-outfit text-xl font-semibold">Conectores</h2></div>
        <div className="grid gap-4 lg:grid-cols-2">
          {(data?.connectors ?? []).map(connector => {
            const codes = allowlistByConnector.get(connector.id) ?? [];
            return <article key={connector.id} className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <div className="flex items-start justify-between gap-3"><div><p className="font-outfit text-lg font-semibold">{connector.name}</p><p className="mt-1 text-[10px] uppercase tracking-[.12em] text-text-dim">{connector.connector_code} · {connector.source_domain}</p></div><span className={`rounded-full px-2.5 py-1 text-[9px] uppercase tracking-[.12em] ${connector.ingestion_enabled ? 'bg-emerald-500/10 text-emerald-300' : 'bg-white/[.05] text-text-dim'}`}>{connector.ingestion_enabled ? 'Shadow ingest ON' : connector.stage}</span></div>
              <p className="mt-4 break-all font-mono text-[10px] text-text-dim">Key {connector.key_fingerprint_sha256.slice(0, 16)}…</p>
              <p className="mt-2 text-xs text-text-muted">Allowlist: {codes.length ? codes.join(', ') : 'sin eventos'}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {connector.stage === 'draft' && <Button size="sm" variant="secondary" disabled={busy} onClick={() => void run(() => postAction({ action: 'set_stage', connectorId: connector.id, stage: 'validated' }), 'Conector validado. Aún no está habilitado.')}>Validar</Button>}
                {connector.stage === 'validated' && <Button size="sm" variant="secondary" disabled={busy} onClick={() => void run(() => postAction({ action: 'set_ingestion', connectorId: connector.id, enabled: !connector.ingestion_enabled }), connector.ingestion_enabled ? 'Ingestión apagada.' : 'Ingestión shadow habilitada.')}>{connector.ingestion_enabled ? 'Apagar ingestión' : 'Habilitar ingestión'}</Button>}
                {connector.stage !== 'archived' && <Button size="sm" variant="secondary" disabled={busy} onClick={() => void run(() => postAction({ action: 'set_stage', connectorId: connector.id, stage: 'archived' }), 'Conector archivado y apagado.')}>Archivar</Button>}
              </div>
            </article>;
          })}
          {!loading && (data?.connectors.length ?? 0) === 0 && <p className="text-sm text-text-muted">Aún no hay fuentes firmadas. Crea primero una unidad/regla en Rewards Lab.</p>}
        </div>
      </section>

      {(data?.connectors.length ?? 0) > 0 && <section className="grid gap-4 lg:grid-cols-2">
        <form onSubmit={replaceAllowlist} className="rounded-[24px] border border-white/10 bg-white/[.018] p-5 sm:p-6">
          <h2 className="font-outfit text-xl font-semibold">Allowlist de eventos</h2><p className="mt-2 text-xs text-text-dim">Debe modificarse con la ingestión apagada.</p>
          <label className="mt-4 block"><span className={labelClass}>Conector</span><select name="connectorId" className={inputClass}>{data?.connectors.filter(c => c.stage !== 'archived').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          <label className="mt-4 block"><span className={labelClass}>Event codes separados por coma</span><input name="eventCodes" required placeholder="sale.completed,sale.refunded" className={inputClass} /></label>
          <Button className="mt-5" type="submit" disabled={busy}>Actualizar allowlist</Button>
        </form>

        <form onSubmit={rotateKey} className="rounded-[24px] border border-white/10 bg-white/[.018] p-5 sm:p-6">
          <h2 className="font-outfit text-xl font-semibold">Rotar clave pública</h2><p className="mt-2 text-xs text-text-dim">La rotación fuerza `ingestion_enabled=false` antes de aceptar la nueva firma.</p>
          <label className="mt-4 block"><span className={labelClass}>Conector</span><select name="connectorId" className={inputClass}>{data?.connectors.filter(c => c.stage !== 'archived').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          <label className="mt-4 block"><span className={labelClass}>Nueva Ed25519 public key PEM</span><textarea name="publicKeyPem" rows={5} required className={inputClass} /></label>
          <Button className="mt-5" type="submit" disabled={busy}>Rotar y apagar</Button>
        </form>
      </section>}

      {(data?.connectors.length ?? 0) > 0 && <form onSubmit={reconcile} className="rounded-[24px] border border-white/10 bg-white/[.018] p-5 sm:p-6">
        <h2 className="font-outfit text-xl font-semibold">Reconciliación fuente ↔ shadow</h2><p className="mt-2 text-xs text-text-dim">Compara agregados y digest del export origen. No publica ni liquida puntos.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <label><span className={labelClass}>Conector</span><select name="connectorId" className={inputClass}>{data?.connectors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          <label><span className={labelClass}>Inicio</span><input name="windowStart" type="datetime-local" defaultValue={localInput(yesterday)} required className={inputClass} /></label>
          <label><span className={labelClass}>Fin</span><input name="windowEnd" type="datetime-local" defaultValue={localInput(now)} required className={inputClass} /></label>
          <label><span className={labelClass}>Originales declarados</span><input name="declaredOriginalCount" type="number" min="0" defaultValue="0" required className={inputClass} /></label>
          <label><span className={labelClass}>Reversos declarados</span><input name="declaredReversalCount" type="number" min="0" defaultValue="0" required className={inputClass} /></label>
          <label><span className={labelClass}>Monto original declarado COP</span><input name="declaredAmountCop" type="number" min="0" defaultValue="0" required className={inputClass} /></label>
          <label className="md:col-span-3"><span className={labelClass}>SHA-256 del export origen</span><input name="exportDigest" pattern="[0-9a-fA-F]{64}" required className={inputClass} /></label>
        </div>
        <Button className="mt-5" type="submit" disabled={busy}>Ejecutar reconciliación</Button>
      </form>}

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-[24px] border border-white/10 bg-white/[.018] p-5 sm:p-6"><h2 className="font-outfit text-xl font-semibold">Deliveries recientes</h2><div className="mt-4 space-y-2">{(data?.attempts ?? []).slice(0, 12).map(item => <div key={item.id} className="rounded-xl border border-white/[.07] bg-black/20 px-4 py-3 text-xs"><div className="flex justify-between gap-3"><span className="font-medium text-white">{item.outcome}</span><span className="text-text-dim">HTTP {item.http_status}</span></div><p className="mt-1 text-text-dim">{item.event_code ?? 'sin event code'} · {item.detail_code}</p></div>)}{!loading && (data?.attempts.length ?? 0) === 0 && <p className="text-sm text-text-muted">Sin deliveries firmados todavía.</p>}</div></div>
        <div className="rounded-[24px] border border-white/10 bg-white/[.018] p-5 sm:p-6"><h2 className="font-outfit text-xl font-semibold">Reconciliaciones recientes</h2><div className="mt-4 space-y-2">{(data?.reconciliations ?? []).slice(0, 12).map(item => <div key={item.id} className="rounded-xl border border-white/[.07] bg-black/20 px-4 py-3 text-xs"><div className="flex justify-between gap-3"><span className={item.status === 'matched' ? 'text-emerald-300' : 'text-amber-300'}>{item.status}</span><span className="text-text-dim">{item.hypothetical_eligible_points.toLocaleString()} pts hipotéticos</span></div><p className="mt-1 text-text-dim">Δ eventos {item.original_count_delta} · Δ reversos {item.reversal_count_delta} · Δ COP {centsToCop(item.amount_delta_cents)}</p></div>)}{!loading && (data?.reconciliations.length ?? 0) === 0 && <p className="text-sm text-text-muted">Sin reconciliaciones todavía.</p>}</div></div>
      </section>
    </div>
  );
}
