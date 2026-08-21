'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatCents } from '@/lib/format';
import { Activity, ArrowRight, CheckCircle2, CircleAlert, RefreshCw, Route, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';

type LotOption = { id: string; code: string; beerStyle: string; status: string; createdAt: string };
type Milestone = { key: string; complete: boolean };
type Snapshot = {
  lotOptions: LotOption[];
  selectedLot: null | { id: string; code: string; beerStyle: string; destination: string; status: string; totalCases: number; totalEligibleCases: number };
  funding?: { allocationCount: number; allocatedCases: number; allocatedCapitalCents: number; externalParticipantCount: number; orderCount: number; allocatedOrderCount: number; receiptCount: number; receiptCents: number };
  production?: { eventCount: number; serializedUnits: number; terminalPhysicalUnits: number; statusCounts: Record<string, number> };
  inventory?: { isReconciled: boolean; canonicalLocationGaps: number; locationMismatches: number; statusMismatches: number; saleLinkMismatches: number };
  sales?: { saleCount: number; documentedSoldUnits: number; grossRevenueCents: number; taxRecognizedCents: number; creditNoteCount: number; returnedUnits: number; grossCreditCents: number; taxCreditCents: number; returnGenealogyMismatches: number };
  finance?: { netRevenueCents: number; netTaxCents: number; productionCostCents: number; commercialCostCents: number; adjustmentCents: number };
  settlement?: { finalized: boolean; settlementId: string | null; netDistributableProfitCents: number | null; participantCreditCount: number; participantCreditCents: number };
  liquidity?: { sourceLinkedReinvestmentCount: number; sourceLinkedReinvestmentCents: number; sourceLinkedApprovedReinvestmentCents?: number; creditedParticipantWithdrawalCountAfterSettlement: number; creditedParticipantWithdrawalCentsAfterSettlement: number; note: string };
  milestones?: Milestone[];
  nextAction: string;
  generatedAt: string;
};

const NEXT_LABEL: Record<string,string> = {
  CREATE_LOT: 'Crear lote', FUNDING: 'Completar funding', PAYMENT_RECONCILIATION: 'Conciliar pagos',
  PRODUCTION_SERIALIZATION: 'Producir y serializar', INVENTORY_RECONCILIATION: 'Conciliar inventario',
  SALES_OR_PHYSICAL_CLOSE: 'Cerrar ventas / inventario', RETURN_RECONCILIATION: 'Conciliar devoluciones',
  SETTLEMENT: 'Finalizar settlement', CLOSED_LOOP: 'Ciclo cerrado',
};

export function InvestmentOperationalJourney() {
  const [snapshot,setSnapshot]=useState<Snapshot|null>(null);
  const [selected,setSelected]=useState<string>('');
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState<string|null>(null);

  const load=useCallback(async(lotId?:string|null)=>{
    setLoading(true); setError(null);
    const {data,error:rpcError}=await createClient().rpc('get_investment_operational_journey',{p_lot_id:lotId||null});
    if(rpcError){setError(rpcError.message);setLoading(false);return;}
    const next=data as Snapshot;
    setSnapshot(next);
    if(next.selectedLot?.id) setSelected(next.selectedLot.id);
    setLoading(false);
  },[]);

  useEffect(()=>{void load(null)},[load]);

  if(loading && !snapshot) return <p className="text-sm text-text-dim">Reconstruyendo Golden Journey...</p>;
  if(error && !snapshot) return <div className="rounded-xl border border-red-400/20 bg-red-400/[.05] p-4 text-sm text-red-300">{error}</div>;
  if(!snapshot?.selectedLot) return <div className="rounded-2xl border border-white/[.08] bg-white/[.02] p-7 text-sm text-text-dim">Aún no existen lotes para reconstruir.</div>;

  const f=snapshot.funding!; const p=snapshot.production!; const i=snapshot.inventory!; const s=snapshot.sales!; const fin=snapshot.finance!; const st=snapshot.settlement!; const l=snapshot.liquidity!;
  const netCommercial=fin.netRevenueCents-fin.netTaxCents;

  return <div className="space-y-6">
    <div className="flex flex-col gap-3 rounded-2xl border border-white/[.08] bg-white/[.02] p-4 sm:flex-row sm:items-end sm:justify-between">
      <label className="min-w-0 flex-1 text-[9px] uppercase tracking-[.15em] text-text-dim">Lote
        <select className="mt-2 w-full rounded-xl border border-white/[.09] bg-black/40 px-3 py-2.5 text-xs text-white outline-none" value={selected} onChange={e=>{setSelected(e.target.value);void load(e.target.value)}}>
          {snapshot.lotOptions.map(o=><option key={o.id} value={o.id}>{o.code} · {o.beerStyle} · {o.status}</option>)}
        </select>
      </label>
      <Button variant="secondary" size="sm" loading={loading} onClick={()=>void load(selected)}><RefreshCw size={13}/> Actualizar</Button>
    </div>

    {error&&<div className="rounded-xl border border-red-400/20 bg-red-400/[.05] p-4 text-sm text-red-300">{error}</div>}

    <section className="rounded-[28px] border border-white/10 p-6 sm:p-8" style={{background:'linear-gradient(135deg,rgba(18,18,18,.98),rgba(7,7,7,.95))'}}>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-[9px] uppercase tracking-[.28em] text-accent mb-3">CTG One · Investment OS</p><h1 className="text-3xl sm:text-5xl font-outfit font-semibold">Operational Golden Journey</h1><p className="mt-3 text-sm text-text-muted">{snapshot.selectedLot.code} · {snapshot.selectedLot.beerStyle} · {snapshot.selectedLot.destination}</p></div><div className="rounded-xl border border-accent/20 bg-accent/[.04] px-4 py-3"><p className="text-[8px] uppercase tracking-[.14em] text-text-dim">Next authoritative action</p><p className="mt-1 text-sm font-medium text-accent">{NEXT_LABEL[snapshot.nextAction]??snapshot.nextAction}</p></div></div>
    </section>

    <section className="grid grid-cols-2 xl:grid-cols-4 gap-3">
      <Metric label="Capital asignado" value={formatCents(f.allocatedCapitalCents)} />
      <Metric label="Serializadas" value={`${p.serializedUnits} und.`} />
      <Metric label="Ingreso neto" value={formatCents(fin.netRevenueCents)} />
      <Metric label="Crédito participante" value={formatCents(st.participantCreditCents)} />
    </section>

    <section className="rounded-2xl border border-white/[.08] bg-white/[.02] p-5 sm:p-6"><div className="mb-5 flex items-center gap-2"><Route size={15} className="text-accent"/><h2 className="font-outfit text-xl font-semibold">Milestones</h2></div><div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3">{(snapshot.milestones??[]).map(m=><div key={m.key} className="rounded-xl border border-white/[.07] p-4"><div className="flex items-center gap-2">{m.complete?<CheckCircle2 size={14} className="text-emerald-300"/>:<CircleAlert size={14} className="text-amber-300"/>}<p className="text-[9px] uppercase tracking-[.12em] text-text-muted">{m.key.replaceAll('_',' ')}</p></div></div>)}</div></section>

    <section className="grid lg:grid-cols-2 gap-4">
      <Panel title="Funding & Payment"><Row label="Órdenes / asignadas" value={`${f.orderCount} / ${f.allocatedOrderCount}`}/><Row label="Casos asignados" value={String(f.allocatedCases)}/><Row label="Participantes externos" value={String(f.externalParticipantCount)}/><Row label="Recibos conciliados" value={`${f.receiptCount} · ${formatCents(f.receiptCents)}`}/></Panel>
      <Panel title="Physical & Inventory"><Row label="Eventos producción" value={String(p.eventCount)}/><Row label="Unidades terminales" value={`${p.terminalPhysicalUnits}/${p.serializedUnits}`}/><Row label="Inventario reconciliado" value={i.isReconciled?'Sí':'No'} alert={!i.isReconciled}/><Row label="Mismatches" value={String(i.canonicalLocationGaps+i.locationMismatches+i.statusMismatches+i.saleLinkMismatches)} alert={i.canonicalLocationGaps+i.locationMismatches+i.statusMismatches+i.saleLinkMismatches>0}/></Panel>
      <Panel title="Sales & Returns"><Row label="Ventas / unidades documentadas" value={`${s.saleCount} / ${s.documentedSoldUnits}`}/><Row label="Notas crédito / devueltas" value={`${s.creditNoteCount} / ${s.returnedUnits}`}/><Row label="Crédito comercial" value={formatCents(s.grossCreditCents)}/><Row label="Genealogía devolución" value={s.returnGenealogyMismatches===0?'Reconciliada':`${s.returnGenealogyMismatches} mismatch`} alert={s.returnGenealogyMismatches>0}/></Panel>
      <Panel title="Finance & Settlement"><Row label="Comercial neto de impuesto" value={formatCents(netCommercial)}/><Row label="Costo producción" value={formatCents(fin.productionCostCents)}/><Row label="NDLP" value={st.netDistributableProfitCents==null?'Pendiente':formatCents(st.netDistributableProfitCents)}/><Row label="Settlement" value={st.finalized?'Finalizado':'Pendiente'} alert={!st.finalized}/></Panel>
    </section>

    <section className="rounded-2xl border border-white/[.08] bg-white/[.02] p-5 sm:p-6"><div className="mb-5 flex items-center gap-2"><ShieldCheck size={15} className="text-accent"/><h2 className="font-outfit text-xl font-semibold">Post-settlement liquidity</h2></div><div className="grid sm:grid-cols-4 gap-3"><Metric label="Reinversiones vinculadas" value={String(l.sourceLinkedReinvestmentCount)}/><Metric label="Capital reinvertido aprobado" value={formatCents(l.sourceLinkedApprovedReinvestmentCents??0)}/><Metric label="Retiros posteriores" value={String(l.creditedParticipantWithdrawalCountAfterSettlement)}/><Metric label="Monto retiros posteriores" value={formatCents(l.creditedParticipantWithdrawalCentsAfterSettlement)}/></div><p className="mt-4 text-[11px] leading-relaxed text-text-dim">{l.note}</p></section>

    <div className="flex items-center gap-2 text-[10px] text-text-dim"><Activity size={12}/><span>Snapshot generado {new Date(snapshot.generatedAt).toLocaleString()}</span><ArrowRight size={12}/><span>Solo lectura; no altera ledger, inventario ni settlement.</span></div>
  </div>;
}

function Panel({title,children}:{title:string;children:React.ReactNode}){return <div className="rounded-2xl border border-white/[.08] bg-white/[.02] p-5 sm:p-6"><h3 className="mb-4 text-[10px] uppercase tracking-[.16em] text-accent">{title}</h3><div className="space-y-3">{children}</div></div>}
function Row({label,value,alert=false}:{label:string;value:string;alert?:boolean}){return <div className="flex items-center justify-between gap-4 border-b border-white/[.055] pb-2 text-xs last:border-0"><span className="text-text-dim">{label}</span><span className={alert?'text-amber-300':'text-white'}>{value}</span></div>}
function Metric({label,value}:{label:string;value:string}){return <div className="rounded-xl border border-white/[.07] bg-white/[.018] p-4"><p className="text-[8px] uppercase tracking-[.13em] text-text-dim">{label}</p><p className="mt-2 truncate text-lg font-semibold text-white">{value}</p></div>}
