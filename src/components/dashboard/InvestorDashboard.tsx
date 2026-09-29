'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Beer,
  Bell,
  Building2,
  ChevronRight,
  CircleHelp,
  Compass,
  GraduationCap,
  Home,
  LogOut,
  Menu,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserRound,
  WalletCards,
  X,
} from 'lucide-react';

import { BrandLogo } from '@/components/BrandLogo';
import { useAuth } from '@/contexts/AuthContext';
import { DASHBOARD_HERO_IMAGE } from '@/data/dashboardHeroImage';
import { useAccountTransactions } from '@/hooks/useAccountTransactions';
import { useInvestmentSummary } from '@/hooks/useInvestmentSummary';
import { useWallet } from '@/hooks/useWallet';
import { formatCents } from '@/lib/format';

function transactionLabel(type: string) {
  const labels: Record<string, string> = {
    deposit: 'Recarga Wallet',
    purchase: 'Compra realizada',
    adjustment: 'Ajuste de cuenta',
  };
  return labels[type] ?? type.replaceAll('_', ' ');
}

function transactionStatusLabel(status: string) {
  const labels: Record<string, string> = {
    approved: 'Aprobada',
    pending: 'Pendiente',
    rejected: 'Rechazada',
  };
  return labels[status] ?? status;
}

function formatActivityDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('es-CO', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function resolveSearch(query: string) {
  const normalized = query.toLocaleLowerCase('es-CO');
  if (['wallet', 'saldo', 'recarga', 'retirar'].some((token) => normalized.includes(token))) return '/dashboard/wallet';
  if (['invertir', 'inversion', 'inversión', 'cerveza', 'craft beer', 'lote'].some((token) => normalized.includes(token))) return '/inversion/lotes';
  if (['educacion', 'educación', 'curso'].some((token) => normalized.includes(token))) return '/dashboard/educacion';
  if (['identidad', 'kyc', 'verificar'].some((token) => normalized.includes(token))) return '/dashboard/kyc';
  if (['seguridad', 'perfil', 'mfa'].some((token) => normalized.includes(token))) return '/dashboard/seguridad/mfa';
  return '/products';
}

export default function InvestorDashboard() {
  const { profile, email, isAuthenticated, isLoading, signOut } = useAuth();
  const {
    wallet,
    isLoading: walletLoading,
    state: walletState,
    refresh: refreshWallet,
  } = useWallet();
  const {
    summary: investment,
    isLoading: investmentLoading,
    state: investmentState,
    refresh: refreshInvestment,
  } = useInvestmentSummary();
  const {
    transactions,
    isLoading: transactionsLoading,
    state: transactionState,
    refresh: refreshTransactions,
  } = useAccountTransactions(5);
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/iniciar-sesion?next=/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  const firstName = profile?.full_name?.trim().split(/\s+/)[0] || 'Usuario';
  const displayName = profile?.full_name?.trim() || firstName;
  const accountEmail = profile?.email ?? email ?? '';
  const currency = wallet?.currency ?? 'COP';
  const kycVerified = profile?.kyc_status === 'verified';
  const notificationsCount = kycVerified ? 0 : 1;
  const hasReadError = walletState === 'error' || investmentState === 'error' || transactionState === 'error';

  const walletBalance = walletState === 'error'
    ? 'No disponible'
    : walletLoading
      ? 'Sincronizando…'
      : formatCents(wallet?.balance_cents ?? 0, currency);

  const totalInvested = investmentState === 'error'
    ? 'No disponible'
    : investmentLoading
      ? 'Sincronizando…'
      : formatCents(investment.activeCapitalCents, currency);

  const investmentBalance = investmentState === 'error'
    ? 'No disponible'
    : investmentLoading
      ? 'Sincronizando…'
      : formatCents(investment.availableBalanceCents, currency);

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#060809] text-white">
        <div className="flex flex-col items-center gap-3 text-white/60">
          <span className="grid h-14 w-14 place-items-center rounded-2xl border border-[#e3b653]/25 bg-[#e3b653]/[.07] text-[#e3b653]">
            <Sparkles className="animate-pulse" />
          </span>
          <span className="text-xs">Preparando tu dashboard…</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = searchTerm.trim();
    router.push(query ? resolveSearch(query) : '/products');
  }

  async function retryAccountReads() {
    setRetrying(true);
    try {
      await Promise.all([refreshWallet(), refreshInvestment(), refreshTransactions()]);
    } finally {
      setRetrying(false);
    }
  }

  const activities = transactions.map((transaction) => {
    const approvedCredit = transaction.type === 'deposit' && transaction.status === 'approved';
    const approvedDebit = transaction.type === 'purchase' && transaction.status === 'approved';
    const prefix = approvedCredit ? '+' : approvedDebit ? '-' : '';
    return {
      id: transaction.id,
      title: transactionLabel(transaction.type),
      date: formatActivityDate(transaction.created_at),
      status: transactionStatusLabel(transaction.status),
      statusCode: transaction.status,
      amount: `${prefix}${formatCents(transaction.amount_cents, currency)}`,
      positive: approvedCredit,
    };
  });

  return (
    <div className="min-h-screen bg-[#07090b] text-white [--ctg-gold:#e3b653]">
      <DesktopSidebar notifications={notificationsCount} />

      <div className="min-h-screen pb-24 lg:ml-[248px] lg:pb-0">
        <header className="sticky top-0 z-40 flex min-h-16 items-center gap-3 border-b border-white/[0.08] bg-[#07090b]/95 px-4 backdrop-blur-xl sm:px-6">
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.025] lg:hidden"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Abrir navegación"
          >
            <Menu size={18} />
          </button>
          <div className="lg:hidden"><BrandLogo priority compact /></div>

          <form className="ml-1 hidden h-10 w-full max-w-[560px] items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.025] px-3 md:flex" onSubmit={handleSearch} role="search">
            <Search size={16} className="text-white/45" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar inversiones, educación, tendencias…"
              aria-label="Buscar en CTG One"
              className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-white/35"
            />
          </form>

          <div className="ml-auto flex items-center gap-2.5">
            <a href="#actividad" className="relative grid h-10 w-10 place-items-center rounded-xl text-white/65 transition hover:bg-white/[0.04]" aria-label={`${notificationsCount} notificaciones`}>
              <Bell size={18} />
              {notificationsCount > 0 ? <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-[#e3b653] px-1 text-[8px] font-black text-[#151006]">{notificationsCount}</span> : null}
            </a>
            <div className="hidden min-w-0 sm:block">
              <strong className="block max-w-[180px] truncate text-xs font-medium">{displayName}</strong>
              <small className="block max-w-[180px] truncate text-[9px] text-white/35">{accountEmail}</small>
            </div>
            <button type="button" onClick={() => void signOut()} className="grid h-10 w-10 place-items-center rounded-xl text-white/45 transition hover:bg-white/[0.04] hover:text-white" aria-label="Cerrar sesión">
              <LogOut size={17} />
            </button>
          </div>
        </header>

        {mobileNavOpen ? <MobileNav onClose={() => setMobileNavOpen(false)} notifications={notificationsCount} /> : null}

        <main>
          <section
            className="relative isolate min-h-[250px] overflow-hidden border-b border-white/[0.08] px-4 py-9 sm:px-6 sm:py-11 xl:px-8"
            style={{
              backgroundImage: `linear-gradient(90deg,#07090b 0%,rgba(7,9,11,.91) 32%,rgba(7,9,11,.45) 70%,rgba(7,9,11,.75) 100%),url('${DASHBOARD_HERO_IMAGE}')`,
              backgroundPosition: 'center 52%',
              backgroundSize: 'cover',
            }}
          >
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_72%_42%,rgba(227,182,83,.16),transparent_34%)]" />
            <div className="max-w-[760px]">
              <div className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[.2em] text-white/50">
                <span className="h-1.5 w-1.5 rounded-full bg-[#e3b653] shadow-[0_0_12px_rgba(227,182,83,.8)]" />
                CTG One
              </div>
              <h1 className="mt-4 font-outfit text-5xl font-semibold leading-[.94] tracking-[-.05em] sm:text-6xl">
                Hola, {firstName}<span className="text-[#e3b653]">.</span>
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-6 text-white/67 sm:text-base">
                Consulta tu dinero, tu portafolio y las oportunidades disponibles desde un solo lugar.
              </p>
            </div>
          </section>

          <div className="mx-auto max-w-[1560px] px-4 py-4 sm:px-6 xl:px-8">
            {hasReadError ? (
              <section className="mb-4 flex flex-col gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] px-4 py-3 sm:flex-row sm:items-center">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-amber-300/15 bg-amber-300/[0.06] text-amber-200"><AlertTriangle size={18} /></span>
                <div className="min-w-0 flex-1">
                  <strong className="block text-xs">No pudimos sincronizar toda tu información financiera</strong>
                  <p className="mt-1 text-[10px] leading-4 text-white/45">Los valores con error se muestran como “No disponible”; no asumimos saldos en cero cuando una lectura falla.</p>
                </div>
                <button type="button" onClick={() => void retryAccountReads()} disabled={retrying} className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-amber-300/25 px-4 text-xs font-semibold text-amber-100 disabled:opacity-50">
                  <RefreshCw size={14} className={retrying ? 'animate-spin' : ''} /> {retrying ? 'Reintentando…' : 'Reintentar'}
                </button>
              </section>
            ) : null}

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1.2fr_1fr_1fr_.95fr]">
              <SummaryCard icon={<WalletCards size={20} />} title="Saldo disponible" value={walletBalance}>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href="/dashboard/depositos" className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#e3b653] px-4 text-xs font-bold text-[#171207] transition hover:bg-[#f0c86a]">
                    <Plus size={15} /> Agregar fondos
                  </Link>
                  <Link href="/dashboard/wallet" className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/12 bg-white/[0.025] px-4 text-xs font-semibold text-white/75 transition hover:bg-white/[0.06]">
                    <ArrowUpRight size={15} /> Movimientos
                  </Link>
                </div>
              </SummaryCard>

              <SummaryCard icon={<BarChart3 size={20} />} title="Total invertido" value={totalInvested} href="/inversion/app">
                {investmentState === 'ready' ? <p className="mt-2 text-[11px] text-white/40">{investment.allocations.length} inversión{investment.allocations.length === 1 ? '' : 'es'} activa{investment.allocations.length === 1 ? '' : 's'}</p> : null}
              </SummaryCard>

              <SummaryCard icon={<TrendingUp size={20} />} title="Disponible inversión" value={investmentBalance} href="/inversion/app" accent>
                {investmentState === 'ready' ? <p className="mt-2 text-[11px] text-emerald-300/80">Disponible para retirar o reinvertir</p> : null}
              </SummaryCard>

              <Link href="/inversion/lotes" className="group flex min-h-[152px] flex-col justify-between rounded-2xl border border-[#e3b653]/20 bg-[linear-gradient(145deg,rgba(227,182,83,.16),rgba(15,17,19,.98)_56%)] p-4 transition duration-300 hover:-translate-y-0.5 hover:border-[#e3b653]/45 hover:shadow-[0_18px_50px_rgba(227,182,83,.08)]">
                <span className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#e3b653] px-4 text-sm font-extrabold text-[#171207]">
                  <Plus size={18} /> Invertir ahora <ArrowRight size={17} className="transition group-hover:translate-x-1" />
                </span>
                <p className="mt-4 text-center text-[11px] leading-5 text-white/48">Consulta lotes abiertos y condiciones vigentes antes de invertir.</p>
              </Link>
            </section>

            <section className="mt-4 rounded-2xl border border-white/[0.08] bg-[#0b0e10] p-3 sm:p-4">
              <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h2 className="font-outfit text-2xl font-semibold tracking-[-.03em]">Oportunidades de inversión</h2>
                  <p className="mt-1 text-[11px] text-white/42">Proyectos reales. Condiciones verificables. Un mejor futuro.</p>
                </div>
                <Link href="/inversion/lotes" className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#e3b653] hover:text-[#f4cc72]">Ver lotes publicados <ArrowRight size={14} /></Link>
              </div>

              <div className="grid gap-3 lg:grid-cols-[1.6fr_.7fr_.7fr]">
                <Link href="/inversion/lotes" className="group relative min-h-[220px] overflow-hidden rounded-2xl border border-[#e3b653]/30 bg-[radial-gradient(circle_at_18%_40%,rgba(227,182,83,.2),transparent_31%),linear-gradient(135deg,#14100b,#0a0c0e_52%,#12100d)] p-5 transition hover:-translate-y-0.5 hover:border-[#e3b653]/55">
                  <div className="absolute -bottom-16 -left-8 h-52 w-52 rounded-full bg-[#e3b653]/10 blur-3xl" />
                  <div className="relative flex h-full flex-col justify-between gap-6 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-4">
                      <span className="grid h-24 w-24 shrink-0 place-items-center rounded-2xl border border-[#e3b653]/20 bg-black/35 text-[#e3b653] shadow-[inset_0_0_40px_rgba(227,182,83,.08)]">
                        <Beer size={42} strokeWidth={1.5} />
                      </span>
                      <div>
                        <span className="inline-flex rounded-full border border-[#e3b653]/25 bg-[#e3b653]/10 px-2.5 py-1 text-[9px] font-semibold text-[#f0c668]">Consultar lotes</span>
                        <h3 className="mt-3 font-outfit text-2xl font-semibold tracking-[-.03em]">CTG Craft Beer Inversión</h3>
                        <p className="mt-1 text-xs text-white/50">Invierte en el crecimiento de la marca.</p>
                        <p className="mt-4 max-w-md text-[10px] leading-5 text-white/38">La disponibilidad, capacidad restante y condiciones económicas se consultan en los lotes publicados en tiempo real.</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col">
                      <span className="inline-flex h-10 items-center justify-center rounded-xl border border-white/12 bg-black/20 px-4 text-xs font-semibold text-white/80">Ver oportunidad</span>
                      <span className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#e3b653] px-4 text-xs font-bold text-[#171207]">Ver lotes <ArrowRight size={15} className="transition group-hover:translate-x-1" /></span>
                    </div>
                  </div>
                </Link>

                <OpportunityPlaceholder icon={<Building2 size={30} />} />
                <OpportunityPlaceholder icon={<TrendingUp size={30} />} />
              </div>
            </section>

            <div className="mt-4 grid gap-4 xl:grid-cols-[1.55fr_.9fr]">
              <section className="rounded-2xl border border-white/[0.08] bg-[#0b0e10] p-4">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <h2 className="font-outfit text-2xl font-semibold tracking-[-.03em]">Mis inversiones</h2>
                    <p className="mt-1 text-[11px] text-white/42">Tu portafolio, en un vistazo.</p>
                  </div>
                  <Link href="/inversion/app" className="hidden items-center gap-1.5 text-[11px] font-semibold text-[#e3b653] sm:inline-flex">Ver portafolio completo <ArrowRight size={14} /></Link>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {investmentState === 'error' ? (
                    <ReadErrorPanel label="No pudimos cargar tu portafolio." onRetry={() => void retryAccountReads()} retrying={retrying} className="md:col-span-2" />
                  ) : investmentLoading ? (
                    <div className="md:col-span-2 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-7 text-center text-xs text-white/40">Sincronizando inversiones…</div>
                  ) : investment.allocations.length > 0 ? investment.allocations.slice(0, 2).map((allocation, index) => (
                    <Link key={allocation.id} href="/inversion/app" className="group rounded-2xl border border-white/[0.08] bg-[#090b0d] p-4 transition hover:border-white/[0.14] hover:bg-[#0c0f11]">
                      <div className="flex items-center gap-3">
                        <span className="grid h-10 w-10 place-items-center rounded-xl border border-[#e3b653]/20 bg-[#e3b653]/[.07] text-[#e3b653]"><Beer size={18} /></span>
                        <div className="min-w-0">
                          <strong className="block truncate text-sm">CTG Craft Beer</strong>
                          <span className="text-[9px] text-white/35">Participación {index + 1}</span>
                        </div>
                        <span className="ml-auto rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[9px] font-semibold text-emerald-300">Activa</span>
                        <ChevronRight size={16} className="text-white/28 transition group-hover:translate-x-0.5" />
                      </div>
                      <div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/[0.07] pt-4">
                        <Metric label="Capital invertido" value={formatCents(allocation.capital_committed_cents, currency)} />
                        <Metric label="Unidades equivalentes" value={String(allocation.case_equivalent_units)} />
                      </div>
                    </Link>
                  )) : (
                    <div className="md:col-span-2 rounded-2xl border border-dashed border-white/[0.11] bg-white/[0.015] p-7 text-center">
                      <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-[#e3b653]/20 bg-[#e3b653]/[.06] text-[#e3b653]"><BarChart3 size={20} /></span>
                      <h3 className="mt-4 text-sm font-semibold">Aún no tienes inversiones activas</h3>
                      <p className="mx-auto mt-2 max-w-md text-[11px] leading-5 text-white/40">Consulta los lotes publicados de CTG Craft Beer y sus condiciones vigentes.</p>
                      <Link href="/inversion/lotes" className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-[#e3b653] px-4 text-xs font-bold text-[#171207]">Explorar lotes <ArrowRight size={15} /></Link>
                    </div>
                  )}
                </div>
              </section>

              <section id="actividad" className="rounded-2xl border border-white/[0.08] bg-[#0b0e10] p-4">
                <div className="flex items-end justify-between gap-2">
                  <div>
                    <h2 className="font-outfit text-2xl font-semibold tracking-[-.03em]">Actividad reciente</h2>
                    <p className="mt-1 text-[11px] text-white/42">Últimos movimientos de tu cuenta.</p>
                  </div>
                  <Link href="/dashboard/wallet" className="text-[11px] font-semibold text-[#e3b653]">Ver todo</Link>
                </div>

                {transactionState === 'error' ? (
                  <ReadErrorPanel label="No pudimos cargar los movimientos recientes." onRetry={() => void retryAccountReads()} retrying={retrying} className="mt-4" />
                ) : transactionsLoading ? (
                  <div className="mt-4 py-10 text-center text-xs text-white/35">Sincronizando movimientos…</div>
                ) : (
                  <div className="mt-4 divide-y divide-white/[0.07]">
                    {activities.length > 0 ? activities.slice(0, 4).map((item) => (
                      <div key={item.id} className="flex items-center gap-3 py-3.5">
                        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border ${item.positive ? 'border-emerald-400/15 bg-emerald-400/[.08] text-emerald-300' : 'border-[#e3b653]/15 bg-[#e3b653]/[.06] text-[#e3b653]'}`}>
                          {item.positive ? <ArrowUpRight size={16} /> : <BarChart3 size={16} />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <strong className="block truncate text-xs font-medium">{item.title}</strong>
                          <span className="mt-1 block text-[9px] text-white/32">{item.date} · <span className={item.statusCode === 'approved' ? 'text-emerald-300/80' : item.statusCode === 'rejected' ? 'text-rose-300/80' : 'text-amber-200/80'}>{item.status}</span></span>
                        </div>
                        <strong className={`text-xs ${item.positive ? 'text-emerald-300' : 'text-white/75'}`}>{item.amount}</strong>
                      </div>
                    )) : (
                      <div className="py-10 text-center text-xs text-white/35">No hay movimientos recientes.</div>
                    )}
                  </div>
                )}
              </section>
            </div>

            {!kycVerified ? (
              <section className="mt-4 flex flex-col gap-3 rounded-2xl border border-[#e3b653]/20 bg-[linear-gradient(90deg,rgba(227,182,83,.09),rgba(11,14,16,.98))] px-4 py-3 sm:flex-row sm:items-center">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#e3b653]/20 bg-[#e3b653]/[.07] text-[#e3b653]"><ShieldCheck size={18} /></span>
                <div className="min-w-0 flex-1">
                  <strong className="block text-xs">Completa tu verificación de identidad</strong>
                  <p className="mt-1 text-[10px] text-white/42">Habilita todas las funciones financieras y de inversión de tu cuenta.</p>
                </div>
                <Link href="/dashboard/kyc" className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-[#e3b653]/35 px-4 text-xs font-semibold text-[#f0c668]">Verificar ahora <ArrowRight size={15} /></Link>
              </section>
            ) : null}
          </div>
        </main>
      </div>

      <MobileBottomNav />
    </div>
  );
}

function SummaryCard({ icon, title, value, children, href, accent = false }: { icon: ReactNode; title: string; value: string; children?: ReactNode; href?: string; accent?: boolean }) {
  const content = (
    <div className={`relative h-full min-h-[152px] overflow-hidden rounded-2xl border p-4 ${accent ? 'border-emerald-400/15 bg-[radial-gradient(circle_at_12%_20%,rgba(52,211,153,.11),transparent_32%),#0b0e10]' : 'border-white/[0.08] bg-[#0b0e10]'}`}>
      <div className="flex items-start gap-3">
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl border ${accent ? 'border-emerald-400/15 bg-emerald-400/[.07] text-emerald-300' : 'border-[#e3b653]/15 bg-[#e3b653]/[.055] text-[#e3b653]'}`}>{icon}</span>
        <div className="min-w-0 flex-1">
          <span className="text-[11px] text-white/47">{title}</span>
          <strong className={`mt-1 block truncate font-outfit text-[clamp(1.35rem,2vw,2rem)] font-semibold tracking-[-.03em] ${value === 'No disponible' ? 'text-amber-200' : accent ? 'text-emerald-300' : 'text-white'}`}>{value}</strong>
        </div>
        {href ? <ChevronRight size={17} className="mt-2 text-white/25" /> : null}
      </div>
      {children}
    </div>
  );
  return href ? <Link href={href} className="block transition hover:-translate-y-0.5">{content}</Link> : content;
}

function OpportunityPlaceholder({ icon }: { icon: ReactNode }) {
  return (
    <div className="flex min-h-[220px] flex-col justify-between rounded-2xl border border-white/[0.08] bg-[linear-gradient(150deg,#111417,#090b0d)] p-4">
      <span className="grid h-14 w-14 place-items-center rounded-2xl border border-white/[0.08] bg-white/[0.025] text-white/35">{icon}</span>
      <div>
        <span className="inline-flex rounded-full border border-white/[0.09] bg-white/[0.035] px-2.5 py-1 text-[9px] text-white/45">Próximamente</span>
        <h3 className="mt-3 text-sm font-semibold">Próxima oportunidad</h3>
        <p className="mt-1 text-[10px] leading-5 text-white/38">Nuevas alternativas de inversión estarán disponibles aquí.</p>
      </div>
      <span className="mt-4 inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-white/[0.1] text-[10px] font-semibold text-white/55">Conocer más <ArrowRight size={13} /></span>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="block text-[9px] text-white/35">{label}</span>
      <strong className="mt-1 block text-sm font-semibold">{value}</strong>
    </div>
  );
}

function ReadErrorPanel({ label, onRetry, retrying, className = '' }: { label: string; onRetry: () => void; retrying: boolean; className?: string }) {
  return (
    <div className={`rounded-2xl border border-amber-300/15 bg-amber-300/[0.04] p-5 text-center ${className}`}>
      <AlertTriangle size={20} className="mx-auto text-amber-200" />
      <p className="mt-3 text-xs text-white/55">{label}</p>
      <button type="button" onClick={onRetry} disabled={retrying} className="mt-3 inline-flex h-9 items-center gap-2 rounded-xl border border-white/10 px-3 text-[10px] font-semibold text-white/70 disabled:opacity-50">
        <RefreshCw size={13} className={retrying ? 'animate-spin' : ''} /> Reintentar
      </button>
    </div>
  );
}

function DesktopSidebar({ notifications }: { notifications: number }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-50 hidden w-[248px] flex-col border-r border-white/[0.08] bg-[#07090b] px-3 pb-5 pt-5 lg:flex">
      <div className="px-3"><BrandLogo priority /></div>
      <nav className="mt-10 flex flex-col gap-1">
        <SidebarItem href="/dashboard" icon={<Home size={18} />} label="Inicio" active />
        <SidebarItem href="/inversion/lotes" icon={<BarChart3 size={18} />} label="Invertir" />
        <SidebarItem href="/inversion/app" icon={<TrendingUp size={18} />} label="Mi portafolio" />
        <SidebarItem href="/dashboard/wallet" icon={<WalletCards size={18} />} label="Wallet" />
        <SidebarItem href="/products" icon={<Compass size={18} />} label="Explorar" />
        <SidebarItem href="/dashboard/educacion" icon={<GraduationCap size={18} />} label="Educación" />
      </nav>
      <div className="mx-3 my-4 h-px bg-white/[0.07]" />
      <nav className="flex flex-col gap-1">
        <SidebarItem href="#actividad" icon={<Bell size={18} />} label="Notificaciones" badge={notifications} />
        <SidebarItem href="/dashboard/seguridad/mfa" icon={<UserRound size={18} />} label="Perfil y seguridad" />
        <SidebarItem href="/contact" icon={<CircleHelp size={18} />} label="Ayuda" />
      </nav>
      <div className="mt-auto rounded-2xl border border-[#e3b653]/20 bg-[linear-gradient(145deg,rgba(227,182,83,.08),rgba(9,11,13,.98))] p-4">
        <span className="text-[9px] font-semibold uppercase tracking-[.18em] text-[#e3b653]">CTG One</span>
        <p className="mt-3 text-xs leading-5 text-white/45">Tu dinero, tus oportunidades, tu ecosistema.</p>
      </div>
    </aside>
  );
}

function SidebarItem({ href, icon, label, active = false, badge = 0 }: { href: string; icon: ReactNode; label: string; active?: boolean; badge?: number }) {
  return (
    <Link href={href} className={`flex h-12 items-center gap-3 rounded-xl px-3 text-xs transition ${active ? 'border border-[#e3b653]/25 bg-[#e3b653]/[.08] font-semibold text-white' : 'text-white/55 hover:bg-white/[0.035] hover:text-white/80'}`}>
      <span className={active ? 'text-[#e3b653]' : 'text-white/45'}>{icon}</span>
      <span>{label}</span>
      {badge > 0 ? <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-[#e3b653] px-1 text-[9px] font-black text-[#171207]">{badge}</span> : null}
    </Link>
  );
}

function MobileNav({ onClose, notifications }: { onClose: () => void; notifications: number }) {
  return (
    <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm lg:hidden" role="dialog" aria-modal="true">
      <div className="h-full w-[84%] max-w-[330px] border-r border-white/[0.08] bg-[#080a0c] p-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <BrandLogo priority />
          <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-xl border border-white/[0.08] text-white/60"><X size={18} /></button>
        </div>
        <nav className="mt-8 flex flex-col gap-1" onClick={onClose}>
          <SidebarItem href="/dashboard" icon={<Home size={18} />} label="Inicio" active />
          <SidebarItem href="/inversion/lotes" icon={<BarChart3 size={18} />} label="Invertir" />
          <SidebarItem href="/inversion/app" icon={<TrendingUp size={18} />} label="Mi portafolio" />
          <SidebarItem href="/dashboard/wallet" icon={<WalletCards size={18} />} label="Wallet" />
          <SidebarItem href="/products" icon={<Compass size={18} />} label="Explorar" />
          <SidebarItem href="/dashboard/educacion" icon={<GraduationCap size={18} />} label="Educación" />
          <SidebarItem href="#actividad" icon={<Bell size={18} />} label="Notificaciones" badge={notifications} />
          <SidebarItem href="/dashboard/seguridad/mfa" icon={<UserRound size={18} />} label="Perfil y seguridad" />
          <SidebarItem href="/contact" icon={<CircleHelp size={18} />} label="Ayuda" />
        </nav>
      </div>
    </div>
  );
}

function MobileBottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 grid h-[72px] grid-cols-5 border-t border-white/[0.08] bg-[#080a0c]/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
      <MobileNavItem href="/dashboard" icon={<Home size={19} />} label="Inicio" active />
      <MobileNavItem href="/inversion/app" icon={<BarChart3 size={19} />} label="Portafolio" />
      <Link href="/inversion/lotes" className="relative flex flex-col items-center justify-center gap-1 text-[9px] font-semibold text-[#e3b653]">
        <span className="absolute -top-5 grid h-12 w-12 place-items-center rounded-2xl border border-[#f2cc72]/40 bg-[#e3b653] text-[#171207] shadow-[0_10px_35px_rgba(227,182,83,.25)]"><Plus size={22} /></span>
        <span className="mt-7">Invertir</span>
      </Link>
      <MobileNavItem href="/dashboard/wallet" icon={<WalletCards size={19} />} label="Wallet" />
      <MobileNavItem href="/products" icon={<Compass size={19} />} label="Explorar" />
    </nav>
  );
}

function MobileNavItem({ href, icon, label, active = false }: { href: string; icon: ReactNode; label: string; active?: boolean }) {
  return (
    <Link href={href} className={`flex flex-col items-center justify-center gap-1 text-[9px] ${active ? 'text-[#e3b653]' : 'text-white/42'}`}>
      {icon}
      <span>{label}</span>
    </Link>
  );
}
