'use client';

import './dashboard.css';
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
  Landmark, LockKeyhole, ShieldCheck, UserRound, WalletCards, Cpu, Network,
  Fingerprint, Boxes, Sparkles,
} from 'lucide-react';

const KYC_LABELS: Record<string, { label: string; tone: string }> = {
  not_submitted: { label: 'Pendiente', tone: 'var(--text-dim)' },
  pending: { label: 'En revisión', tone: 'var(--accent)' },
  verified: { label: 'Verificado', tone: 'var(--success)' },
  rejected: { label: 'Requiere atención', tone: 'var(--error)' },
};
const STATUS_LABELS: Record<string, string> = { pending: 'Pendiente', approved: 'Aprobada', rejected: 'Rechazada' };

export default function DashboardPage() {
  const { profile, email, isAuthenticated, isLoading, signOut } = useAuth();
  const { wallet, isLoading: isWalletLoading } = useWallet();
  const { summary, isLoading: investmentLoading } = useInvestmentSummary();
  const { transactions, isLoading: transactionsLoading } = useAccountTransactions(5);
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/iniciar-sesion?next=/dashboard');
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border border-accent/30 flex items-center justify-center mx-auto mb-4 relative">
            <Cpu size={18} className="text-accent" />
            <span className="absolute inset-[-7px] rounded-full border border-accent/10 animate-ping" />
          </div>
          <p className="text-[10px] uppercase tracking-[.24em] text-text-dim">Inicializando User OS</p>
        </div>
      </div>
    );
  }
  if (!isAuthenticated) return null;

  const kyc = KYC_LABELS[profile?.kyc_status ?? 'not_submitted'];
  const firstName = profile?.full_name?.trim().split(/\s+/)[0] ?? 'Usuario';

  return (
    <div className="user-os-shell min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <Navbar />
      <div className="os-orbit w-[360px] h-[360px] sm:w-[520px] sm:h-[520px] -right-44 sm:-right-48 top-28 opacity-80" />
      <div className="os-orbit w-[220px] h-[220px] sm:w-[320px] sm:h-[320px] -left-28 top-[620px] opacity-30" />

      <main className="pt-24 pb-20 relative z-10">
        <Container>
          <section className="relative mb-8 sm:mb-12 overflow-hidden rounded-[28px] border border-border px-5 py-7 sm:px-8 sm:py-9 os-panel os-panel-live">
            <div className="os-scanline absolute top-0 inset-x-0" />
            <div className="absolute right-5 top-5 hidden sm:flex items-center gap-2 text-[9px] uppercase tracking-[.2em] text-text-dim">
              <span className="os-status-dot" /> System online
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 items-end">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Fingerprint size={14} className="text-accent" />
                  <p className="text-[10px] sm:text-xs uppercase tracking-[0.28em] text-accent">CTG One · Personal Operating Layer</p>
                </div>
                <h1 className="text-3xl sm:text-5xl lg:text-6xl font-outfit font-semibold text-white leading-[.95] max-w-3xl">
                  Hola, {firstName}.<br />
                  <span className="text-accent">Tu ecosistema está conectado.</span>
                </h1>
                <p className="text-sm text-text-muted mt-5 max-w-2xl leading-relaxed">
                  Una sola identidad para operar inversiones, capital, conocimiento y servicios dentro de CTG One OS.
                </p>
              </div>
              <div className="flex flex-wrap lg:flex-col gap-2 lg:items-stretch min-w-[180px]">
                <Button href="/dashboard/inversion" variant="primary" size="sm">Abrir inversiones</Button>
                <Button onClick={signOut} variant="secondary" size="sm">Cerrar sesión</Button>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-10">
            <MetricCard icon={<WalletCards size={17} />} code="FIN-01" label="Saldo operativo" value={isWalletLoading ? '—' : formatCents(wallet?.balance_cents ?? 0, wallet?.currency ?? 'COP')} />
            <MetricCard icon={<CircleDollarSign size={17} />} code="INV-02" label="Capital activo" value={investmentLoading ? '—' : formatCents(summary.activeCapitalCents)} />
            <MetricCard icon={<Boxes size={17} />} code="INV-03" label="Asignaciones" value={investmentLoading ? '—' : String(summary.allocations.length)} />
            <MetricCard icon={<ShieldCheck size={17} />} code="ID-01" label="Identidad" value={kyc.label} valueColor={kyc.tone} />
          </section>

          <section className="grid grid-cols-1 xl:grid-cols-[1.25fr_0.75fr] gap-5 mb-10">
            <div className="os-panel rounded-2xl overflow-hidden">
              <div className="p-5 sm:p-6 border-b border-border flex items-center justify-between gap-4">
                <div>
                  <p className="text-[9px] uppercase tracking-[0.24em] text-accent mb-2">Activity Stream · Live Data</p>
                  <h2 className="text-xl font-outfit font-semibold text-white">Movimientos recientes</h2>
                </div>
                <div className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-accent"><Activity size={18} /></div>
              </div>
              <div className="p-5 sm:p-6">
                {transactionsLoading ? (
                  <p className="text-sm text-text-dim">Sincronizando actividad...</p>
                ) : transactions.length > 0 ? (
                  <div className="space-y-1">
                    {transactions.map((tx, index) => (
                      <div key={tx.id} className="grid grid-cols-[34px_1fr_auto] gap-3 items-center py-4 border-b border-border last:border-0">
                        <div className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-[9px] text-accent font-mono">{String(index + 1).padStart(2, '0')}</div>
                        <div className="min-w-0">
                          <p className="text-sm text-white font-medium capitalize">{tx.type === 'deposit' ? 'Recarga de cuenta' : tx.type}</p>
                          <p className="text-[10px] text-text-dim mt-1 font-mono">{new Date(tx.created_at).toLocaleDateString('es-CO')} · {STATUS_LABELS[tx.status] ?? tx.status}</p>
                        </div>
                        <p className="text-sm font-medium text-white shrink-0 font-mono">{formatCents(tx.amount_cents)}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-7 text-center">
                    <Network size={26} className="text-text-dim mx-auto mb-3" />
                    <p className="text-sm text-text-muted">Aún no hay actividad registrada.</p>
                    <p className="text-[10px] text-text-dim mt-2">Las operaciones aprobadas aparecerán aquí automáticamente.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="os-panel rounded-2xl p-5 sm:p-6 relative overflow-hidden">
              <div className="absolute -right-14 -top-14 w-40 h-40 rounded-full border border-accent/10" />
              <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full border border-accent/10" />
              <div className="flex items-center gap-3 mb-7 relative z-10">
                <div className="w-10 h-10 rounded-full flex items-center justify-center border border-border text-accent bg-white/[.02]"><UserRound size={18} /></div>
                <div className="min-w-0">
                  <p className="text-[9px] uppercase tracking-[0.22em] text-accent">Identity Node</p>
                  <p className="text-sm text-white mt-1 truncate">{profile?.email ?? email}</p>
                </div>
              </div>
              <div className="space-y-4 text-sm relative z-10">
                <InfoRow label="KYC" value={kyc.label} valueColor={kyc.tone} />
                <InfoRow label="Rol" value={profile?.role === 'admin' ? 'Administrador' : 'Usuario'} />
                <InfoRow label="Miembro desde" value={profile?.created_at ? new Date(profile.created_at).toLocaleDateString('es-CO') : '—'} />
                <InfoRow label="Estado del nodo" value="Activo" valueColor="var(--success)" />
              </div>
              <div className="mt-6 flex flex-wrap gap-2 relative z-10">
                {profile?.kyc_status !== 'verified' && <Button href="/dashboard/kyc" variant="primary" size="sm">Completar KYC</Button>}
                <Button href="/dashboard/depositos" variant="secondary" size="sm">Recargar</Button>
              </div>
            </div>
          </section>

          <section className="mb-10">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-5">
              <div>
                <p className="text-[9px] uppercase tracking-[0.24em] text-accent mb-2">Service Mesh</p>
                <h2 className="text-2xl sm:text-3xl font-outfit font-semibold text-white">Tu acceso al ecosistema</h2>
              </div>
              <div className="hidden sm:flex items-center gap-2 text-[9px] uppercase tracking-[.18em] text-text-dim"><Sparkles size={13} /> Modular access layer</div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              <ModuleCard icon={<Beer size={21} />} code="MOD-INV" eyebrow="LIVE" title="CTG Craft Beer Inversión" description="Selecciona lotes y cajas, registra pagos y sigue producción, ventas y liquidación mediante tracking real." href="/dashboard/inversion" cta="Gestionar inversiones" />
              <ModuleCard icon={<BrainCircuit size={21} />} code="MOD-AI" eyebrow="PILOT" title="CTG Knowledge" description="Consulta conocimiento autorizado mediante respuestas fundamentadas y fuentes rastreables." href="/knowledge" cta="Abrir Knowledge" />
              <ModuleCard icon={<Landmark size={21} />} code="MOD-FIN" eyebrow="LIVE" title="Cuenta & Recargas" description="Gestiona tu saldo operativo y revisa las recargas enviadas a validación." href="/dashboard/depositos" cta="Gestionar saldo" />
              <ModuleCard icon={<ShieldCheck size={21} />} code="MOD-ID" eyebrow={profile?.kyc_status === 'verified' ? 'LIVE' : 'ACTION'} title="Identidad & KYC" description="La verificación de identidad habilita funcionalidades financieras y reguladas del ecosistema." href="/dashboard/kyc" cta={profile?.kyc_status === 'verified' ? 'Ver identidad' : 'Completar verificación'} />
              <ModuleCard icon={<Gift size={21} />} code="MOD-RWD" eyebrow="ROADMAP" title="CTG Rewards" description="Beneficios, puntos y reconocimiento transversal entre unidades del ecosistema." href="/rewards" cta="Ver roadmap" muted />
              <ModuleCard icon={<LockKeyhole size={21} />} code="MOD-W3" eyebrow="ROADMAP" title="Web3 Wallet" description="Capacidad on-chain separada del saldo CTG One hasta que exista utilidad verificable." href="/token" cta="Ver estrategia Web3" muted />
            </div>
          </section>

          <section className="os-panel os-panel-live rounded-2xl p-5 sm:p-7">
            <div className="grid grid-cols-1 md:grid-cols-[auto_1fr_auto] gap-5 items-center">
              <div className="w-12 h-12 rounded-full border border-accent/20 flex items-center justify-center text-accent relative">
                <Cpu size={20} /><span className="absolute inset-[-5px] rounded-full border border-accent/10" />
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-[.22em] text-accent mb-2">Architecture Principle</p>
                <p className="text-sm text-white font-medium">Una identidad. Múltiples productos. Contextos financieros separados.</p>
                <p className="text-xs text-text-muted mt-2 max-w-3xl leading-relaxed">CTG One User OS integra permisos, actividad, inversión y conocimiento sin confundir saldo operativo, capital de inversión y futuras capacidades Web3.</p>
              </div>
              <Button href="/services" variant="secondary" size="sm">Explorar CTG One OS</Button>
            </div>
          </section>
        </Container>
      </main>
    </div>
  );
}

function MetricCard({ icon, code, label, value, valueColor }: { icon: React.ReactNode; code: string; label: string; value: string; valueColor?: string }) {
  return (
    <div className="os-panel os-metric rounded-xl p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2 text-text-dim mb-5">
        <div className="flex items-center gap-2">{icon}<span className="text-[9px] uppercase tracking-[0.16em]">{label}</span></div>
        <span className="text-[8px] font-mono text-text-dim">{code}</span>
      </div>
      <p className="text-lg sm:text-xl font-outfit font-semibold" style={{ color: valueColor ?? 'white' }}>{value}</p>
    </div>
  );
}

function InfoRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return <div className="flex items-start justify-between gap-4 pb-3 border-b border-border last:border-0"><span className="text-text-dim text-xs">{label}</span><span className="text-right text-xs font-mono" style={{ color: valueColor ?? 'var(--text-primary)' }}>{value}</span></div>;
}

function ModuleCard({ icon, code, eyebrow, title, description, href, cta, muted = false }: { icon: React.ReactNode; code: string; eyebrow: string; title: string; description: string; href: string; cta: string; muted?: boolean; }) {
  return (
    <a href={href} className="os-panel os-module group rounded-2xl p-5 sm:p-6" style={{ opacity: muted ? .72 : 1 }}>
      <div className="relative z-10">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="w-10 h-10 rounded-full flex items-center justify-center border border-border text-accent bg-white/[.02]">{icon}</div>
          <div className="text-right"><p className="text-[8px] font-mono text-text-dim mb-1">{code}</p><span className="text-[8px] tracking-[0.18em] uppercase text-accent border border-border rounded-full px-2 py-1">{eyebrow}</span></div>
        </div>
        <h3 className="text-lg font-outfit font-semibold text-white">{title}</h3>
        <p className="text-xs text-text-muted mt-3 leading-relaxed min-h-[48px]">{description}</p>
        <div className="mt-6 flex items-center gap-2 text-[10px] uppercase tracking-[0.15em] text-accent">{cta}<ArrowUpRight size={13} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></div>
      </div>
    </a>
  );
}
