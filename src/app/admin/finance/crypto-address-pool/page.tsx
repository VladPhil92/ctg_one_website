'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { CheckCircle2, Database, RefreshCw, ShieldCheck, Trash2, Upload, WalletCards } from 'lucide-react';
import { CheckCircle2, ChevronLeft, ChevronRight, Database, RefreshCw, ShieldCheck, Trash2, Upload, WalletCards } from 'lucide-react';

type Asset = 'BTC' | 'ETH' | 'BNB' | 'USDT' | 'USDC';
type Control = {
  asset: Asset;
  network: string;
  auto_assignment_enabled: boolean;
  activation_minimum_ready_addresses: number;
  ready_count: number;
  pending_count: number;
  assigned_count: number;
  retired_count: number;
};
type AddressRow = {
  id: string;
  asset: Asset;
  network: string;
  address: string;
  derivationReference: string | null;
  sourceFingerprint: string | null;
  status: 'available' | 'assigned' | 'retired';
  validationStatus: 'pending' | 'validated' | 'rejected';
  validationReference: string | null;
  validatedAt: string | null;
  assignedAt: string | null;
  retiredAt: string | null;
  retirementReason: string | null;
  createdAt: string;
};
type EventRow = { id: string; asset: Asset; network: string; eventType: string; createdAt: string; detail: Record<string, unknown> };
type Snapshot = { controls: Control[]; addresses: AddressRow[]; events: EventRow[] };

const ASSETS: Asset[] = ['BTC', 'ETH', 'BNB', 'USDT', 'USDC'];
type Snapshot = {
  controls: Control[];
  addresses: AddressRow[];
  events: EventRow[];
  addressTotal: number;
  addressOffset: number;
  addressLimit: number;
  hasMore: boolean;
};

const ASSETS: Asset[] = ['BTC', 'ETH', 'BNB', 'USDT', 'USDC'];
const PAGE_SIZE = 100;
const EMPTY_SNAPSHOT: Snapshot = { controls: [], addresses: [], events: [], addressTotal: 0, addressOffset: 0, addressLimit: PAGE_SIZE, hasMore: false };
const NETWORK: Record<Asset, string> = {
  BTC: 'Bitcoin', ETH: 'Ethereum (ERC20)', BNB: 'BNB Smart Chain (BEP20)',
  USDT: 'BNB Smart Chain (BEP20)', USDC: 'BNB Smart Chain (BEP20)',
};

async function api(body?: unknown) {
  const response = await fetch('/api/admin/wallet/crypto-address-pool', body ? {
async function api(body?: unknown, offset = 0) {
  const url = body
    ? '/api/admin/wallet/crypto-address-pool'
    : `/api/admin/wallet/crypto-address-pool?offset=${encodeURIComponent(String(offset))}&limit=${PAGE_SIZE}`;
  const response = await fetch(url, body ? {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  } : { cache: 'no-store' });
  const payload = await response.json() as Record<string, unknown>;
  if (!response.ok) throw new Error(String(payload.error ?? 'CRYPTO_ADDRESS_POOL_REQUEST_FAILED'));
  return payload;
}

export default function CryptoAddressPoolAdminPage() {
  const [snapshot, setSnapshot] = useState<Snapshot>({ controls: [], addresses: [], events: [] });
  const [snapshot, setSnapshot] = useState<Snapshot>(EMPTY_SNAPSHOT);
  const [asset, setAsset] = useState<Asset>('BTC');
  const [batch, setBatch] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const payload = await api();
      setSnapshot((payload.snapshot ?? { controls: [], addresses: [], events: [] }) as Snapshot);
  const load = useCallback(async (nextOffset = 0) => {
    setLoading(true); setError(null);
    try {
      const payload = await api(undefined, nextOffset);
      const next = (payload.snapshot ?? EMPTY_SNAPSHOT) as Partial<Snapshot>;
      setSnapshot({
        controls: next.controls ?? [], addresses: next.addresses ?? [], events: next.events ?? [],
        addressTotal: Number(next.addressTotal ?? 0), addressOffset: Number(next.addressOffset ?? nextOffset),
        addressLimit: Number(next.addressLimit ?? PAGE_SIZE), hasMore: Boolean(next.hasMore),
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo cargar el pool');
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { void load(0); }, [load]);

  const totals = useMemo(() => snapshot.controls.reduce((acc, control) => ({
    ready: acc.ready + Number(control.ready_count ?? 0), pending: acc.pending + Number(control.pending_count ?? 0),
    assigned: acc.assigned + Number(control.assigned_count ?? 0), retired: acc.retired + Number(control.retired_count ?? 0),
  }), { ready: 0, pending: 0, assigned: 0, retired: 0 }), [snapshot.controls]);

  const run = async (body: unknown, success: string) => {
    setBusy(true); setError(null); setMessage(null);
    try { await api(body); setMessage(success); await load(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'No se pudo completar la operación'); }
    finally { setBusy(false); }
    try {
      await api(body);
      setMessage(success);
      await load(snapshot.addressOffset);
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo completar la operación');
      return false;
    } finally { setBusy(false); }
  };

  const importBatch = async () => {
    const lines = batch.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    const entries = lines.map(line => {
      const [address, derivationReference, sourceFingerprint] = line.split('|').map(part => part?.trim());
      return { asset, address, derivationReference, sourceFingerprint };
    });
    if (!entries.length || entries.some(entry => !entry.address || !entry.derivationReference || !entry.sourceFingerprint)) {
      setError('Formato requerido por línea: address | derivation_reference | source_fingerprint'); return;
    }
    await run({ action: 'provision_batch', entries }, `${entries.length} dirección(es) importadas en cuarentena. Aún no pueden recibir auto-asignaciones.`);
    setBatch('');
    const ok = await run({ action: 'provision_batch', entries }, `${entries.length} dirección(es) importadas en cuarentena. Aún no pueden recibir auto-asignaciones.`);
    if (ok) setBatch('');
  };

  const validateAddress = async (row: AddressRow) => {
    const reference = window.prompt('Referencia de validación/custodia (ticket, registro de proveedor o evidencia interna):');
    if (!reference?.trim()) return;
    await run({ action: 'validate_address', addressId: row.id, validationReference: reference.trim() }, 'Dirección validada. El pool todavía debe estar habilitado explícitamente para auto-asignar.');
  };

  const retireAddress = async (row: AddressRow) => {
    const reason = window.prompt('Motivo de retiro de esta dirección:');
    if (!reason?.trim()) return;
    await run({ action: 'retire_address', addressId: row.id, reason: reason.trim() }, 'Dirección retirada del pool.');
  };

  const setEnabled = async (control: Control, enabled: boolean) => {
    if (enabled && !window.confirm(`Activar auto-asignación para ${control.asset} en ${control.network}? Solo se usarán direcciones validadas.`)) return;
    await run({ action: 'set_pool_enabled', asset: control.asset, enabled }, enabled ? 'Auto-asignación habilitada.' : 'Auto-asignación deshabilitada; las nuevas cotizaciones usarán la ruta compartida y conciliación manual.');
  };

  return <div className="space-y-7">
    <header className="rounded-[28px] border border-white/10 p-6 sm:p-8" style={{ background: 'linear-gradient(135deg,rgba(18,18,18,.98),rgba(7,7,7,.95))' }}>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><p className="mb-3 text-[9px] uppercase tracking-[.28em] text-accent">CTG One · Wallet Operations</p><h1 className="font-outfit text-3xl font-semibold sm:text-5xl">Crypto Address Pool</h1><p className="mt-3 max-w-3xl text-sm leading-relaxed text-text-muted">Pool público de direcciones de un solo uso. CTG One no almacena seed, xprv ni claves privadas. Importar no activa fondos: cada dirección queda en cuarentena hasta validación y activación explícita.</p></div><Button onClick={() => void load()} variant="secondary" size="sm"><RefreshCw size={14}/>Actualizar</Button></div>
  const pageStart = snapshot.addressTotal === 0 ? 0 : snapshot.addressOffset + 1;
  const pageEnd = Math.min(snapshot.addressOffset + snapshot.addresses.length, snapshot.addressTotal);

  return <div className="space-y-7">
    <header className="rounded-[28px] border border-white/10 p-6 sm:p-8" style={{ background: 'linear-gradient(135deg,rgba(18,18,18,.98),rgba(7,7,7,.95))' }}>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><p className="mb-3 text-[9px] uppercase tracking-[.28em] text-accent">CTG One · Wallet Operations</p><h1 className="font-outfit text-3xl font-semibold sm:text-5xl">Crypto Address Pool</h1><p className="mt-3 max-w-3xl text-sm leading-relaxed text-text-muted">Pool público de direcciones de un solo uso. CTG One no almacena seed, xprv ni claves privadas. Importar no activa fondos: cada dirección queda en cuarentena hasta validación y activación explícita.</p></div><Button onClick={() => void load(snapshot.addressOffset)} variant="secondary" size="sm"><RefreshCw size={14}/>Actualizar</Button></div>
    </header>

    <section className="grid gap-3 sm:grid-cols-4"><Metric icon={<ShieldCheck size={15}/>} label="Validadas disponibles" value={totals.ready}/><Metric icon={<Upload size={15}/>} label="Pendientes" value={totals.pending}/><Metric icon={<WalletCards size={15}/>} label="Asignadas" value={totals.assigned}/><Metric icon={<Trash2 size={15}/>} label="Retiradas" value={totals.retired}/></section>

    {(message || error) && <div className="rounded-xl border px-4 py-3 text-sm" style={{ borderColor: error ? 'rgba(239,68,68,.3)' : 'rgba(201,169,98,.28)', background: error ? 'rgba(239,68,68,.06)' : 'rgba(201,169,98,.05)', color: error ? '#fca5a5' : 'var(--accent)' }}>{error ?? message}</div>}

    <section className="grid gap-5 xl:grid-cols-[1fr_1.3fr]">
      <article className="rounded-2xl border border-white/[.08] bg-white/[.02] p-5 sm:p-6"><div className="mb-5 flex items-start gap-3"><Database className="mt-1 text-accent" size={18}/><div><h2 className="text-lg font-semibold text-white">Importar direcciones públicas</h2><p className="mt-1 text-xs leading-relaxed text-text-muted">Una línea por dirección: <code>address | derivation_reference | source_fingerprint</code>. Máximo 100 por lote. Ninguna dirección importada se usa automáticamente.</p></div></div><label className="poolLabel">Activo<select className="poolInput mt-1.5" value={asset} onChange={e=>setAsset(e.target.value as Asset)}>{ASSETS.map(item=><option key={item}>{item}</option>)}</select></label><p className="mt-2 text-[10px] text-text-dim">Red fija: {NETWORK[asset]}</p><textarea className="poolInput mt-4 min-h-52 font-mono text-[11px]" value={batch} onChange={e=>setBatch(e.target.value)} placeholder={asset==='BTC'?"bc1... | m/84'/0'/0'/0/0 | wallet-fingerprint...":"0x... | m/44'/60'/0'/0/0 | wallet-fingerprint..."}/><div className="mt-4"><Button onClick={()=>void importBatch()} loading={busy} variant="primary" size="sm"><Upload size={13}/>Importar a cuarentena</Button></div></article>

      <article className="rounded-2xl border border-white/[.08] bg-white/[.02] p-5 sm:p-6"><h2 className="text-lg font-semibold text-white">Controles de auto-asignación</h2><p className="mt-1 text-xs text-text-muted">Para habilitar un rail debe existir al menos la capacidad validada mínima. Deshabilitarlo hace fallback inmediato a dirección compartida + conciliación manual.</p><div className="mt-5 space-y-3">{snapshot.controls.map(control=><div key={`${control.asset}-${control.network}`} className="rounded-xl border border-white/[.07] bg-black/20 p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><span className="text-sm font-semibold text-white">{control.asset}</span><span className={`rounded-full border px-2 py-0.5 text-[8px] uppercase tracking-[.12em] ${control.auto_assignment_enabled?'border-emerald-400/20 text-emerald-300':'border-white/10 text-text-dim'}`}>{control.auto_assignment_enabled?'AUTO ON':'MANUAL'}</span></div><p className="mt-1 text-[10px] text-text-dim">{control.network}</p><p className="mt-2 text-xs text-text-muted">Ready {control.ready_count} · Pending {control.pending_count} · Assigned {control.assigned_count} · mínimo para activar {control.activation_minimum_ready_addresses}</p></div><Button disabled={busy} onClick={()=>void setEnabled(control,!control.auto_assignment_enabled)} variant={control.auto_assignment_enabled?'secondary':'primary'} size="sm">{control.auto_assignment_enabled?'Desactivar':'Activar'}</Button></div></div>)}</div></article>
    </section>

    <section className="rounded-2xl border border-white/[.08] bg-white/[.02] p-5 sm:p-6"><div className="mb-5"><h2 className="text-lg font-semibold text-white">Direcciones del pool</h2><p className="mt-1 text-xs text-text-muted">Las direcciones assigned nunca se reciclan. Las pending no son elegibles para cotizaciones.</p></div>{loading?<p className="text-sm text-text-dim">Sincronizando pool...</p>:snapshot.addresses.length===0?<p className="text-sm text-text-dim">No hay direcciones individuales provisionadas todavía.</p>:<div className="space-y-3">{snapshot.addresses.map(row=><div key={row.id} className="rounded-xl border border-white/[.07] bg-black/20 p-4"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-semibold text-white">{row.asset}</span><Badge value={row.validationStatus}/><Badge value={row.status}/></div><p className="mt-2 break-all font-mono text-[10px] text-text-muted">{row.address}</p><p className="mt-1 text-[9px] text-text-dim">{row.network} · {row.derivationReference ?? 'sin derivación'} · fp {row.sourceFingerprint?.slice(0,16) ?? '—'}…</p></div><div className="flex shrink-0 gap-2">{row.status==='available'&&row.validationStatus==='pending'&&<Button onClick={()=>void validateAddress(row)} disabled={busy} variant="primary" size="sm"><CheckCircle2 size={13}/>Validar</Button>}{row.status==='available'&&<Button onClick={()=>void retireAddress(row)} disabled={busy} variant="secondary" size="sm">Retirar</Button>}</div></div></div>)}</div>}</section>
      <article className="rounded-2xl border border-white/[.08] bg-white/[.02] p-5 sm:p-6"><div className="mb-5 flex items-start gap-3"><Database className="mt-1 text-accent" size={18}/><div><h2 className="text-lg font-semibold text-white">Importar direcciones públicas</h2><p className="mt-1 text-xs leading-relaxed text-text-muted">Una línea por dirección: <code>address | derivation_reference | source_fingerprint</code>. Máximo 100 por lote. Si la importación falla, el lote permanece intacto para corrección y reintento.</p></div></div><label className="poolLabel">Activo<select className="poolInput mt-1.5" value={asset} onChange={e=>setAsset(e.target.value as Asset)}>{ASSETS.map(item=><option key={item}>{item}</option>)}</select></label><p className="mt-2 text-[10px] text-text-dim">Red fija: {NETWORK[asset]}</p><textarea className="poolInput mt-4 min-h-52 font-mono text-[11px]" value={batch} onChange={e=>setBatch(e.target.value)} placeholder={asset==='BTC'?'bc1... | m/84\'/0\'/0\'/0/0 | wallet-fingerprint...':'0x... | m/44\'/60\'/0\'/0/0 | wallet-fingerprint...'}/><div className="mt-4"><Button onClick={()=>void importBatch()} loading={busy} variant="primary" size="sm"><Upload size={13}/>Importar a cuarentena</Button></div></article>

      <article className="rounded-2xl border border-white/[.08] bg-white/[.02] p-5 sm:p-6"><h2 className="text-lg font-semibold text-white">Controles de auto-asignación</h2><p className="mt-1 text-xs text-text-muted">Para habilitar un rail debe existir al menos la capacidad validada mínima. Deshabilitarlo serializa contra cotizaciones en curso y hace fallback a dirección compartida + conciliación manual.</p><div className="mt-5 space-y-3">{snapshot.controls.map(control=><div key={`${control.asset}-${control.network}`} className="rounded-xl border border-white/[.07] bg-black/20 p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><span className="text-sm font-semibold text-white">{control.asset}</span><span className={`rounded-full border px-2 py-0.5 text-[8px] uppercase tracking-[.12em] ${control.auto_assignment_enabled?'border-emerald-400/20 text-emerald-300':'border-white/10 text-text-dim'}`}>{control.auto_assignment_enabled?'AUTO ON':'MANUAL'}</span></div><p className="mt-1 text-[10px] text-text-dim">{control.network}</p><p className="mt-2 text-xs text-text-muted">Ready {control.ready_count} · Pending {control.pending_count} · Assigned {control.assigned_count} · mínimo para activar {control.activation_minimum_ready_addresses}</p></div><Button disabled={busy} onClick={()=>void setEnabled(control,!control.auto_assignment_enabled)} variant={control.auto_assignment_enabled?'secondary':'primary'} size="sm">{control.auto_assignment_enabled?'Desactivar':'Activar'}</Button></div></div>)}</div></article>
    </section>

    <section className="rounded-2xl border border-white/[.08] bg-white/[.02] p-5 sm:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-lg font-semibold text-white">Direcciones del pool</h2><p className="mt-1 text-xs text-text-muted">Las direcciones assigned nunca se reciclan. Las pending no son elegibles para cotizaciones.</p></div><p className="text-[10px] text-text-dim">Mostrando {pageStart}–{pageEnd} de {snapshot.addressTotal}</p></div>
      {loading?<p className="text-sm text-text-dim">Sincronizando pool...</p>:snapshot.addresses.length===0?<p className="text-sm text-text-dim">No hay direcciones en esta página.</p>:<div className="space-y-3">{snapshot.addresses.map(row=><div key={row.id} className="rounded-xl border border-white/[.07] bg-black/20 p-4"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-semibold text-white">{row.asset}</span><Badge value={row.validationStatus}/><Badge value={row.status}/></div><p className="mt-2 break-all font-mono text-[10px] text-text-muted">{row.address}</p><p className="mt-1 text-[9px] text-text-dim">{row.network} · {row.derivationReference ?? 'sin derivación'} · fp {row.sourceFingerprint?.slice(0,16) ?? '—'}…</p></div><div className="flex shrink-0 gap-2">{row.status==='available'&&row.validationStatus==='pending'&&<Button onClick={()=>void validateAddress(row)} disabled={busy} variant="primary" size="sm"><CheckCircle2 size={13}/>Validar</Button>}{row.status==='available'&&<Button onClick={()=>void retireAddress(row)} disabled={busy} variant="secondary" size="sm">Retirar</Button>}</div></div></div>)}</div>}
      <div className="mt-5 flex items-center justify-end gap-2"><Button variant="secondary" size="sm" disabled={loading || busy || snapshot.addressOffset===0} onClick={()=>void load(Math.max(0,snapshot.addressOffset-snapshot.addressLimit))}><ChevronLeft size={13}/>Anterior</Button><Button variant="secondary" size="sm" disabled={loading || busy || !snapshot.hasMore} onClick={()=>void load(snapshot.addressOffset+snapshot.addressLimit)}>Siguiente<ChevronRight size={13}/></Button></div>
    </section>

    <style jsx global>{`.poolInput{width:100%;border-radius:11px;padding:10px 12px;background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.09);color:#fff;outline:none}.poolInput:focus{border-color:rgba(201,169,98,.38)}.poolLabel{display:block;font-size:10px;color:var(--text-muted)}`}</style>
  </div>;
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) { return <div className="rounded-xl border border-white/[.07] bg-white/[.018] p-4"><div className="mb-3 text-accent">{icon}</div><p className="text-[9px] uppercase tracking-[.13em] text-text-dim">{label}</p><p className="mt-1 text-xl font-semibold text-white">{value}</p></div>; }
function Badge({ value }: { value: string }) { return <span className="rounded-full border border-white/10 bg-white/[.03] px-2 py-0.5 text-[8px] uppercase tracking-[.1em] text-text-dim">{value}</span>; }
