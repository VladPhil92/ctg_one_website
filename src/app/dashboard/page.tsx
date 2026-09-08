'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Beer,
  Check,
  CircleDollarSign,
  Grid2X2,
  Headphones,
  Radar,
  ShieldCheck,
  Sparkles,
  UserRound,
  WalletCards,
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
  approved: 'Completado',
  rejected: 'Requiere atención',
};

function transactionLabel(type: string) {
  const labels: Record<string, string> = {
    deposit: 'Recarga de cuenta',
    withdrawal: 'Retiro',
    investment: 'Inversión realizada',
    payment: 'Pago realizado',
    refund: 'Reembolso',
  };
  return labels[type] ?? type.replaceAll('_', ' ');
}

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
  const progressSteps = [
    { label: 'Perfil creado', complete: Boolean(profile) },
    { label: 'Verificación de identidad', complete: profile?.kyc_status === 'verified' },
    { label: 'Wallet activada', complete: Boolean(wallet) },
    { label: 'Primera participación', complete: summary.allocations.length > 0 },
  ];
  const completedSteps = progressSteps.filter((step) => step.complete).length;
  const progressPercent = Math.round((completedSteps / progressSteps.length) * 100);

  return (
    <div className="ctgDash min-h-screen overflow-hidden text-white">
      <Navbar />
      <div className="ctgDashGrid fixed inset-0 pointer-events-none" aria-hidden="true" />
      <div className="ctgDashGlow fixed pointer-events-none" aria-hidden="true" />

      <main className="relative pb-14 pt-28 sm:pt-32">
        <Container>
          <section className="ctgHero mb-5" aria-labelledby="dashboard-title">
            <div className="ctgHeroRings" aria-hidden="true" />
            <div className="ctgHeroCoin" aria-hidden="true">
              <Image src="/images/logo/ctg-one-coin-icon.png" alt="" width={280} height={280} priority />
            </div>

            <div className="relative z-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_310px] lg:items-end">
              <div>
                <p className="ctgEyebrow"><span className="ctgDot" /> TU ECOSISTEMA CTG ONE</p>
                <h1 id="dashboard-title" className="ctgHeroTitle">Hola, {firstName}<span>.</span></h1>
                <p className="ctgHeroCopy">
                  Todo lo que necesitas para gestionar tu cuenta, tus inversiones y tus servicios desde un solo lugar.
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Button href="/products" variant="primary" size="md" className="rounded-xl px-6">
                    Explorar servicios <ArrowRight size={15} />
                  </Button>
                  <Link href="/inversion/app" className="ctgTextAction">
                    Ver oportunidades <ArrowUpRight size={14} />
                  </Link>
                </div>
              </div>

              <div className="ctgHeroAside">
                <p className="ctgHeroQuote">“Más que servicios, oportunidades para tu próximo nivel.”</p>
                <span className="ctgGoldLine" aria-hidden="true" />
                <p className="ctgHeroBrand">CTG One Technology</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {admin ? <Link href="/admin" className="ctgMiniAction">Administración <ArrowUpRight size={12} /></Link> : null}
                  <button type="button" onClick={signOut} className="ctgMiniAction">Cerrar sesión</button>
                </div>
              </div>
            </div>
          </section>

          <section className="ctgSection mb-5" aria-labelledby="quick-actions-title">
            <div className="ctgSectionHead">
              <div>
                <p className="ctgEyebrow">ACCESOS RÁPIDOS</p>
                <h2 id="quick-actions-title">Acciones principales</h2>
              </div>
              <p>Accede rápidamente a lo que más usas.</p>
            </div>
            <div className="ctgQuickGrid">
              <Quick href="/dashboard/wallet" icon={<WalletCards size={20} />} title="Mi Wallet" text="Saldo, activos y movimientos" />
              <Quick href="/inversion/app" icon={<CircleDollarSign size={20} />} title="Invertir" text="Explorar oportunidades" />
              <Quick href="/dashboard/kyc" icon={<ShieldCheck size={20} />} title="Identidad" text={kyc.label} />
              <Quick href="/products" icon={<Grid2X2 size={20} />} title="Servicios" text="Todo el ecosistema CTG One" />
            </div>
          </section>

          <section className="mb-5" aria-labelledby="summary-title">
            <div className="ctgSectionHead mb-3">
              <div>
                <p className="ctgEyebrow">TU RESUMEN</p>
                <h2 id="summary-title">Una vista clara de tu cuenta</h2>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              <Metric
                href="/dashboard/wallet"
                icon={<WalletCards size={19} />}
                label="Saldo disponible"
                value={isWalletLoading ? '—' : formatCents(wallet?.balance_cents ?? 0, wallet?.currency ?? 'COP')}
                helper="Disponible en tu wallet"
              />
              <Metric
                href="/inversion/app"
                icon={<CircleDollarSign size={19} />}
                label="Capital activo"
                value={investmentLoading ? '—' : formatCents(summary.activeCapitalCents)}
                helper="En inversiones activas"
                featured
              />
              <Metric
                href="/inversion/app"
                icon={<Beer size={19} />}
                label="Participaciones"
                value={investmentLoading ? '—' : String(summary.allocations.length)}
                helper="En lotes productivos"
              />
              <Metric
                href="/dashboard/kyc"
                icon={<ShieldCheck size={19} />}
                label="Identidad digital"
                value={kyc.label}
                helper={profile?.kyc_status === 'verified' ? 'Tu identidad está confirmada' : 'Completa tu verificación'}
                tone={kyc.tone}
              />
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.55fr_.65fr]">
            <div className="ctgPanel overflow-hidden">
              <header className="ctgPanelHead">
                <div>
                  <p className="ctgEyebrow">ACTIVIDAD RECIENTE</p>
                  <h2>Flujo de actividad</h2>
                </div>
                <div className="ctgRoundIcon"><Activity size={18} /></div>
              </header>

              <div className="p-4 sm:p-5">
                {transactionsLoading ? (
                  <p className="py-8 text-center text-sm text-white/40" aria-live="polite">Actualizando tu actividad...</p>
                ) : transactions.length ? (
                  <div className="ctgActivityList">
                    {transactions.map((tx) => (
                      <div key={tx.id} className="ctgActivityRow">
                        <span className="ctgActivityIcon"><Activity size={15} /></span>
                        <div className="min-w-0">
                          <p className="ctgActivityTitle">{transactionLabel(tx.type)}</p>
                          <p className="ctgActivityMeta">
                            {new Date(tx.created_at).toLocaleDateString('es-CO')} · {STATUS_LABELS[tx.status] ?? tx.status}
                          </p>
                        </div>
                        <p className="ctgActivityAmount">{formatCents(tx.amount_cents)}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="ctgEmptyState">
                    <Sparkles size={25} />
                    <p>Aún no tienes movimientos recientes.</p>
                    <Link href="/products">Explorar el ecosistema <ArrowRight size={13} /></Link>
                  </div>
                )}
              </div>
            </div>

            <aside className="space-y-4">
              <section className="ctgPanel ctgProgressCard" aria-labelledby="progress-title">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="ctgEyebrow">TU PROGRESO</p>
                    <h2 id="progress-title">Avanza en CTG One</h2>
                  </div>
                  <strong>{progressPercent}%</strong>
                </div>
                <div className="ctgProgressTrack" aria-label={`${progressPercent}% completado`}>
                  <span style={{ width: `${progressPercent}%` }} />
                </div>
                <p className="ctgProgressCount">{completedSteps} de {progressSteps.length} pasos completados</p>
                <div className="mt-5 space-y-1">
                  {progressSteps.map((step) => (
                    <div key={step.label} className="ctgProgressRow">
                      <span className={step.complete ? 'complete' : ''}>{step.complete ? <Check size={13} /> : null}</span>
                      <p>{step.label}</p>
                    </div>
                  ))}
                </div>
                <Link href="/dashboard/kyc" className="ctgProgressCta">Continuar <ArrowRight size={14} /></Link>
              </section>

              <section className="ctgPanel ctgIdentityCard" aria-labelledby="identity-title">
                <div className="ctgRoundIcon"><UserRound size={18} /></div>
                <p className="ctgEyebrow mt-5">TU CUENTA</p>
                <h2 id="identity-title">{profile?.email ?? email}</h2>
                <Identity label="Identidad" value={kyc.label} tone={kyc.tone} />
                <Identity label="Cuenta" value={admin ? 'Administrador' : 'Miembro'} />
                <Identity
                  label="Desde"
                  value={profile?.created_at ? new Date(profile.created_at).toLocaleDateString('es-CO') : '—'}
                />
                <Link href="/dashboard/kyc" className="ctgIdentityLink">
                  <ShieldCheck size={15} />
                  {profile?.kyc_status === 'verified' ? 'Identidad validada' : 'Completar validación'}
                  <ArrowRight size={13} className="ml-auto" />
                </Link>
              </section>

              <section className="ctgSupportCard">
                <div className="ctgRoundIcon"><Headphones size={18} /></div>
                <div>
                  <strong>¿Necesitas ayuda?</strong>
                  <p>Nuestro equipo está listo para apoyarte.</p>
                </div>
                <Link href="/contact">Ir a soporte <ArrowUpRight size={12} /></Link>
              </section>
            </aside>
          </section>
        </Container>
      </main>

      <style jsx global>{`
        .ctgDash{background:#030303;min-height:100vh}.ctgDashGrid{background-image:linear-gradient(rgba(214,174,86,.022) 1px,transparent 1px),linear-gradient(90deg,rgba(214,174,86,.022) 1px,transparent 1px);background-size:52px 52px;mask-image:linear-gradient(to bottom,black,transparent 92%)}.ctgDashGlow{width:54rem;height:54rem;right:-18rem;top:-18rem;border-radius:50%;background:radial-gradient(circle,rgba(214,174,86,.11),transparent 66%)}
        .ctgHero{position:relative;min-height:280px;padding:34px 36px;border:1px solid rgba(214,174,86,.18);border-radius:28px;overflow:hidden;background:radial-gradient(circle at 76% 35%,rgba(214,174,86,.13),transparent 24%),linear-gradient(115deg,rgba(19,19,19,.99),rgba(6,6,6,.97));box-shadow:0 30px 85px rgba(0,0,0,.36),inset 0 1px rgba(255,255,255,.04)}.ctgHero:before{content:'';position:absolute;inset:0;background:linear-gradient(90deg,rgba(3,3,3,.06),rgba(3,3,3,.02) 48%,rgba(3,3,3,.48));pointer-events:none}.ctgHeroRings{position:absolute;right:-92px;top:-178px;width:420px;height:420px;border:1px solid rgba(214,174,86,.14);border-radius:50%;box-shadow:0 0 0 46px rgba(214,174,86,.025),0 0 0 92px rgba(214,174,86,.018)}.ctgHeroCoin{position:absolute;right:180px;bottom:-92px;width:250px;height:250px;opacity:.09;filter:saturate(.8)}.ctgHeroCoin img{width:100%;height:100%;object-fit:contain}.ctgEyebrow{font-size:9px;letter-spacing:.24em;color:rgba(255,255,255,.38);font-weight:650}.ctgDot{display:inline-block;width:6px;height:6px;margin-right:7px;border-radius:50%;background:#e8bf58;box-shadow:0 0 13px rgba(232,191,88,.68)}.ctgHeroTitle{margin-top:12px;font-family:var(--font-outfit);font-size:clamp(3rem,6vw,5.35rem);font-weight:650;letter-spacing:-.06em;line-height:.92}.ctgHeroTitle span{color:#e8bf58}.ctgHeroCopy{margin-top:17px;max-width:650px;color:rgba(255,255,255,.58);font-size:15px;line-height:1.8}.ctgHeroAside{position:relative;z-index:1;padding:12px 0 2px 28px;border-left:1px solid rgba(214,174,86,.18)}.ctgHeroQuote{font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:18px;line-height:1.45;color:rgba(255,255,255,.75)}.ctgGoldLine{display:block;width:42px;height:2px;margin:18px 0 12px;background:#d6ae56}.ctgHeroBrand{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#e8bf58}.ctgTextAction{display:inline-flex;min-height:44px;align-items:center;gap:8px;padding:0 4px;color:#e8bf58;font-size:11px;font-weight:650;letter-spacing:.1em;text-transform:uppercase}.ctgMiniAction{display:inline-flex;align-items:center;gap:6px;border:1px solid rgba(255,255,255,.09);border-radius:9px;background:rgba(255,255,255,.025);padding:9px 11px;color:rgba(255,255,255,.5);font-size:9px;letter-spacing:.1em;text-transform:uppercase;transition:.2s}.ctgMiniAction:hover{border-color:rgba(214,174,86,.3);color:#fff}
        .ctgSection,.ctgPanel{border:1px solid rgba(255,255,255,.085);background:linear-gradient(145deg,rgba(255,255,255,.042),rgba(255,255,255,.012));box-shadow:inset 0 1px rgba(255,255,255,.03),0 22px 60px rgba(0,0,0,.18);backdrop-filter:blur(18px)}.ctgSection{border-radius:22px;padding:20px}.ctgSectionHead{display:flex;align-items:end;justify-content:space-between;gap:20px}.ctgSectionHead h2,.ctgPanelHead h2,.ctgProgressCard h2,.ctgIdentityCard h2{margin-top:5px;font-family:var(--font-outfit);font-size:21px;font-weight:620;letter-spacing:-.025em}.ctgSectionHead>p{max-width:420px;text-align:right;font-size:11px;color:rgba(255,255,255,.32)}.ctgQuickGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:17px}.ctgQuick{display:flex;min-height:86px;align-items:center;gap:13px;border:1px solid rgba(255,255,255,.075);border-radius:16px;background:rgba(7,7,7,.66);padding:15px;transition:transform .22s,border-color .22s,background .22s}.ctgQuick:hover{transform:translateY(-2px);border-color:rgba(214,174,86,.28);background:rgba(214,174,86,.055)}.ctgQuickIcon,.ctgRoundIcon{display:flex;flex:none;align-items:center;justify-content:center;color:#e8bf58;border:1px solid rgba(214,174,86,.24);background:radial-gradient(circle,rgba(214,174,86,.11),transparent 72%)}.ctgQuickIcon{width:42px;height:42px;border-radius:13px}.ctgRoundIcon{width:39px;height:39px;border-radius:50%}.ctgQuick strong{display:block;font-size:13px}.ctgQuick small{display:block;margin-top:4px;color:rgba(255,255,255,.34);font-size:10px;line-height:1.45}.ctgQuickArrow{margin-left:auto;color:rgba(255,255,255,.22)}
        .ctgMetric{position:relative;display:block;min-height:138px;border:1px solid rgba(255,255,255,.085);border-radius:19px;background:linear-gradient(145deg,rgba(255,255,255,.042),rgba(255,255,255,.012));padding:18px;overflow:hidden;transition:transform .22s,border-color .22s}.ctgMetric:hover{transform:translateY(-2px);border-color:rgba(214,174,86,.25)}.ctgMetric.featured{border-color:rgba(214,174,86,.25);background:linear-gradient(145deg,rgba(214,174,86,.085),rgba(255,255,255,.015))}.ctgMetricTop{display:flex;align-items:center;justify-content:space-between;color:#e8bf58}.ctgMetricArrow{color:rgba(255,255,255,.2)}.ctgMetricLabel{margin-top:16px;font-size:11px;color:rgba(255,255,255,.42)}.ctgMetricValue{margin-top:5px;font-family:var(--font-outfit);font-size:25px;font-weight:650}.ctgMetricHelper{margin-top:7px;font-size:9px;color:rgba(255,255,255,.28)}
        .ctgPanel{border-radius:22px}.ctgPanelHead{display:flex;align-items:center;justify-content:space-between;padding:20px 22px;border-bottom:1px solid rgba(255,255,255,.065)}.ctgActivityList{display:flex;flex-direction:column}.ctgActivityRow{display:grid;grid-template-columns:40px minmax(0,1fr) auto;align-items:center;gap:12px;padding:14px 5px;border-bottom:1px solid rgba(255,255,255,.055)}.ctgActivityRow:last-child{border-bottom:0}.ctgActivityIcon{display:flex;width:34px;height:34px;align-items:center;justify-content:center;border-radius:50%;background:rgba(214,174,86,.09);color:#e8bf58}.ctgActivityTitle{font-size:12px;font-weight:600;text-transform:capitalize}.ctgActivityMeta{margin-top:4px;color:rgba(255,255,255,.3);font-size:9px;letter-spacing:.06em;text-transform:uppercase}.ctgActivityAmount{font:11px ui-monospace,SFMono-Regular,Menlo,monospace;color:#e8bf58}.ctgEmptyState{text-align:center;padding:38px 10px;color:rgba(255,255,255,.3)}.ctgEmptyState svg{margin:0 auto 10px;color:#e8bf58}.ctgEmptyState p{font-size:13px}.ctgEmptyState a{display:inline-flex;align-items:center;gap:6px;margin-top:14px;color:#e8bf58;font-size:9px;letter-spacing:.1em;text-transform:uppercase}
        .ctgProgressCard,.ctgIdentityCard{padding:22px}.ctgProgressCard strong{font-family:var(--font-outfit);font-size:20px;color:#e8bf58}.ctgProgressTrack{height:8px;margin-top:21px;overflow:hidden;border-radius:999px;background:rgba(255,255,255,.07)}.ctgProgressTrack span{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#aa7d2b,#f1c75b);box-shadow:0 0 18px rgba(214,174,86,.18)}.ctgProgressCount{margin-top:8px;color:rgba(255,255,255,.32);font-size:10px}.ctgProgressRow{display:flex;align-items:center;gap:10px;padding:8px 0;color:rgba(255,255,255,.52);font-size:11px}.ctgProgressRow>span{display:flex;width:18px;height:18px;align-items:center;justify-content:center;border:1px solid rgba(255,255,255,.2);border-radius:50%}.ctgProgressRow>span.complete{border-color:rgba(214,174,86,.5);background:#d6ae56;color:#080808}.ctgProgressCta{display:flex;align-items:center;justify-content:center;gap:8px;min-height:42px;margin-top:17px;border-radius:11px;background:#d6ae56;color:#080808;font-size:10px;font-weight:750;letter-spacing:.1em;text-transform:uppercase;transition:transform .2s,background .2s}.ctgProgressCta:hover{transform:translateY(-1px);background:#e8bf58}.ctgIdentityCard{position:relative;overflow:hidden}.ctgIdentityCard:after{content:'';position:absolute;width:170px;height:170px;right:-84px;top:-84px;border:1px solid rgba(214,174,86,.09);border-radius:50%;box-shadow:0 0 0 34px rgba(214,174,86,.018)}.ctgIdentityCard h2{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:15px;color:rgba(255,255,255,.68)}.ctgIdentityRow{position:relative;z-index:1;display:flex;justify-content:space-between;gap:12px;padding:11px 0;border-bottom:1px solid rgba(255,255,255,.055);font-size:10px}.ctgIdentityRow span{color:rgba(255,255,255,.3)}.ctgIdentityLink{position:relative;z-index:1;display:flex;align-items:center;gap:8px;margin-top:17px;padding:11px;border-radius:10px;background:rgba(214,174,86,.055);color:#e8bf58;font-size:10px;transition:background .2s}.ctgIdentityLink:hover{background:rgba(214,174,86,.09)}.ctgSupportCard{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:12px;border:1px solid rgba(214,174,86,.15);border-radius:18px;background:linear-gradient(135deg,rgba(214,174,86,.07),rgba(255,255,255,.018));padding:17px}.ctgSupportCard strong{font-size:11px}.ctgSupportCard p{margin-top:3px;color:rgba(255,255,255,.32);font-size:9px}.ctgSupportCard a{display:flex;align-items:center;gap:5px;color:#e8bf58;font-size:8px;font-weight:700;letter-spacing:.1em;text-transform:uppercase}
        @media(max-width:1024px){.ctgQuickGrid{grid-template-columns:repeat(2,1fr)}.ctgHeroCoin{right:40px}.ctgHeroAside{border-left:0;border-top:1px solid rgba(214,174,86,.14);padding:22px 0 0}.ctgHeroQuote{max-width:620px}.ctgSectionHead>p{display:none}}
        @media(max-width:640px){.ctgHero{padding:27px 20px;min-height:0}.ctgHeroCoin{width:170px;height:170px;right:-35px;bottom:-65px}.ctgHeroRings{width:280px;height:280px;right:-150px;top:-130px}.ctgHeroCopy{font-size:13px}.ctgQuickGrid{grid-template-columns:1fr}.ctgSection{padding:15px}.ctgSectionHead h2,.ctgPanelHead h2,.ctgProgressCard h2{font-size:19px}.ctgActivityAmount{font-size:9px}.ctgSupportCard{grid-template-columns:auto 1fr}.ctgSupportCard a{grid-column:2}.ctgMetric{min-height:128px;padding:15px}.ctgMetricValue{font-size:19px}}
      `}</style>
    </div>
  );
}

function Quick({ href, icon, title, text }: { href: string; icon: React.ReactNode; title: string; text: string }) {
  return (
    <Link href={href} className="ctgQuick">
      <span className="ctgQuickIcon">{icon}</span>
      <span className="min-w-0"><strong>{title}</strong><small>{text}</small></span>
      <ArrowRight size={14} className="ctgQuickArrow" aria-hidden="true" />
    </Link>
  );
}

function Metric({
  href,
  icon,
  label,
  value,
  helper,
  tone,
  featured = false,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  value: string;
  helper: string;
  tone?: string;
  featured?: boolean;
}) {
  return (
    <Link href={href} className={`ctgMetric ${featured ? 'featured' : ''}`} aria-label={`${label}: ${value}`}>
      <div className="ctgMetricTop">{icon}<ArrowUpRight size={13} className="ctgMetricArrow" aria-hidden="true" /></div>
      <p className="ctgMetricLabel">{label}</p>
      <p className="ctgMetricValue" style={{ color: tone ?? 'white' }}>{value}</p>
      <p className="ctgMetricHelper">{helper}</p>
    </Link>
  );
}

function Identity({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="ctgIdentityRow">
      <span>{label}</span>
      <strong style={{ color: tone ?? 'white' }}>{value}</strong>
    </div>
  );
}
