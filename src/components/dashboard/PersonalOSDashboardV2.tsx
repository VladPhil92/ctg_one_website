'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  BookOpenCheck,
  Check,
  ChevronRight,
  CircleHelp,
  Compass,
  GraduationCap,
  Home,
  LogOut,
  Menu,
  Package,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  UserRoundCheck,
  WalletCards,
  X,
} from 'lucide-react';

import { BrandLogo } from '@/components/BrandLogo';
import { useAuth } from '@/contexts/AuthContext';
import { DASHBOARD_HERO_IMAGE } from '@/data/dashboardHeroImage';
import { useAccountTransactions } from '@/hooks/useAccountTransactions';
import { useEducationActivationSummary } from '@/hooks/useEducationActivationSummary';
import { useInvestmentSummary } from '@/hooks/useInvestmentSummary';
import { useWallet } from '@/hooks/useWallet';
import {
  buildAccountActivationPlan,
  type AccountActivationAction,
} from '@/lib/account/activation';
import { trackFunnelEvent } from '@/lib/analytics/client';
import { formatCents } from '@/lib/format';

const KYC_COPY = {
  not_submitted: { label: 'Pendiente', detail: 'Verificación no iniciada', tone: 'text-white/55' },
  pending: { label: 'En revisión', detail: 'Documentos en validación', tone: 'text-amber-300' },
  verified: { label: 'Verificada', detail: 'Identidad confiable', tone: 'text-emerald-300' },
  rejected: { label: 'Atención', detail: 'Requiere corrección', tone: 'text-rose-300' },
} as const;

function transactionLabel(type: string) {
  const labels: Record<string, string> = {
    deposit: 'Recarga de cuenta',
    withdrawal: 'Retiro',
    investment: 'Inversión realizada',
    payment: 'Pago realizado',
    purchase: 'Compra',
    refund: 'Reembolso',
    adjustment: 'Ajuste de cuenta',
  };
  return labels[type] ?? type.replaceAll('_', ' ');
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

function resolveDashboardSearch(query: string) {
  const normalized = query.toLocaleLowerCase('es-CO');
  const destinations = [
    { tokens: ['wallet', 'saldo', 'movimiento', 'activo'], href: '/dashboard/wallet' },
    { tokens: ['invertir', 'inversion', 'inversión', 'cerveza', 'lote'], href: '/inversion/app' },
    { tokens: ['educacion', 'educación', 'curso', 'aprender', 'campus'], href: '/dashboard/educacion' },
    { tokens: ['identidad', 'kyc', 'verificar', 'verificación'], href: '/dashboard/kyc' },
    { tokens: ['nvet', 'veterinaria', 'veterinario', 'mascota'], href: '/nvetcareapp' },
    { tokens: ['servicio', 'servicios'], href: '/services' },
    { tokens: ['seguridad', 'mfa', 'configuración', 'configuracion'], href: '/dashboard/seguridad/mfa' },
    { tokens: ['ayuda', 'soporte', 'contacto'], href: '/contact' },
    { tokens: ['producto', 'productos', 'tienda'], href: '/products' },
  ];
  return destinations.find((item) => item.tokens.some((token) => normalized.includes(token)))?.href ?? '/products';
}

export default function PersonalOSDashboardV2() {
  const { profile, email, isAuthenticated, isLoading, signOut } = useAuth();
  const { wallet, isLoading: walletLoading } = useWallet();
  const { summary: investment, isLoading: investmentLoading } = useInvestmentSummary();
  const { transactions, isLoading: transactionsLoading } = useAccountTransactions(5);
  const { summary: education } = useEducationActivationSummary();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const trackedDashboardView = useRef(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/iniciar-sesion?next=/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (!isAuthenticated || trackedDashboardView.current) return;
    trackedDashboardView.current = true;
    void trackFunnelEvent('dashboard_viewed', { sourcePath: '/dashboard' });
  }, [isAuthenticated]);

  const firstName = profile?.full_name?.trim().split(/\s+/)[0] || 'Usuario';
  const displayName = profile?.full_name?.trim() || firstName;
  const accountEmail = profile?.email ?? email ?? '';
  const kycStatus = profile?.kyc_status ?? 'not_submitted';
  const kyc = KYC_COPY[kycStatus];
  const activationLoading = walletLoading || investmentLoading || transactionsLoading || education.state === 'loading';

  const activation = buildAccountActivationPlan({
    hasProfile: Boolean(profile),
    hasCompleteProfile: Boolean(profile?.full_name && accountEmail),
    kycStatus,
    walletReady: Boolean(wallet),
    transactionCount: transactions.length,
    investmentAllocationCount: investment.allocations.length,
    education,
  });

  const ecosystemStates = [
    {
      icon: ShieldCheck,
      label: 'Identidad',
      value: kyc.label,
      detail: kyc.detail,
      href: '/dashboard/kyc',
      tone: kyc.tone,
      ready: kycStatus === 'verified',
    },
    {
      icon: WalletCards,
      label: 'Wallet',
      value: walletLoading ? 'Sincronizando' : wallet ? 'Activa' : 'Pendiente',
      detail: wallet ? formatCents(wallet.balance_cents, wallet.currency) : 'Aún sin Wallet vinculada',
      href: '/dashboard/wallet',
      tone: wallet ? 'text-emerald-300' : 'text-white/55',
      ready: Boolean(wallet),
    },
    {
      icon: GraduationCap,
      label: 'Educación',
      value: education.state === 'loading' ? 'Sincronizando' : education.state === 'error' ? 'No disponible' : education.activeEntitlements > 0 || education.activeLearning > 0 ? 'Activa' : 'Disponible',
      detail: education.state === 'error'
        ? 'No fue posible leer Education OS'
        : education.activeLearning > 0
          ? `${education.activeLearning} curso${education.activeLearning === 1 ? '' : 's'} en progreso`
          : `${education.activeEntitlements} acceso${education.activeEntitlements === 1 ? '' : 's'} activo${education.activeEntitlements === 1 ? '' : 's'}`,
      href: '/dashboard/educacion',
      tone: education.state === 'error' ? 'text-rose-300' : education.activeLearning > 0 || education.activeEntitlements > 0 ? 'text-emerald-300' : 'text-white/55',
      ready: education.state === 'ready' && (education.activeEntitlements > 0 || education.activeLearning > 0),
    },
    {
      icon: BarChart3,
      label: 'Inversión',
      value: investmentLoading ? 'Sincronizando' : investment.allocations.length > 0 ? 'Activa' : 'Opcional',
      detail: investment.allocations.length > 0
        ? `${investment.allocations.length} participación${investment.allocations.length === 1 ? '' : 'es'}`
        : 'Sin participaciones activas',
      href: '/inversion/app',
      tone: investment.allocations.length > 0 ? 'text-emerald-300' : 'text-white/55',
      ready: investment.allocations.length > 0,
    },
  ];

  const notifications = [
    kycStatus !== 'verified'
      ? { title: 'Identidad pendiente', body: kyc.detail, href: '/dashboard/kyc' }
      : null,
    education.pendingOrders > 0
      ? { title: 'Educación requiere atención', body: `${education.pendingOrders} orden${education.pendingOrders === 1 ? '' : 'es'} pendiente${education.pendingOrders === 1 ? '' : 's'}.`, href: '/dashboard/educacion' }
      : null,
    investment.allocations.length > 0
      ? { title: 'Participaciones activas', body: 'Consulta el seguimiento operativo de tus lotes.', href: '/inversion/app' }
      : null,
  ].filter((item): item is { title: string; body: string; href: string } => Boolean(item));

  const handleActivationClick = (item: AccountActivationAction) => {
    if (!item.serviceKey) return;
    void trackFunnelEvent('first_service_used', {
      sourcePath: '/dashboard',
      serviceKey: item.serviceKey,
    });
  };

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#050607] text-white" aria-live="polite">
        <div className="flex flex-col items-center gap-4">
          <span className="grid h-16 w-16 place-items-center rounded-2xl border border-[#d8ad4f]/30 bg-[#d8ad4f]/[.06] text-[#e6ba59]">
            <Sparkles className="animate-pulse" aria-hidden="true" />
          </span>
          <span className="text-xs text-white/45">Preparando tu Personal OS…</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = searchTerm.trim();
    router.push(query ? resolveDashboardSearch(query) : '/products');
  }

  return (
    <div className="min-h-screen bg-[#07090b] text-white [--ctg-gold:#e3b653]">
      <DesktopSidebar notifications={notifications.length} />

      <div className="min-h-screen lg:ml-[248px]">
        <header className="sticky top-0 z-40 flex min-h-16 items-center gap-3 border-b border-white/[0.08] bg-[#07090b]/95 px-4 backdrop-blur-xl sm:px-6">
          <button
            type="button"
            className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/[0.025] lg:hidden"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Abrir navegación"
          >
            <Menu size={19} />
          </button>
          <div className="lg:hidden"><BrandLogo priority compact /></div>

          <form className="ml-1 hidden h-10 w-full max-w-[560px] items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.025] px-3 md:flex" onSubmit={handleSearch} role="search">
            <Search size={16} className="text-white/45" aria-hidden="true" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar Wallet, educación, inversión, identidad…"
              aria-label="Buscar en Personal OS"
              className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-white/35"
            />
          </form>

          <div className="ml-auto flex items-center gap-2.5">
            <a href="#notifications" className="relative grid h-10 w-10 place-items-center rounded-xl text-white/65 hover:bg-white/[0.04]" aria-label={`${notifications.length} notificaciones`}>
              <Bell size={18} />
              {notifications.length > 0 ? <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-[#e3b653] px-1 text-[8px] font-black text-[#151006]">{notifications.length}</span> : null}
            </a>
            <div className="hidden min-w-0 sm:block">
              <strong className="block max-w-[150px] truncate text-xs font-medium">{displayName}</strong>
              <small className="block max-w-[150px] truncate text-[9px] text-white/35">{accountEmail}</small>
            </div>
            <button type="button" onClick={() => void signOut()} className="grid h-10 w-10 place-items-center rounded-xl text-white/45 transition hover:bg-white/[0.04] hover:text-white" aria-label="Cerrar sesión">
              <LogOut size={17} />
            </button>
          </div>
        </header>

        {mobileNavOpen ? <MobileNav onClose={() => setMobileNavOpen(false)} notifications={notifications.length} /> : null}

        <main>
          <section
            className="relative isolate overflow-hidden border-b border-white/[0.08] px-4 py-10 sm:px-6 sm:py-14 xl:px-8"
            style={{
              backgroundImage: `linear-gradient(90deg,#07090b 0%,rgba(7,9,11,.9) 35%,rgba(7,9,11,.52) 66%,rgba(7,9,11,.84) 100%),url('${DASHBOARD_HERO_IMAGE}')`,
              backgroundPosition: 'center 52%',
              backgroundSize: 'cover',
            }}
            aria-labelledby="dashboard-title"
          >
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_72%_45%,rgba(227,182,83,.14),transparent_34%)]" />
            <div className="max-w-[880px]">
              <div className="flex flex-wrap items-center gap-2 text-[9px] font-semibold uppercase tracking-[.22em] text-white/50">
                <span className="h-1.5 w-1.5 rounded-full bg-[#e3b653] shadow-[0_0_12px_rgba(227,182,83,.8)]" />
                Personal OS v2
                <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1 tracking-[.12em] text-white/40">{activation.phase}</span>
              </div>
              <h1 id="dashboard-title" className="mt-4 max-w-3xl font-outfit text-5xl font-semibold leading-[.92] tracking-[-.055em] sm:text-6xl xl:text-7xl">
                Hola, {firstName}<span className="text-[#e3b653]">.</span>
              </h1>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-white/62 sm:text-base">
                Tu cuenta ya no es un directorio. Personal OS interpreta identidad, Wallet, educación, inversión y actividad para mostrarte qué tiene más sentido hacer ahora.
              </p>
            </div>
          </section>

          <div className="mx-auto max-w-[1540px] px-3 py-4 sm:px-5 sm:py-5 xl:px-7">
            <section className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,.7fr)]" aria-labelledby="activation-title">
              <article className="relative isolate overflow-hidden rounded-3xl border border-[#e3b653]/25 bg-[linear-gradient(135deg,rgba(227,182,83,.12),rgba(15,18,20,.98)_42%,#0b0e10)] p-5 shadow-[0_20px_70px_rgba(0,0,0,.28)] sm:p-7">
                <div className="absolute -right-20 -top-24 -z-10 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(227,182,83,.24),transparent_68%)]" />
                <p className="text-[9px] font-bold uppercase tracking-[.2em] text-[#e3b653]">{activation.primary.eyebrow}</p>
                <h2 id="activation-title" className="mt-3 max-w-3xl font-outfit text-3xl font-semibold tracking-[-.035em] sm:text-4xl">{activation.headline}</h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-white/50">{activation.summary}</p>

                <div className="mt-7 rounded-2xl border border-white/[0.09] bg-black/20 p-4 sm:p-5">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                    <div className="max-w-2xl">
                      <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-white/35">Tu siguiente mejor acción</p>
                      <h3 className="mt-2 font-outfit text-2xl font-semibold tracking-[-.025em]">{activation.primary.title}</h3>
                      <p className="mt-2 text-xs leading-6 text-white/48">{activation.primary.description}</p>
                    </div>
                    {activationLoading ? (
                      <span className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.035] px-5 text-xs text-white/45">Sincronizando estado…</span>
                    ) : (
                      <Link
                        href={activation.primary.href}
                        onClick={() => handleActivationClick(activation.primary)}
                        className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-[linear-gradient(180deg,#efc96b,#ddb054)] px-5 text-xs font-bold text-[#171006] transition hover:-translate-y-0.5"
                      >
                        {activation.primary.cta} <ArrowRight size={15} />
                      </Link>
                    )}
                  </div>
                </div>

                <div className="mt-5 grid gap-2 sm:grid-cols-3">
                  {activation.secondary.map((item) => (
                    <Link key={`${item.key}-${item.href}`} href={item.href} onClick={() => handleActivationClick(item)} className="group rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 transition hover:border-[#e3b653]/25 hover:bg-[#e3b653]/[0.035]">
                      <div className="flex items-start justify-between gap-2"><span className="text-[9px] font-semibold uppercase tracking-[.14em] text-white/35">{item.eyebrow}</span><ArrowUpRight size={13} className="text-white/25 transition group-hover:text-[#e3b653]" /></div>
                      <strong className="mt-3 block text-xs font-medium">{item.title}</strong>
                    </Link>
                  ))}
                </div>
              </article>

              <article className="rounded-3xl border border-white/10 bg-[linear-gradient(145deg,#111416,#0b0e10)] p-5 sm:p-6">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-[.18em] text-white/35">Activación</p>
                    <h2 className="mt-2 font-outfit text-2xl font-semibold">Estado de tu cuenta</h2>
                  </div>
                  <strong className="font-mono text-lg text-[#e3b653]">{activationLoading ? '—' : `${activation.progressPercent}%`}</strong>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.07]" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={activationLoading ? undefined : activation.progressPercent} aria-label="Progreso de activación de la cuenta">
                  <span className="block h-full rounded-full bg-[linear-gradient(90deg,#e1b24d,#f0c76a)] transition-[width]" style={{ width: `${activationLoading ? 0 : activation.progressPercent}%` }} />
                </div>
                <p className="mt-3 text-[10px] leading-5 text-white/40">
                  {activationLoading ? 'Sincronizando tus contextos…' : `${activation.completedMilestones} de ${activation.totalMilestones} hitos de activación detectados.`}
                </p>
                <div className="mt-5 space-y-2">
                  {ecosystemStates.map((state) => (
                    <Link key={state.label} href={state.href} className="group grid grid-cols-[38px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-white/[0.07] bg-black/15 p-3 transition hover:border-white/[0.14]">
                      <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/[0.035] text-[#e3b653]"><state.icon size={17} /></span>
                      <span className="min-w-0"><strong className="block text-[10px] font-medium">{state.label}</strong><small className="mt-1 block truncate text-[8px] text-white/35">{state.detail}</small></span>
                      <span className={`text-[9px] font-semibold ${state.tone}`}>{state.value}</span>
                    </Link>
                  ))}
                </div>
              </article>
            </section>

            <section className="mt-5" aria-labelledby="spaces-title">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div><p className="text-[9px] font-semibold uppercase tracking-[.19em] text-white/30">Tus espacios</p><h2 id="spaces-title" className="mt-2 font-outfit text-2xl font-semibold">Accede según tu contexto</h2></div>
                <Link href="/products" className="inline-flex min-h-10 items-center gap-2 text-[10px] font-semibold text-white/55 hover:text-[#e3b653]">Explorar todo <ArrowRight size={13} /></Link>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <WorkspaceCard href="/dashboard/wallet" icon={<WalletCards size={21} />} title="Wallet" eyebrow="Cuenta" description={wallet ? `Saldo: ${formatCents(wallet.balance_cents, wallet.currency)}` : 'Activa y administra tu Wallet.'} />
                <WorkspaceCard href="/dashboard/educacion" icon={<BookOpenCheck size={21} />} title="Education OS" eyebrow="Aprendizaje" description={education.activeLearning > 0 ? `${education.activeLearning} curso${education.activeLearning === 1 ? '' : 's'} en progreso.` : 'Cursos, accesos, biblioteca y progreso.'} />
                <WorkspaceCard href="/inversion/app" icon={<BarChart3 size={21} />} title="Inversión" eyebrow="Capital" description={investment.allocations.length > 0 ? `${investment.allocations.length} participación${investment.allocations.length === 1 ? '' : 'es'} activa${investment.allocations.length === 1 ? '' : 's'}.` : 'Explora oportunidades publicadas.'} />
                <WorkspaceCard href="/dashboard/kyc" icon={<UserRoundCheck size={21} />} title="Identidad" eyebrow="Confianza" description={`${kyc.label}. ${kyc.detail}.`} />
              </div>
            </section>

            <section className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,.55fr)]">
              <article className="overflow-hidden rounded-3xl border border-white/10 bg-[linear-gradient(145deg,#111416,#0b0e10)]">
                <div className="flex items-end justify-between gap-3 border-b border-white/[0.07] px-5 py-4 sm:px-6">
                  <div><p className="text-[9px] font-semibold uppercase tracking-[.18em] text-white/30">Memoria operativa</p><h2 className="mt-2 font-outfit text-xl font-semibold">Actividad reciente</h2></div>
                  <Link href="/dashboard/wallet" className="inline-flex items-center gap-1.5 text-[9px] text-white/50 hover:text-[#e3b653]">Ver movimientos <ArrowRight size={12} /></Link>
                </div>
                {transactionsLoading ? (
                  <div className="px-6 py-12 text-center text-xs text-white/35">Sincronizando actividad…</div>
                ) : transactions.length > 0 ? (
                  <div className="px-4 py-2 sm:px-5">
                    {transactions.map((transaction) => (
                      <div key={transaction.id} className="grid min-h-[64px] grid-cols-[38px_minmax(0,1fr)_auto] items-center gap-3 border-b border-white/[0.055] last:border-0">
                        <span className="grid h-9 w-9 place-items-center rounded-xl border border-[#e3b653]/15 bg-[#e3b653]/[0.05] text-[#e3b653]"><Activity size={16} /></span>
                        <div className="min-w-0"><strong className="block truncate text-[10px] font-medium">{transactionLabel(transaction.type)}</strong><small className="mt-1 block text-[8px] text-white/35">{formatActivityDate(transaction.created_at)} · {transaction.status}</small></div>
                        <strong className="text-[10px] font-medium text-white/70">{formatCents(transaction.amount_cents)}</strong>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-6 py-12 text-center"><Sparkles size={22} className="mx-auto text-[#e3b653]" /><strong className="mt-3 block text-xs">Aún no hay movimientos.</strong><p className="mx-auto mt-2 max-w-md text-[10px] leading-5 text-white/35">Personal OS no inventa actividad: este espacio se llenará cuando exista una acción real vinculada a tu cuenta.</p></div>
                )}
              </article>

              <aside id="notifications" className="rounded-3xl border border-white/10 bg-[linear-gradient(145deg,#111416,#0b0e10)] p-5 sm:p-6">
                <div className="flex items-center justify-between"><div><p className="text-[9px] font-semibold uppercase tracking-[.18em] text-white/30">Atención</p><h2 className="mt-2 font-outfit text-xl font-semibold">Notificaciones útiles</h2></div><Bell size={18} className="text-[#e3b653]" /></div>
                <div className="mt-4 space-y-2">
                  {notifications.length > 0 ? notifications.map((notification) => (
                    <Link href={notification.href} key={notification.title} className="group grid grid-cols-[7px_minmax(0,1fr)_auto] items-start gap-3 rounded-xl border border-white/[0.06] bg-black/15 p-3">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#e3b653]" />
                      <span><strong className="block text-[9px] font-semibold">{notification.title}</strong><small className="mt-1 block text-[8px] leading-4 text-white/35">{notification.body}</small></span>
                      <ArrowUpRight size={12} className="text-white/20 group-hover:text-[#e3b653]" />
                    </Link>
                  )) : <p className="rounded-xl border border-emerald-400/10 bg-emerald-400/[0.03] p-4 text-[10px] leading-5 text-emerald-200/70">No detectamos acciones urgentes en los contextos disponibles.</p>}
                </div>
                <Link href="/contact" className="mt-4 flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 text-[9px] font-semibold text-white/55 hover:border-[#e3b653]/25 hover:text-[#e3b653]"><CircleHelp size={14} /> Solicitar soporte</Link>
              </aside>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

function DesktopSidebar({ notifications }: { notifications: number }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-50 hidden w-[248px] flex-col border-r border-white/[0.08] bg-[#080a0b] px-3 py-5 lg:flex">
      <Link href="/dashboard" className="px-3 py-2" aria-label="CTG One Personal OS"><BrandLogo priority className="origin-left scale-[1.04]" /></Link>
      <p className="mt-6 px-3 text-[8px] font-semibold uppercase tracking-[.2em] text-white/25">Personal OS</p>
      <nav className="mt-2 space-y-1">
        <NavItem href="/dashboard" icon={<Home size={17} />} label="Inicio" active />
        <NavItem href="/dashboard/wallet" icon={<WalletCards size={17} />} label="Wallet" />
        <NavItem href="/dashboard/educacion" icon={<GraduationCap size={17} />} label="Educación" />
        <NavItem href="/inversion/app" icon={<BarChart3 size={17} />} label="Inversiones" />
        <NavItem href="/dashboard/kyc" icon={<ShieldCheck size={17} />} label="Identidad" />
      </nav>
      <p className="mt-5 px-3 text-[8px] font-semibold uppercase tracking-[.2em] text-white/25">Ecosistema</p>
      <nav className="mt-2 space-y-1">
        <NavItem href="/products" icon={<Compass size={17} />} label="Explorar" />
        <NavItem href="#notifications" icon={<Bell size={17} />} label="Notificaciones" badge={notifications} />
        <NavItem href="/dashboard/seguridad/mfa" icon={<Settings size={17} />} label="Seguridad" />
        <NavItem href="/contact" icon={<CircleHelp size={17} />} label="Soporte" />
      </nav>
      <div className="mt-auto rounded-2xl border border-[#e3b653]/15 bg-[#e3b653]/[0.035] p-4">
        <p className="text-[9px] font-semibold text-[#e3b653]">CTG One</p>
        <p className="mt-2 text-[8px] leading-4 text-white/35">Una identidad. Contextos reales. La siguiente acción correcta.</p>
      </div>
    </aside>
  );
}

function MobileNav({ onClose, notifications }: { onClose: () => void; notifications: number }) {
  return (
    <div className="fixed inset-0 z-[80] bg-black/70 p-3 backdrop-blur-sm lg:hidden" role="dialog" aria-modal="true" aria-label="Navegación Personal OS">
      <div className="ml-auto flex h-full w-full max-w-sm flex-col rounded-2xl border border-white/10 bg-[#090b0d] p-4 shadow-2xl">
        <div className="flex items-center justify-between"><BrandLogo compact /><button type="button" onClick={onClose} className="grid h-11 w-11 place-items-center rounded-xl border border-white/10" aria-label="Cerrar navegación"><X size={18} /></button></div>
        <nav className="mt-7 space-y-1">
          <NavItem href="/dashboard" icon={<Home size={17} />} label="Inicio" active onClick={onClose} />
          <NavItem href="/dashboard/wallet" icon={<WalletCards size={17} />} label="Wallet" onClick={onClose} />
          <NavItem href="/dashboard/educacion" icon={<GraduationCap size={17} />} label="Educación" onClick={onClose} />
          <NavItem href="/inversion/app" icon={<BarChart3 size={17} />} label="Inversiones" onClick={onClose} />
          <NavItem href="/dashboard/kyc" icon={<ShieldCheck size={17} />} label="Identidad" onClick={onClose} />
          <NavItem href="#notifications" icon={<Bell size={17} />} label="Notificaciones" badge={notifications} onClick={onClose} />
          <NavItem href="/products" icon={<Compass size={17} />} label="Explorar" onClick={onClose} />
        </nav>
      </div>
    </div>
  );
}

function NavItem({ href, icon, label, active = false, badge = 0, onClick }: { href: string; icon: ReactNode; label: string; active?: boolean; badge?: number; onClick?: () => void }) {
  return (
    <Link href={href} onClick={onClick} className={`flex min-h-11 items-center gap-3 rounded-xl border px-3 text-[11px] transition ${active ? 'border-[#e3b653]/25 bg-[#e3b653]/[0.07] text-white' : 'border-transparent text-white/55 hover:bg-white/[0.035] hover:text-white'}`} aria-current={active ? 'page' : undefined}>
      <span className={active ? 'text-[#e3b653]' : 'text-white/45'}>{icon}</span><span>{label}</span>{badge > 0 ? <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-[#e3b653] px-1 text-[8px] font-black text-[#151006]">{badge}</span> : null}
    </Link>
  );
}

function WorkspaceCard({ href, icon, title, eyebrow, description }: { href: string; icon: ReactNode; title: string; eyebrow: string; description: string }) {
  return (
    <Link href={href} className="group min-h-[145px] rounded-2xl border border-white/10 bg-[linear-gradient(145deg,#111416,#0b0e10)] p-5 transition hover:-translate-y-0.5 hover:border-[#e3b653]/25">
      <div className="flex items-start justify-between"><span className="grid h-10 w-10 place-items-center rounded-xl border border-[#e3b653]/15 bg-[#e3b653]/[0.05] text-[#e3b653]">{icon}</span><ChevronRight size={15} className="text-white/20 transition group-hover:translate-x-0.5 group-hover:text-[#e3b653]" /></div>
      <p className="mt-5 text-[8px] font-semibold uppercase tracking-[.17em] text-white/28">{eyebrow}</p>
      <h3 className="mt-1 font-outfit text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-[9px] leading-4 text-white/38">{description}</p>
    </Link>
  );
}
