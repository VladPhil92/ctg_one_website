'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FormEvent, ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  Bell,
  Box,
  Check,
  ChevronDown,
  Circle,
  CircleHelp,
  Compass,
  Globe2,
  Headphones,
  Home,
  LogOut,
  Package,
  PawPrint,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  WalletCards,
} from 'lucide-react';

import { BrandLogo } from '@/components/BrandLogo';
import { useAuth } from '@/contexts/AuthContext';
import { useAccountTransactions } from '@/hooks/useAccountTransactions';
import { useInvestmentSummary } from '@/hooks/useInvestmentSummary';
import { useWallet } from '@/hooks/useWallet';
import { formatCents } from '@/lib/format';

const KYC_LABELS: Record<string, { label: string; tone: string }> = {
  not_submitted: { label: 'Pendiente', tone: '#9ca3af' },
  pending: { label: 'En revisión', tone: '#e3b653' },
  verified: { label: 'Verificado', tone: '#42d89b' },
  rejected: { label: 'Requiere atención', tone: '#fb7185' },
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  approved: 'Completado',
  rejected: 'Requiere atención',
};

type DashboardActivity = {
  id: string;
  title: string;
  meta: string;
  date: string;
  amount: string;
  icon: 'transaction' | 'identity';
  status: string;
};

type NotificationItem = {
  title: string;
  body: string;
  tone: 'gold' | 'blue';
  href: string;
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
    { tokens: ['nvet', 'veterinaria', 'veterinario', 'mascota'], href: '/nvetcareapp' },
    { tokens: ['identidad', 'kyc', 'verificar', 'verificación'], href: '/dashboard/kyc' },
    { tokens: ['servicio', 'servicios'], href: '/services' },
    { tokens: ['seguridad', 'mfa', 'configuración', 'configuracion'], href: '/dashboard/seguridad/mfa' },
    { tokens: ['ayuda', 'soporte', 'contacto'], href: '/contact' },
    { tokens: ['producto', 'productos', 'tienda'], href: '/products' },
  ];
  return destinations.find((item) => item.tokens.some((token) => normalized.includes(token)))?.href ?? '/products';
}

export default function ReferenceDashboard() {
  const { profile, email, isAuthenticated, isLoading, signOut } = useAuth();
  const { wallet, isLoading: isWalletLoading } = useWallet();
  const { summary, isLoading: investmentLoading } = useInvestmentSummary();
  const { transactions, isLoading: transactionsLoading } = useAccountTransactions(5);
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/iniciar-sesion?next=/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  // All hooks are invoked above this point on every render. The calculations below
  // intentionally use ordinary values so the loading/authentication branches cannot
  // change the React hook count between renders.
  const firstName = profile?.full_name?.trim().split(/\s+/)[0] || 'Usuario';
  const displayName = profile?.full_name?.trim() || firstName;
  const accountEmail = profile?.email ?? email ?? '';
  const kyc = KYC_LABELS[profile?.kyc_status ?? 'not_submitted'];
  const admin = profile?.role === 'admin';
  const onboardingLoading = isWalletLoading || investmentLoading || transactionsLoading;

  const progressSteps = [
    { label: 'Crear cuenta', complete: Boolean(profile) },
    { label: 'Verificar identidad', complete: profile?.kyc_status === 'verified' },
    { label: 'Conectar Wallet', complete: !isWalletLoading && Boolean(wallet) },
    { label: 'Explorar productos', complete: summary.allocations.length > 0 || transactions.length > 0 },
    { label: 'Realizar primera transacción', complete: transactions.length > 0 || summary.allocations.length > 0 },
    { label: 'Completar perfil', complete: Boolean(profile?.full_name && accountEmail) },
  ];
  const completedSteps = progressSteps.filter((step) => step.complete).length;
  const progressPercent = onboardingLoading
    ? null
    : Math.round((completedSteps / progressSteps.length) * 100);

  const nextProgressAction = onboardingLoading
    ? null
    : profile?.kyc_status !== 'verified'
      ? { href: '/dashboard/kyc', label: 'Verificar identidad' }
      : !wallet
        ? { href: '/dashboard/wallet', label: 'Conectar Wallet' }
        : transactions.length === 0 && summary.allocations.length === 0
          ? { href: '/inversion/app', label: 'Explorar oportunidades' }
          : !profile?.full_name
            ? { href: '/dashboard/kyc', label: 'Completar perfil' }
            : { href: '/products', label: 'Explorar productos' };

  const notifications: NotificationItem[] = [
    {
      title: profile?.kyc_status === 'verified' ? 'Identidad verificada' : 'Completa tu identidad',
      body: profile?.kyc_status === 'verified'
        ? 'Tu identidad CTG One está verificada.'
        : 'Completa KYC para habilitar capacidades financieras.',
      tone: 'gold',
      href: '/dashboard/kyc',
    },
    {
      title: wallet ? 'Wallet conectada' : 'Activa tu Wallet',
      body: wallet
        ? 'Tu cuenta puede consultar saldo y movimientos.'
        : 'Conecta tu Wallet para centralizar tu actividad.',
      tone: wallet ? 'blue' : 'gold',
      href: '/dashboard/wallet',
    },
    {
      title: summary.allocations.length > 0 ? 'Participaciones activas' : 'Inversión CTG Craft Beer',
      body: summary.allocations.length > 0
        ? `${summary.allocations.length} participación${summary.allocations.length === 1 ? '' : 'es'} vinculada${summary.allocations.length === 1 ? '' : 's'} a tu cuenta.`
        : 'Consulta los lotes publicados y las próximas aperturas de financiación.',
      tone: 'blue',
      href: '/inversion/app',
    },
  ];

  const derivedActivities: DashboardActivity[] = transactions.map((tx) => ({
    id: tx.id,
    title: transactionLabel(tx.type),
    meta: STATUS_LABELS[tx.status] ?? tx.status,
    date: tx.created_at,
    amount: formatCents(tx.amount_cents),
    icon: 'transaction',
    status: tx.status,
  }));

  if (derivedActivities.length === 0 && profile?.created_at) {
    derivedActivities.push({
      id: 'account-created',
      title: 'Cuenta CTG One creada',
      meta: profile?.kyc_status === 'verified' ? 'Identidad verificada' : 'Cuenta activa',
      date: profile.created_at,
      amount: '',
      icon: 'identity',
      status: 'approved',
    });
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050607]" aria-live="polite">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[#d8ad4f]/35 bg-[#d8ad4f]/[.05]">
          <Sparkles className="animate-pulse text-[#e6ba59]" aria-hidden="true" />
          <span className="sr-only">Cargando dashboard</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = searchTerm.trim();
    router.push(query ? resolveDashboardSearch(query) : '/products');
  }

  return (
    <div className="min-h-screen bg-[#080a0b] text-white [--ctg-gold:#e3b653] [--ctg-gold-soft:#f0c668]">
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-[240px] flex-col border-r border-white/[0.09] bg-[linear-gradient(180deg,#090c0e_0%,#080a0b_62%,#090b0c_100%)] px-[13px] pb-[18px] pt-5 shadow-[16px_0_50px_rgba(0,0,0,.2)] lg:flex">
        <div className="flex h-[58px] items-center px-3.5 pb-2.5">
          <Link href="/dashboard" aria-label="CTG One Dashboard">
            <BrandLogo priority className="origin-left scale-[1.08]" />
          </Link>
        </div>

        <nav className="mt-[15px] flex flex-col gap-1">
          <SidebarItem href="/dashboard" icon={<Home size={18} />} label="Dashboard" active />
          <SidebarItem href="/dashboard/wallet" icon={<WalletCards size={18} />} label="Wallet" />
          <SidebarItem href="/inversion/app" icon={<BarChart3 size={18} />} label="Inversiones" />
          <SidebarItem href="/products" icon={<Box size={18} />} label="Productos" />
          <SidebarItem href="/nvetcareapp" icon={<PawPrint size={18} />} label="Nvet Care" />
          <SidebarItem href="/dashboard/kyc" icon={<ShieldCheck size={18} />} label="Identidad" />
          <SidebarItem href="/services" icon={<ShoppingBag size={18} />} label="Servicios" />
          <SidebarItem href="/products" icon={<Compass size={18} />} label="Explorar" chevron />
        </nav>

        <div className="mx-2.5 mb-2.5 mt-[17px] h-px bg-white/[0.11]" />

        <nav className="flex flex-col gap-1">
          <SidebarItem href="#notifications" icon={<Bell size={18} />} label="Notificaciones" badge={notifications.length} />
          <SidebarItem href="/contact" icon={<CircleHelp size={18} />} label="Soporte" />
          <SidebarItem href="/dashboard/seguridad/mfa" icon={<Settings size={18} />} label="Configuración" />
        </nav>

        <Link
          href="/products"
          className="group relative isolate mt-[19px] min-h-[212px] overflow-hidden rounded-xl border border-[#e3b653]/30 bg-[linear-gradient(145deg,rgba(227,182,83,.1),rgba(9,11,12,.96)_52%)] px-4 py-[19px] transition hover:-translate-y-0.5 hover:border-[#e3b653]/50"
        >
          <div className="absolute -bottom-[100px] -left-10 -right-10 -z-10 h-[190px] rounded-[50%] border-t border-[#ffd77d]/50 bg-[radial-gradient(ellipse_at_center,#d7a846_0%,#8d6424_16%,rgba(227,182,83,.36)_31%,rgba(227,182,83,.06)_47%,transparent_68%)]" />
          <strong className="text-[15px] leading-tight">Un ecosistema<br />para un mejor futuro.</strong>
          <p className="mt-[18px] text-[11px] leading-relaxed text-white/50">Tecnología, personas<br />e impacto real.</p>
          <span className="absolute bottom-3.5 left-4 grid h-[34px] w-[34px] place-items-center rounded-full border border-[#e3b653]/40 text-[#e3b653]">
            <ArrowRight size={15} />
          </span>
        </Link>

        <div className="mt-auto flex flex-col border-t border-white/[0.08] px-3.5 pt-[18px] text-white/35">
          <span className="text-[10px]">CTG One</span>
          <small className="mt-1 text-[8px]">Technology for a better tomorrow.</small>
        </div>
      </aside>

      <div className="min-h-screen lg:ml-[240px]">
        <header className="sticky top-0 z-40 flex min-h-16 items-center gap-5 border-b border-white/[0.08] bg-[#080a0b]/95 px-4 backdrop-blur-xl sm:px-7">
          <div className="lg:hidden">
            <BrandLogo priority compact />
          </div>

          <form className="hidden h-10 w-full max-w-[535px] items-center gap-2.5 rounded-[9px] border border-white/[0.13] bg-white/[0.025] px-3 text-white/65 md:flex" onSubmit={handleSearch} role="search">
            <Search size={17} aria-hidden="true" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar productos, servicios o ayuda..."
              aria-label="Buscar en CTG One"
              className="min-w-0 flex-1 bg-transparent text-xs text-white outline-none placeholder:text-white/40"
            />
            <kbd className="rounded-md border border-white/[0.08] bg-white/[0.06] px-1.5 py-0.5 text-[9px] text-white/50">⌘K</kbd>
          </form>

          <div className="ml-auto flex items-center gap-2.5 sm:gap-3">
            <button className="hidden items-center gap-1.5 p-2 text-[11px] text-white/70 sm:flex" type="button" aria-label="Idioma: español">
              <Globe2 size={17} />
              <span>ES</span>
              <ChevronDown size={12} />
            </button>
            <span className="hidden h-6 w-px bg-white/[0.09] sm:block" />
            <a href="#notifications" className="relative p-2 text-white/75" aria-label={`${notifications.length} notificaciones`}>
              <Bell size={18} />
              <span className="absolute right-0.5 top-0.5 grid h-[15px] min-w-[15px] place-items-center rounded-full bg-[#e3b653] px-1 text-[8px] font-extrabold text-[#151006]">{notifications.length}</span>
            </a>
            <span className="hidden h-6 w-px bg-white/[0.09] sm:block" />
            <div className="flex items-center gap-2.5">
              <span className="grid h-[38px] w-[38px] place-items-center rounded-full bg-[#f4f4f4] text-xs font-bold text-[#171717]">{firstName.slice(0, 1).toUpperCase()}</span>
              <span className="hidden min-w-0 flex-col sm:flex">
                <strong className="max-w-[135px] truncate text-xs font-medium">{displayName}</strong>
                <small className="mt-0.5 text-[9px] text-white/40">{profile?.kyc_status === 'verified' ? 'Usuario verificado' : 'Cuenta CTG One'}</small>
              </span>
            </div>
            <button className="grid h-[34px] w-[34px] place-items-center rounded-lg text-white/45 transition hover:bg-white/5 hover:text-white" type="button" onClick={signOut} aria-label="Cerrar sesión" title="Cerrar sesión">
              <LogOut size={17} />
            </button>
          </div>
        </header>

        <form className="mx-3 mt-3 flex h-10 items-center gap-2.5 rounded-lg border border-white/10 bg-white/[0.025] px-3 text-white/60 md:hidden" onSubmit={handleSearch} role="search">
          <Search size={17} />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Buscar en CTG One..."
            className="min-w-0 flex-1 bg-transparent text-xs text-white outline-none placeholder:text-white/40"
          />
        </form>

        <main>
          <section
            className="relative isolate min-h-[255px] overflow-hidden border-b border-white/[0.08] bg-cover bg-[center_45%]"
            style={{
              backgroundImage: "linear-gradient(90deg,#080a0b 0%,rgba(8,10,11,.86) 27%,rgba(8,10,11,.18) 57%,rgba(8,10,11,.52) 100%),url('/images/toures/20251207_143920.jpg')",
            }}
            aria-labelledby="dashboard-title"
          >
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_65%_50%,rgba(230,172,71,.16),transparent_36%)]" />
            <div className="relative z-10 max-w-[760px] px-[18px] py-[26px] sm:px-[30px] sm:py-[29px]">
              <p className="flex items-center gap-2 text-[9px] font-semibold tracking-[.24em] text-white/60"><span className="h-1.5 w-1.5 rounded-full bg-[#e3b653] shadow-[0_0_12px_rgba(227,182,83,.8)]" /> DASHBOARD</p>
              <h1 id="dashboard-title" className="mt-2.5 font-outfit text-[3.4rem] font-semibold leading-[.9] tracking-[-.06em] sm:text-[4.6rem] xl:text-[5.1rem]">Hola, {firstName}<em className="not-italic text-[#e3b653]">.</em></h1>
              <p className="mt-[15px] max-w-[650px] text-xs leading-relaxed text-white/70 sm:text-sm">
                Tu centro de control para cuenta, inversión, identidad y acceso a todos los productos y servicios del ecosistema CTG One.
              </p>
              <div className="mt-[17px] flex flex-col items-stretch gap-2.5 sm:flex-row sm:items-center sm:gap-[15px]">
                <Link href="/products" className="inline-flex min-h-[41px] items-center justify-center gap-2.5 rounded-lg bg-[linear-gradient(180deg,#efc96b,#ddb054)] px-[17px] text-[11px] font-semibold text-[#171006] shadow-[0_8px_28px_rgba(227,182,83,.12)] transition hover:-translate-y-px">Explorar productos <ArrowRight size={15} /></Link>
                <Link href="/dashboard/kyc" className="inline-flex min-h-[41px] items-center justify-center gap-2.5 rounded-lg px-[17px] text-[11px] font-semibold text-white transition hover:bg-white/[0.045]">Mi cuenta <ArrowRight size={15} /></Link>
              </div>
            </div>
            <div className="absolute right-[34px] top-[43px] z-10 hidden w-[205px] xl:block">
              <span className="text-[9px] font-semibold tracking-[.23em] text-[#e3b653]">CARTAGENA</span>
              <small className="mt-2 block text-[7px] leading-relaxed tracking-[.17em] text-white/55">IDEAS. PERSONAS.<br />OPORTUNIDADES REALES.</small>
              <i className="mt-3 block h-px w-7 bg-[#e3b653]" />
              <p className="mt-8 text-right font-serif text-[13px] italic leading-snug text-[#ecc166]/80">La tecnología<br />también puede servir<br />para construir una<br />sociedad más humana.</p>
            </div>
          </section>

          <div className="grid gap-[15px] p-3 sm:p-[15px] xl:grid-cols-[minmax(0,1fr)_272px]">
            <div className="min-w-0">
              <section className="mb-4">
                <SectionTitle title="Acciones principales" subtitle="Accede rápidamente a lo que más usas." />
                <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2 2xl:grid-cols-4">
                  <ActionCard href="/dashboard/wallet" icon={<WalletCards size={27} />} title="Mi Wallet" subtitle="Saldo, activos y movimientos" />
                  <ActionCard href="/inversion/app" icon={<BarChart3 size={27} />} title="Invertir" subtitle="Explorar oportunidades" />
                  <ActionCard href="/nvetcareapp" icon={<PawPrint size={27} />} title="Nvet Care" subtitle="Cuidado veterinario" />
                  <ActionCard href="/products" icon={<ShoppingBag size={27} />} title="Productos" subtitle="Tienda y servicios" />
                </div>
              </section>

              <section className="mb-4">
                <div className="flex items-end justify-between gap-3">
                  <SectionTitle title="Resumen de tu ecosistema" subtitle="Una vista general de tu actividad en CTG One." />
                  <Link href="/products" className="inline-flex items-center gap-1.5 whitespace-nowrap text-[9px] text-white/65 transition hover:text-[#e3b653]">Ver detalles <ArrowRight size={13} /></Link>
                </div>
                <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2 2xl:grid-cols-4">
                  <SummaryCard href="/dashboard/wallet" icon={<WalletCards size={24} />} label="Saldo disponible" value={isWalletLoading ? '—' : formatCents(wallet?.balance_cents ?? 0, wallet?.currency ?? 'COP')} helper="Wallet" />
                  <SummaryCard href="/inversion/app" icon={<BarChart3 size={24} />} label="Capital activo" value={investmentLoading ? '—' : formatCents(summary.activeCapitalCents)} helper="Inversiones" featured />
                  <SummaryCard href="/inversion/app" icon={<Package size={24} />} label="Participaciones" value={investmentLoading ? '—' : String(summary.allocations.length)} helper="Lotes productivos" />
                  <SummaryCard href="/dashboard/kyc" icon={<ShieldCheck size={24} />} label="Identidad digital" value={kyc.label} helper="KYC / Identidad" tone={kyc.tone} />
                </div>
              </section>

              <section className="grid gap-3.5 2xl:grid-cols-[minmax(0,1.45fr)_minmax(245px,.72fr)]">
                <div className="min-w-0 overflow-hidden rounded-[14px] border border-white/10 bg-[linear-gradient(145deg,#111416,#0c0f11)] shadow-[inset_0_1px_rgba(255,255,255,.025)]">
                  <div className="flex items-center justify-between gap-3 border-b border-white/[0.075] px-4 py-3.5">
                    <div><h2 className="text-[15px] font-semibold">Actividad reciente</h2><p className="mt-0.5 text-[9px] text-white/40">Tus últimas acciones en la plataforma.</p></div>
                    <Link href="/dashboard/wallet" className="inline-flex items-center gap-1.5 text-[9px] text-white/65 transition hover:text-[#e3b653]">Ver todas <ArrowRight size={13} /></Link>
                  </div>

                  {transactionsLoading ? (
                    <div className="px-5 py-10 text-center text-[10px] text-white/40" aria-live="polite">Actualizando tu actividad...</div>
                  ) : derivedActivities.length > 0 ? (
                    <div className="px-3.5 pb-2">
                      {derivedActivities.slice(0, 5).map((item) => (
                        <div key={item.id} className="grid min-h-[47px] grid-cols-[34px_minmax(0,1fr)_auto] items-center gap-2.5 border-b border-white/[0.055] last:border-0 sm:grid-cols-[34px_minmax(0,1fr)_88px_auto]">
                          <span className="grid h-[30px] w-[30px] place-items-center rounded-full border border-[#e3b653]/20 bg-[#e3b653]/[0.06] text-[#e3b653]">{item.icon === 'identity' ? <BadgeCheck size={17} /> : <Activity size={17} />}</span>
                          <div className="min-w-0"><strong className="block truncate text-[9.5px] font-medium">{item.title}</strong><small className="mt-0.5 block text-[8px] text-white/40">{item.meta}</small></div>
                          <span className="hidden text-[8px] text-white/45 sm:block">{formatActivityDate(item.date)}</span>
                          <TransactionStatusBadge status={item.status} amount={item.amount} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="px-5 py-10 text-center text-[10px] text-white/40"><Sparkles size={23} className="mx-auto mb-2 text-[#e3b653]" /><strong className="block text-[11px] text-white/70">Tu actividad aparecerá aquí.</strong><p className="mt-1">Explora el ecosistema para empezar.</p></div>
                  )}
                </div>

                <Link href="/products" className="group relative isolate min-h-[250px] overflow-hidden rounded-[14px] border border-white/10 bg-[linear-gradient(145deg,#111416,#0c0f11)] p-[22px] text-white shadow-[inset_0_1px_rgba(255,255,255,.025)]">
                  <div className="absolute -right-20 -top-24 -z-10 h-[250px] w-[250px] rounded-full bg-[radial-gradient(circle,rgba(227,182,83,.25),rgba(227,182,83,.06)_36%,transparent_68%)]" />
                  <div className="relative z-10"><p className="text-[13px]">CTG <span className="text-[#e3b653]">One</span></p><h2 className="mt-2 text-xl font-semibold leading-tight">Más que tecnología,<br />impacto real.</h2><p className="mt-3 max-w-[205px] text-[10px] leading-relaxed text-white/55">Explora oportunidades, conecta con servicios y sé parte de un ecosistema que construye futuro.</p><span className="mt-[18px] inline-flex items-center gap-2 rounded-lg bg-[linear-gradient(180deg,#efc96b,#ddb054)] px-3.5 py-2.5 text-[9px] font-semibold text-[#171006]">Conoce más <ArrowRight size={14} /></span></div>
                  <Image className="absolute -bottom-14 -right-11 h-[205px] w-[205px] object-contain opacity-90" src="/images/logo/ctg-one-coin-icon.png" alt="" width={205} height={205} aria-hidden="true" />
                </Link>
              </section>
            </div>

            <aside className="grid min-w-0 gap-3 md:grid-cols-3 xl:flex xl:flex-col">
              <section className="rounded-[14px] border border-white/10 bg-[linear-gradient(145deg,#111416,#0c0f11)] p-[15px] shadow-[inset_0_1px_rgba(255,255,255,.025)]" aria-labelledby="progress-title">
                <div className="flex items-end justify-between gap-3"><div><h2 id="progress-title" className="text-sm font-semibold">Tu progreso</h2><p className="mt-1 text-[9px] text-white/45">{onboardingLoading ? 'Actualizando...' : `${completedSteps} de ${progressSteps.length} completados`}</p></div><strong className="text-[11px] font-medium">{progressPercent === null ? '—' : `${progressPercent}%`}</strong></div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.07]" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressPercent ?? undefined}><span className="block h-full rounded-full bg-[linear-gradient(90deg,#e1b24d,#f0c76a)]" style={{ width: `${progressPercent ?? 0}%` }} /></div>
                <div className="mt-3">
                  {progressSteps.map((step) => (
                    <div key={step.label} className="flex min-h-[27px] items-center gap-2.5 text-[9px] text-white/55"><span className={`grid h-[17px] w-[17px] place-items-center rounded-full border ${step.complete ? 'border-[#e3b653] bg-[#e3b653] text-[#151006]' : 'border-white/30 text-white/40'}`}>{step.complete ? <Check size={12} /> : <Circle size={12} />}</span><p>{step.label}</p></div>
                  ))}
                </div>
                {nextProgressAction ? <Link href={nextProgressAction.href} className="mt-3 flex min-h-[38px] items-center justify-center gap-2 rounded-lg bg-[linear-gradient(180deg,#efc96b,#ddb054)] text-[9px] font-bold text-[#171006]">Continuar <ArrowRight size={14} /></Link> : <div className="mt-3 flex min-h-[38px] items-center justify-center rounded-lg bg-[#e3b653]/50 text-[9px] text-[#171006]">Actualizando...</div>}
              </section>

              <section id="notifications" className="rounded-[14px] border border-white/10 bg-[linear-gradient(145deg,#111416,#0c0f11)] p-[15px] shadow-[inset_0_1px_rgba(255,255,255,.025)]" aria-labelledby="notifications-title">
                <div className="flex items-center justify-between gap-3"><h2 id="notifications-title" className="text-sm font-semibold">Notificaciones</h2><span className="grid h-[19px] min-w-[19px] place-items-center rounded-full bg-[#e3b653]/10 px-1 text-[8px] text-[#e3b653]">{notifications.length}</span></div>
                <div className="mt-2">
                  {notifications.map((notification) => (
                    <Link href={notification.href} key={notification.title} className="grid grid-cols-[8px_minmax(0,1fr)_auto] items-start gap-2 border-b border-white/[0.055] py-2.5 last:border-0"><span className={`mt-1 h-[7px] w-[7px] rounded-full ${notification.tone === 'blue' ? 'bg-[#4f8dff]' : 'bg-[#e3b653]'}`} /><div><strong className="block text-[8.5px] font-semibold">{notification.title}</strong><p className="mt-1 text-[7.5px] leading-snug text-white/40">{notification.body}</p></div><ArrowUpRight size={12} className="text-white/30" /></Link>
                  ))}
                </div>
              </section>

              <section className="grid grid-cols-[34px_1fr] items-center gap-2.5 rounded-[14px] border border-white/10 bg-[linear-gradient(145deg,#111416,#0c0f11)] p-[15px] shadow-[inset_0_1px_rgba(255,255,255,.025)]">
                <span className="grid h-[34px] w-[34px] place-items-center rounded-full bg-[#e3b653]/[0.07] text-[#e3b653]"><Headphones size={20} /></span><div><strong className="text-[9px]">¿Necesitas ayuda?</strong><p className="mt-0.5 text-[7.5px] text-white/40">Estamos aquí para apoyarte.</p></div><Link href="/contact" className="col-start-2 flex items-center justify-center gap-1.5 rounded-lg border border-[#e3b653]/25 px-2 py-2 text-[8px] text-[#e3b653]">Contactar <ArrowRight size={12} /></Link>
              </section>

              {admin ? <Link href="/admin" className="flex items-center justify-center gap-2 rounded-[10px] border border-dashed border-[#e3b653]/20 px-2 py-2 text-[8px] text-white/45 transition hover:border-[#e3b653]/40 hover:text-[#e3b653]"><Settings size={15} /> Administración <ArrowUpRight size={13} /></Link> : null}
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}

function SidebarItem({ href, icon, label, active = false, badge, chevron = false }: { href: string; icon: ReactNode; label: string; active?: boolean; badge?: number; chevron?: boolean }) {
  return (
    <Link href={href} className={`relative flex min-h-[43px] items-center gap-[13px] rounded-[11px] border px-3.5 text-[13px] font-normal transition hover:translate-x-px hover:bg-white/[0.035] hover:text-white ${active ? 'border-[#e3b653]/40 bg-[linear-gradient(90deg,rgba(227,182,83,.12),rgba(227,182,83,.035))] text-white shadow-[inset_2px_0_#e3b653]' : 'border-transparent text-white/70'}`} aria-current={active ? 'page' : undefined}>
      <span className={active ? 'text-white' : 'text-white/80'}>{icon}</span><span>{label}</span>{badge ? <span className="ml-auto grid h-[21px] min-w-[21px] place-items-center rounded-full bg-[#e3b653] px-1 text-[10px] font-extrabold text-[#171006]">{badge}</span> : null}{chevron ? <ArrowRight size={13} className="ml-auto text-white/35" /> : null}
    </Link>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return <div><h2 className="text-base font-semibold tracking-[-.02em]">{title}</h2><p className="mt-0.5 text-[10px] text-white/45">{subtitle}</p></div>;
}

function ActionCard({ href, icon, title, subtitle }: { href: string; icon: ReactNode; title: string; subtitle: string }) {
  return (
    <Link href={href} className="group flex min-h-[92px] min-w-0 items-center gap-3 rounded-[13px] border border-white/10 bg-[linear-gradient(145deg,#111416,#0c0f11)] px-3.5 py-3 transition hover:-translate-y-0.5 hover:border-[#e3b653]/30 hover:bg-[#131618]">
      <span className="grid h-12 w-12 flex-none place-items-center rounded-xl text-[#e3b653]">{icon}</span><span className="flex min-w-0 flex-col"><strong className="text-xs font-medium">{title}</strong><small className="mt-1 truncate text-[8.5px] text-white/40">{subtitle}</small></span><span className="ml-auto grid h-7 w-7 flex-none place-items-center rounded-full bg-white/[0.055] text-white/60"><ArrowRight size={13} /></span>
    </Link>
  );
}

function SummaryCard({ href, icon, label, value, helper, tone, featured = false }: { href: string; icon: ReactNode; label: string; value: string; helper: string; tone?: string; featured?: boolean }) {
  return (
    <Link href={href} className={`grid min-h-[108px] grid-cols-[auto_1fr_auto] grid-rows-[auto_auto_auto] gap-x-2.5 rounded-[13px] border p-4 transition hover:-translate-y-0.5 hover:border-[#e3b653]/30 ${featured ? 'border-[#e3b653]/25 bg-[linear-gradient(135deg,rgba(227,182,83,.1),#101214_48%)]' : 'border-white/10 bg-[linear-gradient(145deg,#111416,#0c0f11)]'}`} aria-label={`${label}: ${value}`}>
      <span className="row-span-3 pt-1 text-[#e3b653]">{icon}</span><span className="self-end text-[9px] text-white/45">{label}</span><strong className="text-xl font-semibold leading-tight" style={{ color: tone ?? '#fff' }}>{value}</strong><small className="text-[8px] text-white/35">{helper}</small><ArrowRight size={12} className="col-start-3 row-span-3 row-start-1 self-end pb-0.5 text-white/45" />
    </Link>
  );
}

function TransactionStatusBadge({ status, amount }: { status: string; amount: string }) {
  if (status === 'approved') {
    return <span className="inline-flex min-w-[72px] items-center justify-center gap-1 rounded-full bg-emerald-500/20 px-2 py-1.5 text-[7px] text-emerald-300"><Check size={11} /> {amount || 'Exitoso'}</span>;
  }
  if (status === 'rejected') {
    return <span className="inline-flex min-w-[72px] items-center justify-center gap-1 rounded-full bg-rose-500/15 px-2 py-1.5 text-[7px] text-rose-300"><AlertCircle size={11} /> Rechazado</span>;
  }
  return <span className="inline-flex min-w-[72px] items-center justify-center gap-1 rounded-full bg-amber-500/15 px-2 py-1.5 text-[7px] text-amber-300"><Circle size={10} /> Pendiente</span>;
}
