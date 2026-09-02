'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Beer,
  CircleDollarSign,
  Radar,
  ShieldCheck,
  UserRound,
  WalletCards,
  Zap,
} from 'lucide-react';

import { Navbar } from '@/components/Navbar';
import { Container } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { useAccountTransactions } from '@/hooks/useAccountTransactions';
import { useInvestmentSummary } from '@/hooks/useInvestmentSummary';
import { useWallet } from '@/hooks/useWallet';
import { formatCents } from '@/lib/format';

const KYC_LABELS: Record<string, { label: string; tone: string }> = {
  not_submitted: { label: 'Pendiente', tone: 'var(--text-dim)' },
  pending: { label: 'En revisión', tone: 'var(--accent)' },
  verified: { label: 'Verificado', tone: 'var(--success)' },
  rejected: { label: 'Requiere atención', tone: 'var(--error)' },
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  approved: 'Aprobada',
  rejected: 'Rechazada',
};

export default function DashboardPage() {
  const { profile, email, isAuthenticated, isLoading, signOut } = useAuth();
  const { wallet, isLoading: isWalletLoading } = useWallet();
  const { summary, isLoading: investmentLoading } = useInvestmentSummary();
  const { transactions, isLoading: transactionsLoading } = useAccountTransactions(5);
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/iniciar-sesion?next=/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#030303]" aria-live="polite">
        <div className="w-16 h-16 rounded-full border border-accent/50 flex items-center justify-center">
          <Radar className="text-accent animate-pulse" aria-hidden="true" />
          <span className="sr-only">Cargando dashboard</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const kyc = KYC_LABELS[profile?.kyc_status ?? 'not_submitted'];
  const firstName = profile?.full_name?.trim().split(/\s+/)[0] || 'Usuario';
  const admin = profile?.role === 'admin';

  return (
    <div className="userOS min-h-screen text-white overflow-hidden">
      <Navbar />
      <div className="osGrid fixed inset-0 pointer-events-none" />
      <div className="osGlow fixed pointer-events-none" />

      <main className="relative pt-24 pb-12">
        <Container>
          <section className="commandHero mb-5">
            <div className="heroSignal"><span /><span /><span /></div>
            <div className="relative z-10 grid lg:grid-cols-[1fr_auto] gap-7 items-end">
              <div>
                <p className="eyebrow"><span className="liveDot" /> CTG ONE / PERSONAL OS</p>
                <h1>Hola, {firstName}<em>.</em></h1>
                <p className="heroCopy">
                  Tu centro de control para cuenta, inversión, identidad y acceso a todos los productos y servicios del ecosistema CTG One.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="onlineChip"><Zap size={12} /> NETWORK ONLINE</div>
                {admin ? (
                  <Link href="/admin" className="adminChip">ADMIN OS <ArrowUpRight size={13} /></Link>
                ) : null}
                <Button onClick={signOut} variant="secondary" size="sm">Cerrar sesión</Button>
              </div>
            </div>
          </section>

          <nav className="actionRail mb-5" aria-label="Acciones principales de la cuenta">
            <div>
              <p className="eyebrow">QUICK COMMANDS</p>
              <p className="text-sm text-white/60 mt-1">Acciones principales</p>
            </div>
            <Quick href="/dashboard/wallet" icon={<WalletCards size={16} />} title="Mi Wallet" text="Saldo, activos y actividad" />
            <Quick href="/inversion/app" icon={<Beer size={16} />} title="Invertir" text="Explorar lotes productivos" />
            <Quick href="/dashboard/kyc" icon={<ShieldCheck size={16} />} title="Identidad" text={kyc.label} />
          </nav>

          <section className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-5" aria-label="Resumen de la cuenta">
            <Metric
              href="/dashboard/wallet"
              icon={<WalletCards size={16} />}
              label="Saldo disponible"
              value={isWalletLoading ? '—' : formatCents(wallet?.balance_cents ?? 0, wallet?.currency ?? 'COP')}
              code="BAL"
            />
            <Metric
              href="/inversion/app"
              icon={<CircleDollarSign size={16} />}
              label="Capital activo"
              value={investmentLoading ? '—' : formatCents(summary.activeCapitalCents)}
              code="CAP"
              featured
            />
            <Metric
              href="/inversion/app"
              icon={<Beer size={16} />}
              label="Participaciones"
              value={investmentLoading ? '—' : String(summary.allocations.length)}
              code="INV"
            />
            <Metric
              href="/dashboard/kyc"
              icon={<ShieldCheck size={16} />}
              label="Identidad digital"
              value={kyc.label}
              code="KYC"
              tone={kyc.tone}
            />
          </section>

          <section className="grid grid-cols-1 xl:grid-cols-[1.45fr_.55fr] gap-4">
            <div className="osPanel overflow-hidden">
              <header className="panelHead">
                <div><p className="eyebrow">LIVE ACTIVITY</p><h2>Flujo de actividad</h2></div>
                <div className="pulseIcon"><Activity size={17} /></div>
              </header>
              <div className="p-5 sm:p-6">
                {transactionsLoading ? (
                  <p className="text-sm text-white/40" aria-live="polite">Sincronizando actividad...</p>
                ) : transactions.length ? (
                  <div>
                    {transactions.map((tx, index) => (
                      <div key={tx.id} className="timelineRow">
                        <span className="timelineIndex">0{index + 1}</span>
                        <span className="timelineNode" />
                        <div>
                          <p className="text-sm font-medium">{tx.type === 'deposit' ? 'Recarga de cuenta' : tx.type}</p>
                          <p className="meta">{new Date(tx.created_at).toLocaleDateString('es-CO')} · {STATUS_LABELS[tx.status] ?? tx.status}</p>
                        </div>
                        <p className="amount">{formatCents(tx.amount_cents)}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="emptyState">
                    <Activity size={26} />
                    <p>Aún no hay movimientos en tu timeline.</p>
                    <Link href="/inversion/app">Explorar oportunidades <ArrowRight size={13} /></Link>
                  </div>
                )}
              </div>
            </div>

            <aside className="osPanel identityPanel">
              <div className="identityOrb"><UserRound size={20} /></div>
              <p className="eyebrow">DIGITAL IDENTITY</p>
              <h3>{profile?.email ?? email}</h3>
              <div className="mt-6">
                <Identity label="KYC protocol" value={kyc.label} tone={kyc.tone} />
                <Identity label="Access level" value={admin ? 'Administrator' : 'Member'} />
                <Identity label="Network since" value={profile?.created_at ? new Date(profile.created_at).toLocaleDateString('es-CO') : '—'} />
              </div>
              <Link href="/dashboard/kyc" className="identityStatus">
                <ShieldCheck size={16} />
                <span>{profile?.kyc_status === 'verified' ? 'Identidad validada' : 'Completar validación'}</span>
                <ArrowRight size={13} className="ml-auto" />
              </Link>
            </aside>
          </section>
        </Container>
      </main>

      <style jsx global>{`
        .userOS{background:#030303}.osGrid{background-image:linear-gradient(rgba(201,169,98,.026) 1px,transparent 1px),linear-gradient(90deg,rgba(201,169,98,.026) 1px,transparent 1px);background-size:48px 48px;mask-image:linear-gradient(to bottom,black,transparent 85%)}.osGlow{width:52rem;height:52rem;right:-20rem;top:-20rem;border-radius:50%;background:radial-gradient(circle,rgba(201,169,98,.105),transparent 65%)}
        .commandHero{position:relative;padding:30px 32px;border:1px solid rgba(255,255,255,.1);border-radius:26px;overflow:hidden;background:linear-gradient(115deg,rgba(21,21,21,.97),rgba(8,8,8,.94));box-shadow:0 30px 80px rgba(0,0,0,.38),inset 0 1px rgba(255,255,255,.04)}.commandHero:after{content:'';position:absolute;width:280px;height:280px;border:1px solid rgba(201,169,98,.15);border-radius:50%;right:-90px;top:-150px;box-shadow:0 0 0 35px rgba(201,169,98,.025),0 0 0 70px rgba(201,169,98,.018)}.commandHero h1{font-family:var(--font-outfit);font-size:clamp(2.5rem,5vw,4.6rem);font-weight:650;letter-spacing:-.055em;line-height:.95}.commandHero h1 em{font-style:normal;color:var(--accent)}.heroCopy{color:rgba(255,255,255,.5);margin-top:14px;max-width:720px;font-size:14px}.heroSignal{position:absolute;top:0;left:32px;display:flex;gap:4px}.heroSignal span{display:block;width:28px;height:2px;background:rgba(201,169,98,.25)}.heroSignal span:first-child{background:var(--accent);width:50px}.eyebrow{font-size:9px;letter-spacing:.25em;color:rgba(255,255,255,.35);font-weight:650}.liveDot{display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--accent);box-shadow:0 0 12px rgba(201,169,98,.8);margin-right:7px}.onlineChip,.adminChip{height:38px;padding:0 14px;border:1px solid rgba(255,255,255,.09);border-radius:10px;display:flex;align-items:center;gap:7px;font-size:9px;letter-spacing:.14em;color:rgba(255,255,255,.55);background:rgba(255,255,255,.025)}.adminChip{color:var(--accent);border-color:rgba(201,169,98,.25)}
        .actionRail{display:grid;grid-template-columns:1.2fr repeat(3,1fr);gap:1px;padding:1px;background:rgba(255,255,255,.08);border-radius:18px;overflow:hidden}.actionRail>div,.quickCommand{background:rgba(10,10,10,.96);padding:16px 18px}.quickCommand{display:flex;align-items:center;gap:12px;transition:.25s}.quickCommand:hover{background:rgba(201,169,98,.07)}.quickIcon,.pulseIcon,.identityOrb{width:36px;height:36px;border:1px solid rgba(201,169,98,.24);border-radius:50%;display:flex;align-items:center;justify-content:center;color:var(--accent);background:radial-gradient(circle,rgba(201,169,98,.1),transparent)}.quickCommand strong{display:block;font-size:12px}.quickCommand small{display:block;font-size:9px;color:rgba(255,255,255,.32);margin-top:3px;letter-spacing:.06em}
        .metricOS,.osPanel{background:linear-gradient(145deg,rgba(255,255,255,.045),rgba(255,255,255,.014));border:1px solid rgba(255,255,255,.085);box-shadow:inset 0 1px rgba(255,255,255,.035),0 20px 55px rgba(0,0,0,.2);backdrop-filter:blur(18px)}.metricOS{position:relative;display:block;border-radius:18px;padding:18px;overflow:hidden;transition:transform .25s,border-color .25s}.metricOS:hover{transform:translateY(-2px);border-color:rgba(201,169,98,.24)}.metricOS.featured{border-color:rgba(201,169,98,.25);background:linear-gradient(145deg,rgba(201,169,98,.09),rgba(255,255,255,.018))}.metricTop{display:flex;align-items:center;justify-content:space-between;color:var(--accent)}.metricCode{font:8px monospace;color:rgba(255,255,255,.18)}.metricLabel{font-size:9px;letter-spacing:.16em;color:rgba(255,255,255,.32);margin-top:16px}.metricValue{font-family:var(--font-outfit);font-size:22px;font-weight:650;margin-top:7px}.osPanel{border-radius:22px}.panelHead{display:flex;justify-content:space-between;align-items:center;padding:20px 22px;border-bottom:1px solid rgba(255,255,255,.065)}.panelHead h2{font-family:var(--font-outfit);font-size:22px;font-weight:650;margin-top:4px}.timelineRow{position:relative;display:grid;grid-template-columns:25px 12px 1fr auto;gap:10px;align-items:center;padding:14px 0;border-bottom:1px solid rgba(255,255,255,.055)}.timelineIndex{font:8px monospace;color:rgba(255,255,255,.2)}.timelineNode{width:7px;height:7px;border-radius:50%;background:var(--accent);box-shadow:0 0 10px rgba(201,169,98,.4)}.meta{font-size:9px;color:rgba(255,255,255,.28);margin-top:4px;letter-spacing:.08em;text-transform:uppercase}.amount{font:12px monospace;color:var(--accent)}.emptyState{text-align:center;padding:34px 10px;color:rgba(255,255,255,.28)}.emptyState svg{margin:auto auto 10px}.emptyState p{font-size:13px}.emptyState a{display:inline-flex;align-items:center;gap:6px;color:var(--accent);font-size:9px;letter-spacing:.12em;text-transform:uppercase;margin-top:14px}.identityPanel{padding:24px;position:relative;overflow:hidden}.identityPanel:after{content:'';position:absolute;width:180px;height:180px;border:1px solid rgba(201,169,98,.08);border-radius:50%;right:-80px;top:-80px}.identityOrb{margin-bottom:16px}.identityPanel h3{font-size:13px;color:rgba(255,255,255,.62);margin-top:7px;overflow:hidden;text-overflow:ellipsis}.identityStatus{display:flex;align-items:center;gap:8px;margin-top:20px;padding:11px;border-radius:10px;background:rgba(201,169,98,.055);color:var(--accent);font-size:10px;position:relative;z-index:1;transition:background .2s}.identityStatus:hover{background:rgba(201,169,98,.09)}.identityRow{display:flex;justify-content:space-between;gap:12px;padding:11px 0;border-bottom:1px solid rgba(255,255,255,.055);font-size:10px}.identityRow span:first-child{color:rgba(255,255,255,.3)}
        @media(max-width:800px){.actionRail{grid-template-columns:1fr}.actionRail>div:first-child{display:none}.commandHero{padding:25px 20px}.onlineChip{display:none}.osPanel{backdrop-filter:blur(10px)}}
      `}</style>
    </div>
  );
}

function Quick({ href, icon, title, text }: { href: string; icon: React.ReactNode; title: string; text: string }) {
  return (
    <Link href={href} className="quickCommand">
      <span className="quickIcon">{icon}</span>
      <span><strong>{title}</strong><small>{text}</small></span>
      <ArrowRight size={13} className="ml-auto text-white/20" />
    </Link>
  );
}

function Metric({
  href,
  icon,
  label,
  value,
  code,
  tone,
  featured = false,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  value: string;
  code: string;
  tone?: string;
  featured?: boolean;
}) {
  return (
    <Link href={href} className={`metricOS ${featured ? 'featured' : ''}`} aria-label={`${label}: ${value}`}>
      <div className="metricTop">{icon}<span className="metricCode">{code}</span></div>
      <p className="metricLabel">{label}</p>
      <p className="metricValue" style={{ color: tone ?? 'white' }}>{value}</p>
    </Link>
  );
}

function Identity({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="identityRow">
      <span>{label}</span>
      <strong style={{ color: tone ?? 'white' }}>{value}</strong>
    </div>
  );
}
