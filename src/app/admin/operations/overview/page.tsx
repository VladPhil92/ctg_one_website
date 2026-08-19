import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { formatCents } from '@/lib/format';
import { Activity, AlertTriangle, Beer, Boxes, CircleDollarSign, PackageCheck, ShoppingCart } from 'lucide-react';

type OperationsBusiness = {
  total_lots: number;
  active_lots: number;
  total_capacity_units: number;
  serialized_units: number;
  sold_units: number;
  physical_incidents: number;
  sell_through_pct: number;
  net_revenue_cents: number;
  net_tax_cents: number;
  production_cost_cents: number;
  commercial_cost_cents: number;
  adjustment_cents: number;
  recorded_result_cents: number;
};

type LotPerformance = {
  id: string;
  code: string;
  beer_style: string;
  status: string;
  serialized_units: number;
  sold_units: number;
  net_revenue_cents: number;
};

type OperationsDashboardSnapshot = {
  generated_at: string;
  business: OperationsBusiness;
  lot_performance: LotPerformance[];
};

export default async function OperationsOverviewPage(){
  const supabase=await createClient();
  const {data,error}=await supabase.rpc('get_operations_dashboard_snapshot',{p_lot_limit:12});
  if(error) throw new Error(`No se pudo cargar Production Command View: ${error.message}`);

  const snapshot=data as OperationsDashboardSnapshot;
  const business=snapshot?.business ?? {
    total_lots:0,active_lots:0,total_capacity_units:0,serialized_units:0,sold_units:0,physical_incidents:0,sell_through_pct:0,
    net_revenue_cents:0,net_tax_cents:0,production_cost_cents:0,commercial_cost_cents:0,adjustment_cents:0,recorded_result_cents:0,
  };
  const byLot=(snapshot?.lot_performance ?? []) as LotPerformance[];

  return <div className="space-y-7"><header className="rounded-[28px] border border-white/10 p-6 sm:p-8" style={{background:'linear-gradient(135deg,rgba(18,18,18,.98),rgba(7,7,7,.95))'}}><p className="text-[9px] uppercase tracking-[.28em] text-accent mb-3">CTG One · Operations Intelligence</p><h1 className="text-3xl sm:text-5xl font-outfit font-semibold">Production Command View</h1><p className="text-sm text-text-muted mt-3 max-w-3xl leading-relaxed">Lectura ejecutiva agregada de producción, trazabilidad y hechos financieros registrados por lote. Ingresos e impuestos se muestran netos de notas crédito. No modifica ledger ni settlements.</p></header><section className="grid grid-cols-2 xl:grid-cols-4 gap-3"><Metric icon={<Beer/>} label="Lotes activos" value={String(business.active_lots)}/><Metric icon={<Boxes/>} label="Capacidad total" value={`${business.total_capacity_units} und.`}/><Metric icon={<PackageCheck/>} label="Serializadas" value={String(business.serialized_units)}/><Metric icon={<ShoppingCart/>} label="Vendidas vigentes" value={String(business.sold_units)}/><Metric icon={<CircleDollarSign/>} label="Ingresos netos" value={formatCents(business.net_revenue_cents)}/><Metric icon={<Activity/>} label="Resultado registrado" value={formatCents(business.recorded_result_cents)}/><Metric icon={<AlertTriangle/>} label="Incidencias físicas" value={String(business.physical_incidents)}/><Metric icon={<Activity/>} label="Sell-through neto" value={`${Number(business.sell_through_pct||0).toFixed(1)}%`}/></section><section className="rounded-2xl border border-white/10 overflow-hidden bg-white/[.02]"><div className="p-5 border-b border-white/[.07]"><p className="text-[9px] uppercase tracking-[.18em] text-text-dim">LOT PERFORMANCE</p><h2 className="text-xl font-outfit font-semibold mt-1">12 lotes más recientes</h2></div><div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="text-[9px] uppercase tracking-[.12em] text-text-dim"><tr><th className="p-4">Lote</th><th className="p-4">Estado</th><th className="p-4">Serializadas</th><th className="p-4">Vendidas vigentes</th><th className="p-4">Conversión neta</th><th className="p-4">Ingresos netos</th></tr></thead><tbody>{byLot.map(l=><tr key={l.id} className="border-t border-white/[.06]"><td className="p-4"><p className="text-white font-medium">{l.beer_style}</p><p className="font-mono text-[9px] text-text-dim mt-1">{l.code}</p></td><td className="p-4 text-accent">{l.status}</td><td className="p-4">{l.serialized_units}</td><td className="p-4">{l.sold_units}</td><td className="p-4">{l.serialized_units?`${((l.sold_units/l.serialized_units)*100).toFixed(1)}%`:'—'}</td><td className="p-4 font-mono text-accent">{formatCents(l.net_revenue_cents)}</td></tr>)}</tbody></table></div></section></div>;
}
function Metric({icon,label,value}:{icon:React.ReactNode;label:string;value:string}){return <div className="rounded-2xl border border-white/[.08] bg-white/[.02] p-4 sm:p-5"><div className="text-accent mb-4">{React.cloneElement(icon as React.ReactElement<{size?:number}>,{size:16})}</div><p className="text-[9px] uppercase tracking-[.13em] text-text-dim">{label}</p><p className="text-lg sm:text-xl font-outfit font-semibold mt-2 truncate">{value}</p></div>}
