'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { formatCents } from '@/lib/format';
import type {
  AutoMatchSummary,
  FinancialEventDirection,
  FinancialProviderEventType,
  FinancialProviderRail,
  FinancialReconciliationInboxRow,
  NormalizedFinancialProviderEventInput,
  ProviderReconciliationHealth,
} from '@/types/provider-reconciliation';
import { AlertTriangle, CheckCircle2, FileJson, RefreshCw, SearchCheck, ShieldCheck, Upload } from 'lucide-react';

const localNow = () => {
  const date = new Date();
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
};

type ManualDraft = {
  providerCode: string;
  providerEventKey: string;
  direction: FinancialEventDirection;
  eventType: FinancialProviderEventType;
  paymentRail: FinancialProviderRail;
  amountCop: string;
  externalReference: string;
  merchantReference: string;
  occurredAt: string;
};

const freshManual = (): ManualDraft => ({
  providerCode: '', providerEventKey: '', direction: 'INBOUND', eventType: 'SETTLED', paymentRail: 'bank_transfer',
  amountCop: '', externalReference: '', merchantReference: '', occurredAt: localNow(),
});

export default function ProviderReconciliationPage() {
  const [rows, setRows] = useState<FinancialReconciliationInboxRow[]>([]);
  const [health, setHealth] = useState<ProviderReconciliationHealth | null>(null);
  const [manual, setManual] = useState<ManualDraft>(freshManual);
  const [batchJson, setBatchJson] = useState('');
  const [targets, setTargets] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    const supabase = createClient();
    const [inboxResult, healthResult] = await Promise.all([
      supabase.rpc('get_investment_financial_reconciliation_inbox', { p_limit: 200 }),
      supabase.rpc('get_investment_provider_reconciliation_health'),
    ]);
    if (inboxResult.error) setError(inboxResult.error.message);
    else setRows((inboxResult.data ?? []) as FinancialReconciliationInboxRow[]);
    if (healthResult.error) setError((current) => current ?? healthResult.error.message);
    else setHealth(healthResult.data as ProviderReconciliationHealth);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const pendingCount = useMemo(() => rows.filter((row) => !row.is_terminal).length, [rows]);

  const importEvents = async (events: NormalizedFinancialProviderEventInput[], source: 'manual' | 'batch') => {
    setBusy(source); setError(null); setMessage(null);
    try {
      const response = await fetch('/api/investment/admin/finance/events/import', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ events, autoMatch: true }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? body.results?.[0]?.error ?? 'No se pudo importar el evento');
      const failures = Number(body.failed ?? 0);
      setMessage(`Importados ${body.imported ?? events.length} evento(s)${failures ? `; ${failures} requieren revisión del error.` : ' y ejecutado auto-match.'}`);
      if (source === 'manual') setManual(freshManual()); else setBatchJson('');
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo importar el evento financiero');
    } finally { setBusy(null); }
  };

  const submitManual = async () => {
    const amountCop = Number(manual.amountCop);
    if (!amountCop || amountCop <= 0) { setError('Ingresa un monto válido en COP.'); return; }
    if (!manual.providerCode.trim() || !manual.providerEventKey.trim()) { setError('Proveedor y event key son obligatorios.'); return; }
    const occurredAt = new Date(manual.occurredAt);
    if (Number.isNaN(occurredAt.getTime())) { setError('Fecha/hora del proveedor inválida.'); return; }
    await importEvents([{
      providerCode: manual.providerCode.trim(), providerEventKey: manual.providerEventKey.trim(), direction: manual.direction,
      eventType: manual.eventType, paymentRail: manual.paymentRail, amountCents: Math.round(amountCop * 100),
      externalReference: manual.externalReference.trim() || null, merchantReference: manual.merchantReference.trim() || null,
      occurredAt: occurredAt.toISOString(),
    }], 'manual');
  };

  const submitBatch = async () => {
    try {
      const parsed = JSON.parse(batchJson) as unknown;
      if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('El JSON debe ser un array no vacío de eventos normalizados.');
      await importEvents(parsed as NormalizedFinancialProviderEventInput[], 'batch');
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'JSON inválido'); }
  };

  const autoMatchPending = async () => {
    setBusy('auto'); setError(null); setMessage(null);
    const { data, error: rpcError } = await createClient().rpc('auto_match_pending_investment_financial_events', { p_limit: 200 });
    if (rpcError) setError(rpcError.message);
    else {
      const summary = data as AutoMatchSummary;
      setMessage(`Auto-match: ${summary.processed} procesados · ${summary.reconciled} inbound conciliados · ${summary.confirmed} payouts confirmados · ${summary.failed} fallos · ${summary.unmatched} sin match · ${summary.conflicts} conflictos.`);
      await load();
    }
    setBusy(null);
  };

  const resolve = async (row: FinancialReconciliationInboxRow, action: 'RECONCILE' | 'CONFIRM' | 'FAIL' | 'IGNORE') => {
    const target = targets[row.event_id]?.trim() || null;
    if (action !== 'IGNORE' && !target) { setError(`Ingresa el ${row.direction === 'INBOUND' ? 'order UUID' : 'payout UUID'} autoritativo.`); return; }
    setBusy(row.event_id); setError(null); setMessage(null);
    const { error: rpcError } = await createClient().rpc('resolve_investment_financial_event', {
      p_event_id: row.event_id, p_action: action,
      p_order_id: row.direction === 'INBOUND' && action !== 'IGNORE' ? target : null,
      p_payout_id: row.direction === 'OUTBOUND' && action !== 'IGNORE' ? target : null,
      p_notes: 'Resolved from Finance Reconciliation Inbox',
    });
    if (rpcError) setError(rpcError.message);
    else { setMessage(`Evento ${row.provider_event_key} resuelto como ${action}.`); await load(); }
    setBusy(null);
  };

  return <div className="space-y-7">
    <header className="rounded-[28px] border border-white/10 p-6 sm:p-8" style={{ background: 'linear-gradient(135deg,rgba(18,18,18,.98),rgba(7,7,7,.95))' }}>
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5"><div><p className="text-[9px] uppercase tracking-[.28em] text-accent mb-3">CTG One · Finance OS</p><h1 className="text-3xl sm:text-5xl font-outfit font-semibold">Provider Reconciliation</h1><p className="text-sm text-text-muted mt-3 max-w-3xl leading-relaxed">Ingesta eventos financieros externos normalizados, ejecuta matching determinístico y conserva una cola manual para cualquier caso ambiguo.</p></div><div className="flex gap-2"><Button onClick={() => void autoMatchPending()} loading={busy === 'auto'} variant="primary" size="sm"><SearchCheck size={14}/> Auto-match pendientes</Button><Button onClick={() => void load()} variant="secondary" size="sm"><RefreshCw size={14}/> Actualizar</Button></div></div>
    </header>

    <section className="grid sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <Metric label="Eventos" value={health?.total_events ?? 0}/><Metric label="Pendientes" value={health?.unresolved_events ?? pendingCount}/><Metric label="Sin match" value={health?.latest_no_match ?? 0}/><Metric label="Conflictos" value={health?.latest_conflict ?? 0}/><Metric label="Receipt mismatch" value={health?.reconciled_receipt_mismatches ?? 0}/><Metric label="Payout mismatch" value={(health?.confirmed_payout_mismatches ?? 0)+(health?.failed_payout_mismatches ?? 0)}/>
    </section>

    {(message || error) && <div className="rounded-xl border px-4 py-3 text-sm" style={{ borderColor: error ? 'rgba(239,68,68,.3)' : 'rgba(201,169,98,.28)', background: error ? 'rgba(239,68,68,.06)' : 'rgba(201,169,98,.05)', color: error ? '#fca5a5' : 'var(--accent)' }}>{error ?? message}</div>}

    <section className="grid xl:grid-cols-[1.05fr_.95fr] gap-5">
      <div className="rounded-2xl border border-white/[.08] bg-white/[.02] p-5 sm:p-6 space-y-4"><div className="flex items-center gap-2"><Upload size={15} className="text-accent"/><h2 className="text-sm font-medium text-white">Registrar evento normalizado</h2></div><p className="text-[11px] text-text-dim">No pegues extractos completos ni números de cuenta. Registra únicamente la evidencia necesaria para conciliar.</p>
        <div className="grid sm:grid-cols-2 gap-3"><Field label="Proveedor"><input className="providerInput" value={manual.providerCode} onChange={(e)=>setManual({...manual,providerCode:e.target.value})} placeholder="BANCOLOMBIA"/></Field><Field label="Provider event key"><input className="providerInput" value={manual.providerEventKey} onChange={(e)=>setManual({...manual,providerEventKey:e.target.value})} placeholder="EVT-..."/></Field><Field label="Dirección"><select className="providerInput" value={manual.direction} onChange={(e)=>{const direction=e.target.value as FinancialEventDirection;setManual({...manual,direction,eventType:direction==='INBOUND'?'SETTLED':'CONFIRMED',paymentRail:'bank_transfer'})}}><option value="INBOUND">INBOUND</option><option value="OUTBOUND">OUTBOUND</option></select></Field><Field label="Evento"><select className="providerInput" value={manual.eventType} onChange={(e)=>setManual({...manual,eventType:e.target.value as FinancialProviderEventType})}>{manual.direction==='INBOUND'?<option value="SETTLED">SETTLED</option>:<><option value="CONFIRMED">CONFIRMED</option><option value="FAILED">FAILED</option></>}</select></Field><Field label="Rail"><select className="providerInput" value={manual.paymentRail} onChange={(e)=>setManual({...manual,paymentRail:e.target.value as FinancialProviderRail})}>{manual.direction==='INBOUND'?<><option value="bank_transfer">bank_transfer</option><option value="pse">pse</option><option value="bre_b_qr">bre_b_qr</option><option value="crypto">crypto</option></>:<><option value="bank_transfer">bank_transfer</option><option value="bre_b">bre_b</option><option value="crypto">crypto</option><option value="other">other</option></>}</select></Field><Field label="Monto COP"><input type="number" min="0" className="providerInput" value={manual.amountCop} onChange={(e)=>setManual({...manual,amountCop:e.target.value})} placeholder="3000000"/></Field><Field label="Referencia externa"><input className="providerInput" value={manual.externalReference} onChange={(e)=>setManual({...manual,externalReference:e.target.value})} placeholder="TRX-..."/></Field><Field label="Merchant reference"><input className="providerInput" value={manual.merchantReference} onChange={(e)=>setManual({...manual,merchantReference:e.target.value})} placeholder="Payout UUID / idempotency key"/></Field><Field label="Fecha/hora proveedor"><input type="datetime-local" className="providerInput" value={manual.occurredAt} onChange={(e)=>setManual({...manual,occurredAt:e.target.value})}/></Field></div>
        <Button onClick={() => void submitManual()} loading={busy==='manual'} variant="primary" size="sm"><ShieldCheck size={13}/> Ingestar + auto-match</Button>
      </div>

      <div className="rounded-2xl border border-white/[.08] bg-white/[.02] p-5 sm:p-6 space-y-4"><div className="flex items-center gap-2"><FileJson size={15} className="text-accent"/><h2 className="text-sm font-medium text-white">Batch JSON normalizado</h2></div><p className="text-[11px] text-text-dim">Hasta 100 eventos. Usa campos `providerCode`, `providerEventKey`, `direction`, `eventType`, `paymentRail`, `amountCents`, `externalReference`, `merchantReference`, `occurredAt`.</p><textarea className="providerInput min-h-56 font-mono text-[11px]" value={batchJson} onChange={(e)=>setBatchJson(e.target.value)} placeholder='[{"providerCode":"BANCOLOMBIA","providerEventKey":"EVT-1","direction":"INBOUND","eventType":"SETTLED","paymentRail":"bank_transfer","amountCents":300000000,"externalReference":"TRX-1","occurredAt":"2026-08-18T12:00:00-05:00"}]'/><Button onClick={() => void submitBatch()} loading={busy==='batch'} disabled={!batchJson.trim()} variant="secondary" size="sm">Importar batch</Button></div>
    </section>

    <section className="space-y-4"><div><p className="text-[9px] uppercase tracking-[.18em] text-text-dim">Reconciliation Inbox</p><h2 className="text-xl font-semibold text-white mt-1">Eventos externos</h2></div>{loading?<p className="text-sm text-text-dim">Sincronizando provider events...</p>:rows.length===0?<div className="rounded-2xl border border-white/[.08] bg-white/[.02] p-7 text-sm text-text-dim">No hay eventos financieros importados.</div>:<div className="grid lg:grid-cols-2 gap-4">{rows.map((row)=><EventCard key={row.event_id} row={row} target={targets[row.event_id]??''} setTarget={(value)=>setTargets((current)=>({...current,[row.event_id]:value}))} busy={busy===row.event_id} resolve={(action)=>void resolve(row,action)}/>)}</div>}</section>
    <style jsx global>{`.providerInput{width:100%;border-radius:11px;padding:10px 12px;background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.09);color:#fff;outline:none}.providerInput:focus{border-color:rgba(201,169,98,.38)}`}</style>
  </div>;
}

function EventCard({ row, target, setTarget, busy, resolve }: { row: FinancialReconciliationInboxRow; target: string; setTarget: (value:string)=>void; busy:boolean; resolve:(action:'RECONCILE'|'CONFIRM'|'FAIL'|'IGNORE')=>void }) {
  const action = row.direction==='INBOUND'?'RECONCILE':row.event_type==='CONFIRMED'?'CONFIRM':'FAIL';
  return <article className="rounded-2xl border border-white/[.08] bg-white/[.02] p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-[9px] uppercase tracking-[.14em] text-text-dim">{row.provider_code} · {row.direction}</p><p className="text-lg font-semibold text-white mt-1">{formatCents(row.amount_cents)}</p><p className="text-[9px] font-mono text-text-dim mt-1">{row.provider_event_key}</p></div><span className={`rounded-full border px-2.5 py-1 text-[8px] uppercase tracking-[.1em] ${row.is_terminal?'border-emerald-400/20 text-emerald-300':'border-amber-300/20 text-amber-200'}`}>{row.match_outcome ?? 'PENDING'}</span></div><div className="grid grid-cols-2 gap-2 mt-4"><Mini label="Rail" value={row.payment_rail}/><Mini label="Evento" value={row.event_type}/><Mini label="External ref" value={row.external_reference ?? '—'}/><Mini label="Merchant ref" value={row.merchant_reference ?? '—'}/></div>{row.is_terminal?<div className="mt-4 border-t border-white/[.07] pt-4 text-[11px] text-text-muted"><CheckCircle2 size={13} className="inline text-emerald-300 mr-1"/> {row.match_method} · {row.order_id ?? row.payout_id ?? row.receipt_id ?? 'sin target'}</div>:<div className="mt-4 border-t border-white/[.07] pt-4 space-y-3"><div className="flex items-center gap-2 text-[11px] text-amber-200/80"><AlertTriangle size={13}/> Auto-match no produjo un target terminal.</div><input className="providerInput" value={target} onChange={(e)=>setTarget(e.target.value)} placeholder={row.direction==='INBOUND'?'Order UUID':'Payout UUID'}/><div className="flex gap-2 flex-wrap"><Button onClick={()=>resolve(action)} loading={busy} variant="primary" size="sm">Resolver: {action}</Button><Button onClick={()=>resolve('IGNORE')} disabled={busy} variant="secondary" size="sm">Ignorar evento</Button></div></div>}</article>;
}

function Metric({ label, value }: { label:string; value:number }) { return <div className="rounded-xl border border-white/[.07] bg-white/[.018] p-4"><p className="text-[8px] uppercase tracking-[.13em] text-text-dim">{label}</p><p className="text-xl font-semibold text-white mt-1">{value}</p></div>; }
function Field({ label, children }: { label:string; children:React.ReactNode }) { return <label className="text-[10px] text-text-muted"><span className="block mb-1.5">{label}</span>{children}</label>; }
function Mini({ label, value }: { label:string; value:string }) { return <div className="rounded-lg border border-white/[.06] p-3 min-w-0"><p className="text-[8px] uppercase tracking-[.11em] text-text-dim">{label}</p><p className="text-[11px] text-white mt-1 truncate" title={value}>{value}</p></div>; }
