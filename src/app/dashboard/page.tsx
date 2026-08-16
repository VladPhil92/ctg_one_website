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
import {
  Activity, ArrowUpRight, Beer, BrainCircuit, CircleDollarSign, Clock3, Gift,
  Landmark, LockKeyhole, ShieldCheck, UserRound, WalletCards,
} from 'lucide-react';

const KYC_LABELS: Record<string, { label: string; tone: string }> = {
  not_submitted: { label: 'Pendiente', tone: 'var(--text-dim)' }, pending: { label: 'En revisión', tone: 'var(--accent)' },
  verified: { label: 'Verificado', tone: 'var(--success)' }, rejected: { label: 'Requiere atención', tone: 'var(--error)' },
};
const STATUS_LABELS: Record<string, string> = { pending: 'Pendiente', approved: 'Aprobada', rejected: 'Rechazada' };

export default function DashboardPage() {
  const { profile, email, isAuthenticated, isLoading, signOut } = useAuth();
  const { wallet, isLoading: isWalletLoading } = useWallet();
  const { summary, isLoading: investmentLoading } = useInvestmentSummary();
  const { transactions, isLoading: transactionsLoading } = useAccountTransactions(5);
  const router = useRouter();
  useEffect(() => { if (!isLoading && !isAuthenticated) router.push('/iniciar-sesion?next=/dashboard'); }, [isAuthenticated, isLoading, router]);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}><div className="text-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--accent)' }} /><p className="text-sm text-text-muted">Preparando tu espacio CTG One...</p></div></div>;
  if (!isAuthenticated) return null;

  const kyc = KYC_LABELS[profile?.kyc_status ?? 'not_submitted'];
  const firstName = profile?.full_name?.trim().split(/\s+/)[0] ?? 'Usuario';

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}><Navbar /><main className="pt-24 pb-20"><Container>
      <section className="mb-8 sm:mb-12"><div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5"><div><p className="text-[10px] sm:text-xs uppercase tracking-[0.28em] text-accent mb-3">CTG One · User OS</p><h1 className="text-3xl sm:text-5xl font-outfit font-semibold text-white leading-tight">Hola, {firstName}.</h1><p className="text-sm text-text-muted mt-3 max-w-2xl leading-relaxed">Tu identidad conecta los productos, inversiones y capacidades digitales disponibles dentro del ecosistema CTG One.</p></div><Button onClick={signOut} variant="secondary" size="sm">Cerrar sesión</Button></div></section>

      <section className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-10">
        <MetricCard icon={<WalletCards size={17} />} label="Saldo de cuenta" value={isWalletLoading ? '—' : formatCents(wallet?.balance_cents ?? 0, wallet?.currency ?? 'COP')} />
        <MetricCard icon={<CircleDollarSign size={17} />} label="Capital activo" value={investmentLoading ? '—' : formatCents(summary.activeCapitalCents)} />
        <MetricCard icon={<Beer size={17} />} label="Asignaciones" value={investmentLoading ? '—' : String(summary.allocations.length)} />
        <MetricCard icon={<ShieldCheck size={17} />} label="Identidad" value={kyc.label} valueColor={kyc.tone} />
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6 mb-10">
        <div className="rounded-2xl border border-border overflow-hidden" style={{ backgroundColor: 'var(--bg-card)' }}>
          <div className="p-5 sm:p-6 border-b border-border flex items-center justify-between gap-4"><div><p className="text-[10px] uppercase tracking-[0.2em] text-text-dim mb-1">Actividad</p><h2 className="text-xl font-outfit font-semibold text-white">Movimientos recientes</h2></div><Activity size={20} className="text-accent" /></div>
          <div className="p-5 sm:p-6">{transactionsLoading ? <p className="text-sm text-text-dim">Cargando actividad...</p> : transactions.length > 0 ? <div className="space-y-4">{transactions.map((tx) => <div key={tx.id} className="flex items-center justify-between gap-4 pb-4 border-b border-border last:border-0 last:pb-0"><div className="min-w-0"><p className="text-sm text-white font-medium capitalize">{tx.type === 'deposit' ? 'Recarga de cuenta' : tx.type}</p><p className="text-[11px] text-text-dim mt-1">{new Date(tx.created_at).toLocaleDateString('es-CO')} · {STATUS_LABELS[tx.status] ?? tx.status}</p></div><p className="text-sm font-medium text-white shrink-0">{formatCents(tx.amount_cents)}</p></div>)}</div> : <div className="py-3"><p className="text-sm text-text-muted">Todavía no tienes movimientos registrados.</p><p className="text-[11px] text-text-dim mt-2">Las recargas y operaciones aprobadas aparecerán aquí automáticamente.</p></div>}</div>
        </div>

        <div className="rounded-2xl border border-border p-5 sm:p-6" style={{ backgroundColor: 'var(--bg-card)' }}>
          <div className="flex items-center gap-3 mb-6"><div className="w-9 h-9 rounded-full flex items-center justify-center border border-border text-accent" style={{ background: 'rgba(201,169,98,.06)' }}><UserRound size={17} /></div><div><p className="text-[10px] uppercase tracking-[0.2em] text-text-dim">Identidad CTG One</p><p className="text-sm text-white mt-1">{profile?.email ?? email}</p></div></div>
          <div className="space-y-4 text-sm"><InfoRow label="KYC" value={kyc.label} valueColor={kyc.tone} /><InfoRow label="Rol" value={profile?.role === 'admin' ? 'Administrador' : 'Usuario'} /><InfoRow label="Miembro desde" value={profile?.created_at ? new Date(profile.created_at).toLocaleDateString('es-CO') : '—'} /></div>
          <div className="mt-6 flex flex-wrap gap-2">{profile?.kyc_status !== 'verified' && <Button href="/dashboard/kyc" variant="primary" size="sm">{profile?.kyc_status === 'rejected' ? 'Revisar KYC' : 'Completar KYC'}</Button>}<Button href="/dashboard/depositos" variant="secondary" size="sm">Recargar</Button></div>
        </div>
      </section>

      <section className="mb-10"><div className="flex items-end justify-between gap-4 mb-5"><div><p className="text-[10px] uppercase tracking-[0.22em] text-text-dim mb-2">Tus módulos</p><h2 className="text-2xl font-outfit font-semibold text-white">Acceso al ecosistema</h2></div></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <ModuleCard icon={<Beer size={21} />} eyebrow="LIVE" title="CTG Craft Beer Inversión" description="Elige lotes y cajas, registra tu pago, consulta capital activo y sigue la producción, venta y liquidación de tus participaciones." href="/dashboard/inversion" cta="Gestionar inversiones" />
          <ModuleCard icon={<BrainCircuit size={21} />} eyebrow="PILOT" title="CTG Knowledge" description="Consulta conocimiento autorizado de CTG One mediante respuestas fundamentadas y fuentes rastreables." href="/knowledge" cta="Abrir Knowledge" />
          <ModuleCard icon={<Landmark size={21} />} eyebrow="LIVE" title="Cuenta & Recargas" description="Gestiona tu saldo operativo y revisa el estado de las recargas enviadas a revisión." href="/dashboard/depositos" cta="Gestionar saldo" />
          <ModuleCard icon={<ShieldCheck size={21} />} eyebrow={profile?.kyc_status === 'verified' ? 'LIVE' : 'ACTION REQUIRED'} title="Identidad & KYC" description="Tu verificación de identidad habilita progresivamente funcionalidades reguladas y financieras del ecosistema." href="/dashboard/kyc" cta={profile?.kyc_status === 'verified' ? 'Ver estado' : 'Completar verificación'} />
          <ModuleCard icon={<Gift size={21} />} eyebrow="ROADMAP" title="CTG Rewards" description="Beneficios, puntos y reconocimiento transversal entre unidades del ecosistema." href="/rewards" cta="Ver roadmap" muted />
          <ModuleCard icon={<LockKeyhole size={21} />} eyebrow="ROADMAP" title="Web3 Wallet" description="La integración Web3 permanecerá separada de tu saldo CTG One hasta que exista utilidad on-chain verificable." href="/token" cta="Ver estrategia Web3" muted />
        </div>
      </section>

      <section className="rounded-2xl border border-border p-5 sm:p-7" style={{ background: 'linear-gradient(135deg, rgba(201,169,98,.09), rgba(255,255,255,.015))' }}><div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5"><div className="flex gap-4"><Clock3 size={22} className="text-accent shrink-0 mt-1" /><div><p className="text-sm text-white font-medium">Una identidad, múltiples productos.</p><p className="text-xs text-text-muted mt-2 max-w-2xl leading-relaxed">CTG One User OS integra permisos, actividad, inversiones y conocimiento sin mezclar los diferentes contextos financieros.</p></div></div><Button href="/services" variant="secondary" size="sm">Explorar CTG One OS</Button></div></section>
    </Container></main></div>
  );
}

function MetricCard({ icon, label, value, valueColor }: { icon: React.ReactNode; label: string; value: string; valueColor?: string }) { return <div className="rounded-xl border border-border p-4 sm:p-5" style={{ backgroundColor: 'var(--bg-card)' }}><div className="flex items-center gap-2 text-text-dim mb-3">{icon}<span className="text-[10px] uppercase tracking-[0.15em]">{label}</span></div><p className="text-lg sm:text-xl font-outfit font-semibold" style={{ color: valueColor ?? 'white' }}>{value}</p></div>; }
function InfoRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) { return <div className="flex items-start justify-between gap-4 pb-3 border-b border-border last:border-0"><span className="text-text-dim">{label}</span><span className="text-right" style={{ color: valueColor ?? 'var(--text-primary)' }}>{value}</span></div>; }
function ModuleCard({ icon, eyebrow, title, description, href, cta, muted = false }: { icon: React.ReactNode; eyebrow: string; title: string; description: string; href: string; cta: string; muted?: boolean; }) { return <a href={href} className="group rounded-2xl border border-border p-5 sm:p-6 transition-transform duration-200 hover:-translate-y-1" style={{ backgroundColor: muted ? 'rgba(255,255,255,.018)' : 'var(--bg-card)' }}><div className="flex items-center justify-between gap-4 mb-5"><div className="w-10 h-10 rounded-full flex items-center justify-center border border-border text-accent" style={{ background: 'rgba(201,169,98,.06)' }}>{icon}</div><span className="text-[9px] tracking-[0.18em] uppercase text-text-dim border border-border rounded-full px-2 py-1">{eyebrow}</span></div><h3 className="text-lg font-outfit font-semibold text-white">{title}</h3><p className="text-xs text-text-muted mt-3 leading-relaxed min-h-[48px]">{description}</p><div className="mt-5 flex items-center gap-2 text-[11px] uppercase tracking-[0.15em] text-accent">{cta}<ArrowUpRight size={13} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></div></a>; }
