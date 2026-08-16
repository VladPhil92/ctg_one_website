'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useWallet } from '@/hooks/useWallet';
import { useInvestmentSummary } from '@/hooks/useInvestmentSummary';
import { useAccountTransactions } from '@/hooks/useAccountTransactions';
import { Container } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { formatCents } from '@/lib/format';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { Activity, ArrowUpRight, Beer, BrainCircuit, CircleDollarSign, Gift, Landmark, LockKeyhole, Radar, ShieldCheck, Sparkles, UserRound, WalletCards, Zap } from 'lucide-react';

const KYC_LABELS: Record<string, { label: string; tone: string }> = {
  not_submitted: { label: 'Pendiente', tone: 'var(--text-dim)' }, pending: { label: 'En revisión', tone: 'var(--accent)' }, verified: { label: 'Verificado', tone: 'var(--success)' }, rejected: { label: 'Requiere atención', tone: 'var(--error)' },
};
const STATUS_LABELS: Record<string, string> = { pending: 'Pendiente', approved: 'Aprobada', rejected: 'Rechazada' };

export default function DashboardPage() {
  const { profile, email, isAuthenticated, isLoading, signOut } = useAuth();
  const { wallet, isLoading: isWalletLoading } = useWallet();
  const { summary, isLoading: investmentLoading } = useInvestmentSummary();
  const { transactions, isLoading: transactionsLoading } = useAccountTransactions(5);
  const router = useRouter();
  useEffect(() => { if (!isLoading && !isAuthenticated) router.push('/iniciar-sesion?next=/dashboard'); }, [isAuthenticated, isLoading, router]);
  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-[#050505]"><div className="relative"><div className="w-20 h-20 rounded-full border border-accent/20 animate-ping absolute inset-0"/><div className="w-20 h-20 rounded-full border border-accent/60 flex items-center justify-center"><Radar className="text-accent animate-pulse"/></div></div></div>;
  if (!isAuthenticated) return null;
  const kyc = KYC_LABELS[profile?.kyc_status ?? 'not_submitted'];
  const firstName = profile?.full_name?.trim().split(/\s+/)[0] ?? 'Usuario';

  return <div className="min-h-screen bg-[#050505] text-white overflow-hidden"><Navbar />
    <div className="fixed inset-0 pointer-events-none" style={{backgroundImage:'linear-gradient(rgba(201,169,98,.025) 1px, transparent 1px),linear-gradient(90deg,rgba(201,169,98,.025) 1px,transparent 1px)',backgroundSize:'52px 52px'}} />
    <div className="fixed top-[-20rem] right-[-10rem] w-[45rem] h-[45rem] rounded-full pointer-events-none" style={{background:'radial-gradient(circle,rgba(201,169,98,.08),transparent 68%)'}} />
    <main className="relative pt-24 pb-20"><Container>
      <section className="relative rounded-[28px] border border-white/10 overflow-hidden mb-6 p-6 sm:p-9" style={{background:'linear-gradient(135deg,rgba(20,20,20,.96),rgba(9,9,9,.92))',boxShadow:'0 30px 80px rgba(0,0,0,.35)'}}>
        <div className="absolute right-[-5rem] top-[-7rem] w-72 h-72 rounded-full border border-accent/10"/><div className="absolute right-[-2rem] top-[-4rem] w-52 h-52 rounded-full border border-accent/20"/>
        <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-7">
          <div><div className="flex items-center gap-2 mb-5"><span className="w-2 h-2 rounded-full bg-accent shadow-[0_0_12px_rgba(201,169,98,.8)]"/><p className="text-[10px] uppercase tracking-[.32em] text-accent">CTG One · Personal Command Center</p></div><h1 className="text-4xl sm:text-6xl font-outfit font-semibold tracking-[-.04em]">Hola, {firstName}<span className="text-accent">.</span></h1><p className="text-sm sm:text-base text-text-muted mt-4 max-w-2xl leading-relaxed">Controla tu identidad, capital, inversiones y acceso al ecosistema desde una única interfaz operacional.</p></div>
          <div className="flex items-center gap-3"><div className="hidden sm:flex items-center gap-2 rounded-full border border-white/10 bg-white/[.025] px-4 py-2 text-[10px] uppercase tracking-[.15em] text-text-muted"><Zap size={13} className="text-accent"/>System online</div><Button onClick={signOut} variant="secondary" size="sm">Cerrar sesión</Button></div>
        </div>
      </section>

      <section className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
        <Metric icon={<WalletCards size={16}/>} label="Saldo disponible" value={isWalletLoading?'—':formatCents(wallet?.balance_cents??0,wallet?.currency??'COP')} index="01" />
        <Metric icon={<CircleDollarSign size={16}/>} label="Capital activo" value={investmentLoading?'—':formatCents(summary.activeCapitalCents)} index="02" />
        <Metric icon={<Beer size={16}/>} label="Participaciones" value={investmentLoading?'—':String(summary.allocations.length)} index="03" />
        <Metric icon={<ShieldCheck size={16}/>} label="Identidad digital" value={kyc.label} index="04" tone={kyc.tone}/>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-[1.35fr_.65fr] gap-4 mb-8">
        <div className="glassPanel rounded-[24px] overflow-hidden"><div className="p-5 sm:p-6 border-b border-white/[.07] flex justify-between items-center"><div><p className="micro">LIVE ACTIVITY</p><h2 className="text-xl font-outfit font-semibold mt-1">Flujo de actividad</h2></div><div className="radar"><Activity size={17}/></div></div><div className="p-5 sm:p-6">
          {transactionsLoading?<p className="text-sm text-text-dim">Sincronizando...</p>:transactions.length?<div>{transactions.map((tx,i)=><div key={tx.id} className="group grid grid-cols-[28px_1fr_auto] gap-3 items-center py-4 border-b border-white/[.06] last:border-0"><div className="text-[9px] text-text-dim font-mono">0{i+1}</div><div><p className="text-sm font-medium">{tx.type==='deposit'?'Recarga de cuenta':tx.type}</p><p className="text-[10px] text-text-dim mt-1 uppercase tracking-[.12em]">{new Date(tx.created_at).toLocaleDateString('es-CO')} · {STATUS_LABELS[tx.status]??tx.status}</p></div><p className="font-mono text-sm text-accent">{formatCents(tx.amount_cents)}</p></div>)}</div>:<div className="py-8 text-center"><Activity className="mx-auto text-text-dim mb-3" size={24}/><p className="text-sm text-text-muted">Aún no hay movimientos en tu timeline.</p></div>}
        </div></div>
        <div className="glassPanel rounded-[24px] p-6 relative overflow-hidden"><div className="absolute -right-10 -top-10 w-32 h-32 rounded-full border border-accent/10"/><div className="relative"><div className="flex items-center gap-3 mb-7"><div className="radar"><UserRound size={17}/></div><div><p className="micro">DIGITAL IDENTITY</p><p className="text-sm mt-1 truncate max-w-[220px]">{profile?.email??email}</p></div></div><div className="space-y-1"><Identity label="KYC protocol" value={kyc.label} tone={kyc.tone}/><Identity label="Access level" value={profile?.role==='admin'?'Administrator':'Member'}/><Identity label="Network since" value={profile?.created_at?new Date(profile.created_at).toLocaleDateString('es-CO'):'—'}/></div><div className="mt-7 flex gap-2 flex-wrap">{profile?.kyc_status!=='verified'&&<Button href="/dashboard/kyc" variant="primary" size="sm">Verificar identidad</Button>}<Button href="/dashboard/depositos" variant="secondary" size="sm">Añadir fondos</Button></div></div></div>
      </section>

      <section><div className="flex items-end justify-between mb-5"><div><p className="micro">ECOSYSTEM GRID</p><h2 className="text-2xl sm:text-3xl font-outfit font-semibold mt-2 tracking-[-.025em]">Módulos conectados</h2></div><Sparkles size={19} className="text-accent hidden sm:block"/></div><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <Module icon={<Beer/>} code="INV-01" status="LIVE" title="Craft Beer Investment" description="Selecciona lotes y cajas, registra pagos y sigue producción, comercialización y liquidación en tiempo real." href="/dashboard/inversion" cta="Abrir terminal de inversión" featured />
        <Module icon={<BrainCircuit/>} code="KNW-02" status="PILOT" title="CTG Knowledge" description="Inteligencia institucional fundamentada en conocimiento autorizado y fuentes trazables." href="/knowledge" cta="Consultar Knowledge" />
        <Module icon={<Landmark/>} code="FIN-03" status="LIVE" title="Cuenta & Capital" description="Gestiona fondos, recargas y movimientos operativos de tu cuenta CTG One." href="/dashboard/depositos" cta="Gestionar capital" />
        <Module icon={<ShieldCheck/>} code="ID-04" status={profile?.kyc_status==='verified'?'VERIFIED':'ACTION'} title="Identity Layer" description="Identidad verificable y permisos para las capacidades financieras del ecosistema." href="/dashboard/kyc" cta="Abrir identidad" />
        <Module icon={<Gift/>} code="RWD-05" status="ROADMAP" title="CTG Rewards" description="Capa transversal de beneficios, reconocimiento y fidelización del ecosistema." href="/rewards" cta="Explorar roadmap" muted />
        <Module icon={<LockKeyhole/>} code="W3-06" status="ROADMAP" title="Web3 Layer" description="Infraestructura on-chain futura, aislada del saldo fiduciario hasta disponer de utilidad verificable." href="/token" cta="Ver arquitectura" muted />
      </div></section>
    </Container></main>
    <style jsx global>{`.glassPanel{background:linear-gradient(145deg,rgba(255,255,255,.045),rgba(255,255,255,.018));border:1px solid rgba(255,255,255,.085);box-shadow:inset 0 1px 0 rgba(255,255,255,.035),0 20px 55px rgba(0,0,0,.22);backdrop-filter:blur(18px)}.micro{font-size:9px;letter-spacing:.22em;color:var(--text-dim);font-weight:600}.radar{width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:var(--accent);border:1px solid rgba(201,169,98,.25);background:radial-gradient(circle,rgba(201,169,98,.11),rgba(201,169,98,.025));box-shadow:inset 0 0 20px rgba(201,169,98,.04)}@media(max-width:640px){.glassPanel{backdrop-filter:blur(10px)}}`}</style>
  </div>;
}

function Metric({icon,label,value,index,tone}:{icon:React.ReactNode;label:string;value:string;index:string;tone?:string}){return <div className="glassPanel rounded-2xl p-4 sm:p-5 relative overflow-hidden group"><span className="absolute top-3 right-3 text-[8px] font-mono text-white/15">{index}</span><div className="flex items-center gap-2 text-accent mb-5">{icon}<span className="micro">{label}</span></div><p className="text-lg sm:text-xl font-outfit font-semibold truncate" style={{color:tone??'white'}}>{value}</p><div className="absolute bottom-0 left-0 h-px w-0 group-hover:w-full bg-accent/50 transition-all duration-500"/></div>}
function Identity({label,value,tone}:{label:string;value:string;tone?:string}){return <div className="flex justify-between gap-4 py-3 border-b border-white/[.06]"><span className="text-[11px] text-text-dim">{label}</span><span className="text-xs font-medium" style={{color:tone??'white'}}>{value}</span></div>}
function Module({icon,code,status,title,description,href,cta,featured=false,muted=false}:{icon:React.ReactNode;code:string;status:string;title:string;description:string;href:string;cta:string;featured?:boolean;muted?:boolean}){return <a href={href} className={`group relative rounded-[22px] p-6 overflow-hidden transition-all duration-300 hover:-translate-y-1 ${featured?'xl:col-span-1':''}`} style={{background:featured?'linear-gradient(145deg,rgba(201,169,98,.12),rgba(255,255,255,.025))':muted?'rgba(255,255,255,.012)':'linear-gradient(145deg,rgba(255,255,255,.04),rgba(255,255,255,.016))',border:`1px solid ${featured?'rgba(201,169,98,.28)':'rgba(255,255,255,.08)'}`}}><div className="absolute right-[-30px] top-[-30px] w-28 h-28 rounded-full border border-white/[.04] group-hover:scale-125 transition-transform duration-700"/><div className="flex justify-between items-start mb-7"><div className="radar">{icon}</div><div className="text-right"><p className="text-[8px] font-mono text-white/25 mb-1">{code}</p><span className="text-[8px] tracking-[.16em] text-accent">● {status}</span></div></div><h3 className="text-xl font-outfit font-semibold tracking-[-.02em]">{title}</h3><p className="text-xs text-text-muted leading-relaxed mt-3 min-h-[54px]">{description}</p><div className="mt-6 flex items-center gap-2 text-[10px] uppercase tracking-[.15em] text-accent">{cta}<ArrowUpRight size={13} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform"/></div></a>}
