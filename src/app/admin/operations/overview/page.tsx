import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { formatCents } from '@/lib/format';
import { Activity, AlertTriangle, Beer, Boxes, CircleDollarSign, PackageCheck, ShoppingCart } from 'lucide-react';

type Lot={id:string;code:string;beer_style:string;status:string;total_cases:number;case_size_units:number;created_at:string};
type Bottle={lot_id:string;status:string;sale_price_cents:number|null};
type Financial={lot_id:string;entry_type:string;amount_cents:number};

function amountByType(rows:Financial[],type:string){return rows.filter(row=>row.entry_type===type).reduce((sum,row)=>sum+Number(row.amount_cents||0),0)}
function netFinancial(rows:Financial[]){const revenue=amountByType(rows,'REVENUE');const revenueReversal=amountByType(rows,'REVENUE_REVERSAL');const tax=amountByType(rows,'TAX');const taxReversal=amountByType(rows,'TAX_REVERSAL');const production=amountByType(rows,'PRODUCTION_COST');const commercial=amountByType(rows,'COMMERCIAL_COST');const adjustment=amountByType(rows,'ADJUSTMENT');return{netRevenue:revenue-revenueReversal,netTax:tax-taxReversal,result:(revenue-revenueReversal)-(tax-taxReversal)-production-commercial-adjustment}}

export default async function OperationsOverviewPage(){
  const supabase=await createClient();
  const [{data:lotData},{data:bottleData},{data:financialData}]=await Promise.all([
    supabase.from('investment_production_lots').select('id,code,beer_style,status,total_cases,case_size_units,created_at').order('created_at',{ascending:false}),
    supabase.from('investment_bottle_units').select('lot_id,status,sale_price_cents'),
    supabase.from('investment_lot_financial_entries').select('lot_id,entry_type,amount_cents'),
  ]);
  const lots=(lotData??[]) as Lot[];const bottles=(bottleData??[]) as Bottle[];const financial=(financialData??[]) as Financial[];
  const activeLots=lots.filter(l=>!['CLOSED','CANCELLED','EXPIRED'].includes(l.status));
  const capacity=lots.reduce((s,l)=>s+l.total_cases*l.case_size_units,0);
  const sold=bottles.filter(b=>b.status==='SOLD').length;
  const damaged=bottles.filter(b=>['DAMAGED','LOST','EXPIRED','RECALLED'].includes(b.status)).length;
  const totals=netFinancial(financial);
  const byLot=lots.slice(0,12).map(l=>{const units=bottles.filter(b=>b.lot_id===l.id);const facts=netFinancial(financial.filter(f=>f.lot_id===l.id));return{...l,serialized:units.length,sold:units.filter(u=>u.status==='SOLD').length,revenue:facts.netRevenue};});
  return <div className="space-y-7"><header className="rounded-[28px] border border-white/10 p-6 sm:p-8" style={{background:'linear-gradient(135deg,rgba(18,18,18,.98),rgba(7,7,7,.95))'}}><p className="text-[9px] uppercase tracking-[.28em] text-accent mb-3">CTG One · Operations Intelligence</p><h1 className="text-3xl sm:text-5xl font-outfit font-semibold">Production Command View</h1><p className="text-sm text-text-muted mt-3 max-w-3xl leading-relaxed">Lectura ejecutiva de producción, trazabilidad y hechos financieros registrados por lote. Ingresos e impuestos se muestran netos de notas crédito. No modifica ledger ni settlements.</p></header><section className="grid grid-cols-2 xl:grid-cols-4 gap-3"><Metric icon={<Beer/>} label="Lotes activos" value={String(activeLots.length)}/><Metric icon={<Boxes/>} label="Capacidad total" value={`${capacity} und.`}/><Metric icon={<PackageCheck/>} label="Serializadas" value={String(bottles.length)}/><Metric icon={<ShoppingCart/>} label="Vendidas vigentes" value={String(sold)}/><Metric icon={<CircleDollarSign/>} label="Ingresos netos" value={formatCents(totals.netRevenue)}/><Metric icon={<Activity/>} label="Resultado registrado" value={formatCents(totals.result)}/><Metric icon={<AlertTriangle/>} label="Incidencias físicas" value={String(damaged)}/><Metric icon={<Activity/>} label="Sell-through neto" value={bottles.length?`${((sold/bottles.length)*100).toFixed(1)}%`:'0%'}/></section><section className="rounded-2xl border border-white/10 overflow-hidden bg-white/[.02]"><div className="p-5 border-b border-white/[.07]"><p className="text-[9px] uppercase tracking-[.18em] text-text-dim">LOT PERFORMANCE</p><h2 className="text-xl font-outfit font-semibold mt-1">Desempeño por lote</h2></div><div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="text-[9px] uppercase tracking-[.12em] text-text-dim"><tr><th className="p-4">Lote</th><th className="p-4">Estado</th><th className="p-4">Serializadas</th><th className="p-4">Vendidas vigentes</th><th className="p-4">Conversión neta</th><th className="p-4">Ingresos netos</th></tr></thead><tbody>{byLot.map(l=><tr key={l.id} className="border-t border-white/[.06]"><td className="p-4"><p className="text-white font-medium">{l.beer_style}</p><p className="font-mono text-[9px] text-text-dim mt-1">{l.code}</p></td><td className="p-4 text-accent">{l.status}</td><td className="p-4">{l.serialized}</td><td className="p-4">{l.sold}</td><td className="p-4">{l.serialized?`${((l.sold/l.serialized)*100).toFixed(1)}%`:'—'}</td><td className="p-4 font-mono text-accent">{formatCents(l.revenue)}</td></tr>)}</tbody></table></div></section></div>;
}
function Metric({icon,label,value}:{icon:React.ReactNode;label:string;value:string}){return <div className="rounded-2xl border border-white/[.08] bg-white/[.02] p-4 sm:p-5"><div className="text-accent mb-4">{React.cloneElement(icon as React.ReactElement<{size?:number}>,{size:16})}</div><p className="text-[9px] uppercase tracking-[.13em] text-text-dim">{label}</p><p className="text-lg sm:text-xl font-outfit font-semibold mt-2 truncate">{value}</p></div>}
