import React from 'react';
import { redirect } from 'next/navigation';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { formatCents } from '@/lib/format';
import { StatCard } from '@/components/admin/StatCard';
import { Beer, BrainCircuit, CircleDollarSign, Database, Factory, ShieldCheck, Users } from 'lucide-react';

export default async function AdminOverviewPage() {
  if (!isSupabaseConfigured) redirect('/');
  const supabase = await createClient();

  const [
    { count: totalUsers }, { count: pendingKyc }, { count: pendingDeposits }, { data: wallets },
    { count: lots }, { count: pendingOrders }, { count: openLots }
  ] = await Promise.all([
    supabase.from('profiles').select('*',{count:'exact',head:true}),
    supabase.from('kyc_submissions').select('*',{count:'exact',head:true}).eq('status','pending'),
    supabase.from('transactions').select('*',{count:'exact',head:true}).eq('status','pending').eq('type','deposit'),
    supabase.from('wallets').select('balance_cents'),
    supabase.from('investment_production_lots').select('*',{count:'exact',head:true}),
    supabase.from('investment_orders').select('*',{count:'exact',head:true}).eq('status','PAYMENT_SUBMITTED'),
    supabase.from('investment_production_lots').select('*',{count:'exact',head:true}).eq('status','FUNDING_OPEN'),
  ]);
  const totalFundsCents=(wallets??[]).reduce((sum,w)=>sum+(w.balance_cents??0),0);

  return <div className="space-y-8">
    <section className="rounded-[28px] border border-white/10 p-6 sm:p-8 relative overflow-hidden" style={{background:'linear-gradient(135deg,rgba(20,20,20,.97),rgba(8,8,8,.94))'}}>
      <div className="absolute -right-20 -top-24 w-72 h-72 rounded-full border border-accent/10" />
      <div className="relative"><p className="text-[9px] uppercase tracking-[.28em] text-accent mb-3">CTG One · Administrative Command Layer</p><h1 className="text-3xl sm:text-5xl font-outfit font-semibold text-white">Admin OS</h1><p className="text-sm text-text-muted mt-3 max-w-3xl leading-relaxed">Control central de identidad, operaciones, inversión, producción, trazabilidad y conocimiento. Cada dominio conserva su propia autorización y fuente de verdad.</p></div>
    </section>

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard label="Usuarios" value={String(totalUsers??0)} href="/admin/usuarios" />
      <StatCard label="Fondos operativos" value={formatCents(totalFundsCents)} />
      <StatCard label="Lotes registrados" value={String(lots??0)} href="/admin/operations" />
      <StatCard label="Pagos inversión pendientes" value={String(pendingOrders??0)} href="/inversion/admin/orders" highlight={!!pendingOrders}/>
    </div>

    <section><div className="mb-5"><p className="text-[9px] uppercase tracking-[.22em] text-text-dim">CONTROL DOMAINS</p><h2 className="text-2xl font-outfit font-semibold text-white mt-2">Módulos administrativos</h2></div><div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
      <Module href="/admin/operations" icon={<Factory/>} code="OPS-01" title="Production & Traceability" text={`${lots??0} lotes · ${openLots??0} con financiación abierta. Crea lotes, avanza producción, serializa botellas, mueve inventario y registra ventas.`}/>
      <Module href="/inversion/admin/orders" icon={<Beer/>} code="INV-02" title="Investment Administration" text="Revisa órdenes y comprobantes. La aprobación es la única vía que convierte un pago validado en allocation y ledger."/>
      <Module href="/admin/kyc" icon={<ShieldCheck/>} code="ID-03" title="Identity & KYC" text={`${pendingKyc??0} verificaciones generales pendientes. La identidad de inversión permanece separada de la cuenta operativa.`}/>
      <Module href="/admin/depositos" icon={<CircleDollarSign/>} code="FIN-04" title="Account Operations" text={`${pendingDeposits??0} recargas pendientes. Administra únicamente el saldo operacional CTG One, separado del ledger de inversión.`}/>
      <Module href="/admin/knowledge" icon={<BrainCircuit/>} code="KNW-05" title="Knowledge Curation" text="Administra el corpus autorizado de CTG Knowledge y conserva evidencia antes de respuestas."/>
      <Module href="/admin/usuarios" icon={<Users/>} code="IAM-06" title="Users & Access" text="Consulta usuarios y roles globales. Las facultades específicas de inversión continúan gobernadas por investment_role."/>
    </div></section>

    <section className="rounded-2xl border border-white/[.08] p-5 flex gap-4" style={{background:'rgba(255,255,255,.018)'}}><Database size={19} className="text-accent shrink-0"/><div><p className="text-sm text-white font-medium">Supabase es la fuente de verdad.</p><p className="text-xs text-text-muted mt-2 leading-relaxed">Admin OS no reemplaza las restricciones de base de datos. Los cambios de alto riesgo pasan por RPCs autorizadas, RLS, state machines y audit logs; la interfaz solo orquesta esos controles.</p></div></section>
  </div>;
}

function Module({href,icon,code,title,text}:{href:string;icon:React.ReactNode;code:string;title:string;text:string}){return <a href={href} className="group rounded-2xl border border-white/[.08] p-5 sm:p-6 transition-all hover:-translate-y-1 hover:border-accent/25" style={{background:'linear-gradient(145deg,rgba(255,255,255,.035),rgba(255,255,255,.012))'}}><div className="flex items-start justify-between gap-4 mb-5"><div className="w-10 h-10 rounded-full border border-accent/20 text-accent flex items-center justify-center">{icon}</div><span className="text-[8px] font-mono text-text-dim">{code}</span></div><h3 className="text-lg font-outfit font-semibold text-white">{title}</h3><p className="text-xs text-text-muted leading-relaxed mt-3">{text}</p><p className="text-[9px] uppercase tracking-[.15em] text-accent mt-5">Abrir módulo →</p></a>}
