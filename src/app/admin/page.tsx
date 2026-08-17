import React from 'react';
import { redirect } from 'next/navigation';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { formatCents } from '@/lib/format';
import { StatCard } from '@/components/admin/StatCard';
import { Beer, BrainCircuit, CircleDollarSign, Database, Factory, ShieldCheck, Users, ArrowUpRight } from 'lucide-react';

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
  const attentionCount=(pendingKyc??0)+(pendingDeposits??0)+(pendingOrders??0);

  return <div className="space-y-8 lg:space-y-10">
    <section className="relative overflow-hidden rounded-[30px] border border-white/[.085] px-6 py-7 sm:px-8 sm:py-9 lg:px-10" style={{background:'linear-gradient(135deg,rgba(20,20,20,.965),rgba(8,8,8,.93))',boxShadow:'inset 0 1px 0 rgba(255,255,255,.025),0 30px 80px rgba(0,0,0,.24)'}}>
      <div className="absolute -right-24 -top-32 h-80 w-80 rounded-full border border-accent/[.08]" />
      <div className="absolute -right-12 -top-20 h-56 w-56 rounded-full border border-accent/[.06]" />
      <div className="relative grid gap-7 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <div className="mb-4 flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_12px_rgba(201,169,98,.8)]"/><p className="text-[8px] uppercase tracking-[.28em] text-accent">CTG One · Administrative Command Layer</p></div>
          <h1 className="text-4xl font-outfit font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">Admin <span className="text-accent">OS</span></h1>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-text-muted">Control central de identidad, operaciones, inversión, producción, trazabilidad y conocimiento. La interfaz prioriza decisiones y excepciones; cada dominio conserva su propia autorización y fuente de verdad.</p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-white/[.07] bg-white/[.018] px-4 py-3">
          <div><p className="text-[8px] uppercase tracking-[.14em] text-text-dim">Atención requerida</p><p className="mt-1 text-2xl font-outfit font-semibold text-white">{attentionCount}</p></div>
          <div className={`h-2 w-2 rounded-full ${attentionCount>0?'bg-accent shadow-[0_0_12px_rgba(201,169,98,.8)]':'bg-emerald-400/70'}`} />
        </div>
      </div>
    </section>

    <section>
      <div className="mb-4 flex items-end justify-between gap-4"><div><p className="text-[8px] uppercase tracking-[.22em] text-text-dim">LIVE OVERVIEW</p><h2 className="mt-2 text-xl font-outfit font-semibold text-white">Estado operativo</h2></div><p className="hidden text-[10px] text-text-dim sm:block">Datos sincronizados desde Supabase</p></div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <StatCard label="Usuarios" value={String(totalUsers??0)} href="/admin/usuarios" />
        <StatCard label="Fondos operativos" value={formatCents(totalFundsCents)} />
        <StatCard label="Lotes registrados" value={String(lots??0)} href="/admin/operations" />
        <StatCard label="Pagos inversión pendientes" value={String(pendingOrders??0)} href="/inversion/admin/orders" highlight={!!pendingOrders}/>
      </div>
    </section>

    <section>
      <div className="mb-5 flex items-end justify-between gap-4"><div><p className="text-[8px] uppercase tracking-[.22em] text-text-dim">CONTROL DOMAINS</p><h2 className="mt-2 text-2xl font-outfit font-semibold tracking-tight text-white">Módulos administrativos</h2></div><p className="hidden max-w-md text-right text-[10px] leading-relaxed text-text-dim lg:block">Cada módulo representa un dominio operacional. Entra únicamente cuando necesites actuar sobre ese flujo.</p></div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Module href="/admin/operations" icon={<Factory size={19}/>} code="OPS-01" title="Production & Traceability" text={`${lots??0} lotes · ${openLots??0} con financiación abierta. Crea lotes, avanza producción, serializa botellas, mueve inventario y registra ventas.`}/>
        <Module href="/inversion/admin/orders" icon={<Beer size={19}/>} code="INV-02" title="Investment Administration" text="Revisa órdenes y comprobantes. La aprobación es la única vía que convierte un pago validado en allocation y ledger."/>
        <Module href="/admin/kyc" icon={<ShieldCheck size={19}/>} code="ID-03" title="Identity & KYC" text={`${pendingKyc??0} verificaciones pendientes. La identidad de inversión permanece separada de la cuenta operativa.`}/>
        <Module href="/admin/depositos" icon={<CircleDollarSign size={19}/>} code="FIN-04" title="Account Operations" text={`${pendingDeposits??0} recargas pendientes. Administra el saldo operacional CTG One, separado del ledger de inversión.`}/>
        <Module href="/admin/knowledge" icon={<BrainCircuit size={19}/>} code="KNW-05" title="Knowledge Curation" text="Administra el corpus autorizado de CTG Knowledge y conserva evidencia antes de respuestas."/>
        <Module href="/admin/usuarios" icon={<Users size={19}/>} code="IAM-06" title="Users & Access" text="Consulta usuarios y roles globales. Las facultades específicas de inversión continúan gobernadas por investment_role."/>
      </div>
    </section>

    <section className="flex flex-col gap-4 rounded-2xl border border-white/[.07] p-5 sm:flex-row sm:items-center sm:justify-between" style={{background:'linear-gradient(90deg,rgba(201,169,98,.035),rgba(255,255,255,.012))'}}>
      <div className="flex gap-4"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-accent/15 bg-accent/[.04]"><Database size={17} className="text-accent"/></div><div><p className="text-sm font-medium text-white">Supabase es la fuente de verdad.</p><p className="mt-1.5 max-w-4xl text-xs leading-relaxed text-text-muted">Admin OS no reemplaza las restricciones de base de datos. Los cambios de alto riesgo pasan por RPCs autorizadas, RLS, state machines y audit logs; la interfaz solo orquesta esos controles.</p></div></div>
      <span className="shrink-0 rounded-full border border-white/[.07] px-3 py-1.5 text-[8px] uppercase tracking-[.14em] text-text-dim">Governed runtime</span>
    </section>
  </div>;
}

function Module({href,icon,code,title,text}:{href:string;icon:React.ReactNode;code:string;title:string;text:string}){
  return <a href={href} className="group relative overflow-hidden rounded-2xl border border-white/[.075] p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/20 sm:p-6" style={{background:'linear-gradient(145deg,rgba(255,255,255,.032),rgba(255,255,255,.010))',boxShadow:'inset 0 1px 0 rgba(255,255,255,.02)'}}>
    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[.08] to-transparent" />
    <div className="mb-6 flex items-start justify-between gap-4"><div className="flex h-10 w-10 items-center justify-center rounded-xl border border-accent/15 bg-accent/[.035] text-accent transition-transform duration-300 group-hover:scale-105">{icon}</div><span className="font-mono text-[8px] tracking-[.12em] text-text-dim">{code}</span></div>
    <h3 className="text-lg font-outfit font-semibold tracking-tight text-white">{title}</h3>
    <p className="mt-3 min-h-[54px] text-xs leading-relaxed text-text-muted">{text}</p>
    <div className="mt-5 flex items-center justify-between border-t border-white/[.05] pt-4"><span className="text-[8px] uppercase tracking-[.14em] text-accent">Abrir módulo</span><ArrowUpRight size={14} className="text-text-dim transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent"/></div>
  </a>;
}
