'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity,
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
  Grid2X2,
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
  Store,
  UserRound,
  WalletCards,
} from 'lucide-react';

import { BrandLogo } from '@/components/BrandLogo';
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

export default function DashboardPage() {
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050607]" aria-live="polite">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[#d8ad4f]/35 bg-[#d8ad4f]/[.05]">
          <Sparkles className="animate-pulse text-[#e6ba59]" aria-hidden="true" />
          <span className="sr-only">Cargando dashboard</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const kyc = KYC_LABELS[profile?.kyc_status ?? 'not_submitted'];
  const firstName = profile?.full_name?.trim().split(/\s+/)[0] || 'Usuario';
  const displayName = profile?.full_name?.trim() || firstName;
  const accountEmail = profile?.email ?? email ?? '';
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

  const notifications = useMemo(() => [
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
      body: wallet ? 'Tu cuenta puede consultar saldo y movimientos.' : 'Conecta tu Wallet para centralizar tu actividad.',
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
  ], [profile?.kyc_status, wallet, summary.allocations.length]);

  const derivedActivities = useMemo(() => {
    const items = transactions.map((tx) => ({
      id: tx.id,
      title: transactionLabel(tx.type),
      meta: STATUS_LABELS[tx.status] ?? tx.status,
      date: tx.created_at,
      amount: formatCents(tx.amount_cents),
      icon: 'transaction' as const,
    }));

    if (items.length === 0 && profile?.created_at) {
      items.push({
        id: 'account-created',
        title: 'Cuenta CTG One creada',
        meta: profile?.kyc_status === 'verified' ? 'Identidad verificada' : 'Cuenta activa',
        date: profile.created_at,
        amount: '',
        icon: 'identity' as const,
      });
    }

    return items.slice(0, 5);
  }, [profile?.created_at, profile?.kyc_status, transactions]);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = searchTerm.trim();
    router.push(query ? `/products?q=${encodeURIComponent(query)}` : '/products');
  }

  return (
    <div className="ctgAppShell min-h-screen text-white">
      <aside className="ctgSidebar" aria-label="Navegación del dashboard">
        <div className="ctgSidebarBrand">
          <Link href="/dashboard" aria-label="CTG One Dashboard">
            <BrandLogo priority className="ctgSidebarLogo" />
          </Link>
        </div>

        <nav className="ctgSidebarNav">
          <SidebarItem href="/dashboard" icon={<Home size={18} />} label="Dashboard" active />
          <SidebarItem href="/dashboard/wallet" icon={<WalletCards size={18} />} label="Wallet" />
          <SidebarItem href="/inversion/app" icon={<BarChart3 size={18} />} label="Inversiones" />
          <SidebarItem href="/products" icon={<Box size={18} />} label="Productos" />
          <SidebarItem href="/nvetcareapp" icon={<PawPrint size={18} />} label="Nvet Care" />
          <SidebarItem href="/dashboard/kyc" icon={<ShieldCheck size={18} />} label="Identidad" />
          <SidebarItem href="/services" icon={<ShoppingBag size={18} />} label="Servicios" />
          <SidebarItem href="/products" icon={<Compass size={18} />} label="Explorar" chevron />
        </nav>

        <div className="ctgSidebarDivider" />

        <nav className="ctgSidebarNav ctgSidebarNavSecondary">
          <SidebarItem href="#notifications" icon={<Bell size={18} />} label="Notificaciones" badge={notifications.length} />
          <SidebarItem href="/contact" icon={<CircleHelp size={18} />} label="Soporte" />
          <SidebarItem href="/dashboard/seguridad" icon={<Settings size={18} />} label="Configuración" />
        </nav>

        <Link href="/products" className="ctgSidebarPromo">
          <div className="ctgSidebarPromoGlow" aria-hidden="true" />
          <div className="ctgSidebarPromoContent">
            <strong>Un ecosistema<br />para un mejor futuro.</strong>
            <p>Tecnología, personas<br />e impacto real.</p>
          </div>
          <span className="ctgSidebarPromoArrow"><ArrowRight size={15} /></span>
        </Link>

        <div className="ctgSidebarFooter">
          <span>CTG One</span>
          <small>Technology for a better tomorrow.</small>
        </div>
      </aside>

      <div className="ctgWorkspace">
        <header className="ctgTopbar">
          <div className="ctgMobileBrand">
            <BrandLogo priority compact />
          </div>

          <form className="ctgSearch" onSubmit={handleSearch} role="search">
            <Search size={17} aria-hidden="true" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar productos, servicios o ayuda..."
              aria-label="Buscar en CTG One"
            />
            <kbd>⌘K</kbd>
          </form>

          <div className="ctgTopbarActions">
            <button className="ctgTopIcon ctgLanguage" type="button" aria-label="Idioma: español">
              <Globe2 size={17} />
              <span>ES</span>
              <ChevronDown size={12} />
            </button>
            <span className="ctgTopDivider" aria-hidden="true" />
            <a href="#notifications" className="ctgTopIcon ctgNotificationButton" aria-label={`${notifications.length} notificaciones`}>
              <Bell size={18} />
              <span>{notifications.length}</span>
            </a>
            <span className="ctgTopDivider" aria-hidden="true" />
            <div className="ctgProfileChip">
              <span className="ctgAvatar">{firstName.slice(0, 1).toUpperCase()}</span>
              <span className="ctgProfileText">
                <strong>{displayName}</strong>
                <small>{profile?.kyc_status === 'verified' ? 'Usuario verificado' : 'Cuenta CTG One'}</small>
              </span>
            </div>
            <button className="ctgLogout" type="button" onClick={signOut} aria-label="Cerrar sesión" title="Cerrar sesión">
              <LogOut size={17} />
            </button>
          </div>
        </header>

        <main className="ctgDashboardMain">
          <section className="ctgReferenceHero" aria-labelledby="dashboard-title">
            <div className="ctgReferenceHeroShade" aria-hidden="true" />
            <div className="ctgHeroContent">
              <p className="ctgMicroLabel"><span /> DASHBOARD</p>
              <h1 id="dashboard-title">Hola, {firstName}<em>.</em></h1>
              <p>
                Tu centro de control para cuenta, inversión, identidad<br className="ctgDesktopBreak" />
                y acceso a todos los productos y servicios del ecosistema CTG One.
              </p>
              <div className="ctgHeroActions">
                <Link href="/products" className="ctgGoldButton">Explorar productos <ArrowRight size={15} /></Link>
                <Link href="/dashboard/kyc" className="ctgGhostButton">Mi cuenta <ArrowRight size={15} /></Link>
              </div>
            </div>
            <div className="ctgHeroCityNote">
              <span>CARTAGENA</span>
              <small>IDEAS. PERSONAS.<br />OPORTUNIDADES REALES.</small>
              <i />
              <p>La tecnología<br />también puede servir<br />para construir una<br />sociedad más humana.</p>
            </div>
          </section>

          <div className="ctgContentGrid">
            <div className="ctgPrimaryColumn">
              <section className="ctgDashboardSection" aria-labelledby="quick-title">
                <SectionTitle title="Acciones principales" subtitle="Accede rápidamente a lo que más usas." />
                <div className="ctgQuickActions">
                  <ActionCard href="/dashboard/wallet" icon={<WalletCards size={27} />} title="Mi Wallet" subtitle="Saldo, activos y movimientos" />
                  <ActionCard href="/inversion/app" icon={<BarChart3 size={27} />} title="Invertir" subtitle="Explorar oportunidades" />
                  <ActionCard href="/nvetcareapp" icon={<PawPrint size={27} />} title="Nvet Care" subtitle="Cuidado veterinario" />
                  <ActionCard href="/products" icon={<ShoppingBag size={27} />} title="Productos" subtitle="Tienda y servicios" />
                </div>
              </section>

              <section className="ctgDashboardSection" aria-labelledby="summary-title">
                <div className="ctgSectionHeadingRow">
                  <SectionTitle title="Resumen de tu ecosistema" subtitle="Una vista general de tu actividad en CTG One." />
                  <Link href="/products" className="ctgInlineLink">Ver detalles <ArrowRight size={13} /></Link>
                </div>
                <div className="ctgSummaryGrid">
                  <SummaryCard
                    href="/dashboard/wallet"
                    icon={<WalletCards size={24} />}
                    label="Saldo disponible"
                    value={isWalletLoading ? '—' : formatCents(wallet?.balance_cents ?? 0, wallet?.currency ?? 'COP')}
                    helper="Wallet"
                  />
                  <SummaryCard
                    href="/inversion/app"
                    icon={<BarChart3 size={24} />}
                    label="Capital activo"
                    value={investmentLoading ? '—' : formatCents(summary.activeCapitalCents)}
                    helper="Inversiones"
                    featured
                  />
                  <SummaryCard
                    href="/products"
                    icon={<Package size={24} />}
                    label="Participaciones"
                    value={investmentLoading ? '—' : String(summary.allocations.length)}
                    helper="Lotes productivos"
                  />
                  <SummaryCard
                    href="/dashboard/kyc"
                    icon={<ShieldCheck size={24} />}
                    label="Identidad digital"
                    value={kyc.label}
                    helper="KYC / Identidad"
                    tone={kyc.tone}
                  />
                </div>
              </section>

              <section className="ctgLowerGrid">
                <div className="ctgActivityPanel">
                  <div className="ctgPanelHeading">
                    <div>
                      <h2>Actividad reciente</h2>
                      <p>Tus últimas acciones en la plataforma.</p>
                    </div>
                    <Link href="/dashboard/wallet" className="ctgInlineLink">Ver todas <ArrowRight size={13} /></Link>
                  </div>

                  {transactionsLoading ? (
                    <div className="ctgLoadingRows" aria-live="polite">Actualizando tu actividad...</div>
                  ) : derivedActivities.length > 0 ? (
                    <div className="ctgActivityRows">
                      {derivedActivities.map((item) => (
                        <div key={item.id} className="ctgActivityItem">
                          <span className="ctgActivityIcon">
                            {item.icon === 'identity' ? <BadgeCheck size={17} /> : <Activity size={17} />}
                          </span>
                          <div className="ctgActivityCopy">
                            <strong>{item.title}</strong>
                            <small>{item.meta}</small>
                          </div>
                          <span className="ctgActivityDate">{formatActivityDate(item.date)}</span>
                          <span className="ctgSuccessBadge"><Check size={11} /> {item.amount || 'Exitoso'}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="ctgEmptyActivity">
                      <Sparkles size={23} />
                      <strong>Tu actividad aparecerá aquí.</strong>
                      <p>Explora el ecosistema para empezar.</p>
                    </div>
                  )}
                </div>

                <Link href="/products" className="ctgImpactCard">
                  <div className="ctgImpactOrb" aria-hidden="true" />
                  <div className="ctgImpactContent">
                    <p>CTG <span>One</span></p>
                    <h2>Más que tecnología,<br />impacto real.</h2>
                    <p className="ctgImpactCopy">Explora oportunidades, conecta con servicios y sé parte de un ecosistema que construye futuro.</p>
                    <span className="ctgImpactButton">Conoce más <ArrowRight size={14} /></span>
                  </div>
                  <img className="ctgImpactLogo" src="/images/logo/ctg-one-coin-icon.png" alt="" aria-hidden="true" />
                </Link>
              </section>
            </div>

            <aside className="ctgRightRail">
              <section className="ctgRailCard ctgProgressPanel" aria-labelledby="progress-title">
                <div className="ctgRailHeading">
                  <div>
                    <h2 id="progress-title">Tu progreso</h2>
                    <p>{onboardingLoading ? 'Actualizando...' : `${completedSteps} de ${progressSteps.length} completados`}</p>
                  </div>
                  <strong>{progressPercent === null ? '—' : `${progressPercent}%`}</strong>
                </div>
                <div className="ctgProgressBar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressPercent ?? undefined}>
                  <span style={{ width: `${progressPercent ?? 0}%` }} />
                </div>
                <div className="ctgProgressList">
                  {progressSteps.map((step) => (
                    <div key={step.label} className="ctgProgressStep">
                      <span className={step.complete ? 'complete' : ''}>{step.complete ? <Check size={12} /> : <Circle size={12} />}</span>
                      <p>{step.label}</p>
                    </div>
                  ))}
                </div>
                {nextProgressAction ? (
                  <Link href={nextProgressAction.href} className="ctgContinueButton">Continuar <ArrowRight size={14} /></Link>
                ) : (
                  <div className="ctgContinueButton ctgContinueLoading">Actualizando...</div>
                )}
              </section>

              <section id="notifications" className="ctgRailCard ctgNotificationsPanel" aria-labelledby="notifications-title">
                <div className="ctgRailHeading ctgRailHeadingCompact">
                  <h2 id="notifications-title">Notificaciones</h2>
                  <span>{notifications.length}</span>
                </div>
                <div className="ctgNotificationList">
                  {notifications.map((notification) => (
                    <Link href={notification.href} key={notification.title} className="ctgNotificationItem">
                      <span className={`ctgNotificationDot ${notification.tone}`} />
                      <div>
                        <strong>{notification.title}</strong>
                        <p>{notification.body}</p>
                      </div>
                      <ArrowUpRight size={12} />
                    </Link>
                  ))}
                </div>
              </section>

              <section className="ctgRailCard ctgHelpPanel">
                <span className="ctgHelpIcon"><Headphones size={20} /></span>
                <div>
                  <strong>¿Necesitas ayuda?</strong>
                  <p>Estamos aquí para apoyarte.</p>
                </div>
                <Link href="/contact">Contactar <ArrowRight size={12} /></Link>
              </section>

              {admin ? (
                <Link href="/admin" className="ctgAdminShortcut">
                  <Settings size={15} /> Administración <ArrowUpRight size={13} />
                </Link>
              ) : null}
            </aside>
          </div>
        </main>
      </div>

      <style jsx global>{`
        .ctgAppShell{--ctg-gold:#e3b653;--ctg-gold-2:#f0c668;--ctg-card:#0c0f11;--ctg-card-2:#111416;--ctg-line:rgba(255,255,255,.095);background:#07090a;min-height:100vh;font-family:var(--font-outfit),Arial,sans-serif}.ctgWorkspace{min-width:0;margin-left:240px;background:radial-gradient(circle at 75% -10%,rgba(227,182,83,.06),transparent 28%),#080a0b;min-height:100vh}.ctgSidebar{position:fixed;inset:0 auto 0 0;z-index:50;width:240px;border-right:1px solid rgba(255,255,255,.09);background:linear-gradient(180deg,#090c0e 0%,#080a0b 60%,#090b0c 100%);padding:20px 13px 18px;display:flex;flex-direction:column;box-shadow:16px 0 50px rgba(0,0,0,.2)}.ctgSidebarBrand{height:58px;display:flex;align-items:center;padding:0 14px 10px}.ctgSidebarLogo{transform:scale(1.08);transform-origin:left center}.ctgSidebarNav{display:flex;flex-direction:column;gap:5px;margin-top:15px}.ctgSidebarItem{position:relative;display:flex;align-items:center;gap:13px;min-height:43px;padding:0 14px;border:1px solid transparent;border-radius:11px;color:rgba(255,255,255,.68);font-size:13px;font-weight:450;transition:background .18s,border-color .18s,color .18s,transform .18s}.ctgSidebarItem:hover{background:rgba(255,255,255,.035);color:#fff;transform:translateX(1px)}.ctgSidebarItem.active{border-color:rgba(227,182,83,.38);background:linear-gradient(90deg,rgba(227,182,83,.12),rgba(227,182,83,.035));color:#fff;box-shadow:inset 2px 0 var(--ctg-gold)}.ctgSidebarItem svg{color:rgba(255,255,255,.78)}.ctgSidebarItem.active svg{color:#fff}.ctgSidebarChevron{margin-left:auto;color:rgba(255,255,255,.35)!important}.ctgSidebarBadge{margin-left:auto;display:grid;place-items:center;min-width:21px;height:21px;border-radius:999px;background:var(--ctg-gold);color:#171006;font-size:10px;font-weight:800}.ctgSidebarDivider{height:1px;margin:17px 10px 10px;background:rgba(255,255,255,.11)}.ctgSidebarNavSecondary{margin-top:0}.ctgSidebarPromo{position:relative;isolation:isolate;overflow:hidden;min-height:212px;margin:19px 5px 0;border:1px solid rgba(227,182,83,.28);border-radius:12px;background:linear-gradient(145deg,rgba(227,182,83,.1),rgba(9,11,12,.96) 52%);padding:19px 16px;transition:transform .2s,border-color .2s}.ctgSidebarPromo:hover{transform:translateY(-2px);border-color:rgba(227,182,83,.48)}.ctgSidebarPromoGlow{position:absolute;z-index:-1;left:-38px;right:-38px;bottom:-100px;height:190px;border-radius:50%;background:radial-gradient(ellipse at center,#d7a846 0%,#8d6424 16%,rgba(227,182,83,.36) 31%,rgba(227,182,83,.06) 47%,transparent 68%);box-shadow:0 -5px 25px rgba(232,179,70,.18)}.ctgSidebarPromoGlow:after{content:'';position:absolute;inset:0;border-top:1px solid rgba(255,215,125,.55);border-radius:50%}.ctgSidebarPromoContent strong{font-size:15px;line-height:1.25}.ctgSidebarPromoContent p{margin-top:18px;color:rgba(255,255,255,.48);font-size:11px;line-height:1.65}.ctgSidebarPromoArrow{position:absolute;left:16px;bottom:14px;display:grid;place-items:center;width:34px;height:34px;border:1px solid rgba(227,182,83,.35);border-radius:50%;color:var(--ctg-gold)}.ctgSidebarFooter{margin-top:auto;padding:18px 14px 0;border-top:1px solid rgba(255,255,255,.08);display:flex;flex-direction:column;color:rgba(255,255,255,.36)}.ctgSidebarFooter span{font-size:10px}.ctgSidebarFooter small{margin-top:4px;font-size:8px}.ctgTopbar{position:sticky;top:0;z-index:40;height:64px;display:flex;align-items:center;justify-content:space-between;gap:20px;border-bottom:1px solid rgba(255,255,255,.08);background:rgba(8,10,11,.92);backdrop-filter:blur(20px);padding:0 28px}.ctgMobileBrand{display:none}.ctgSearch{height:40px;width:min(535px,46vw);display:flex;align-items:center;gap:11px;border:1px solid rgba(255,255,255,.13);border-radius:9px;background:rgba(255,255,255,.025);padding:0 12px;color:rgba(255,255,255,.65);box-shadow:inset 0 1px rgba(255,255,255,.025)}.ctgSearch:focus-within{border-color:rgba(227,182,83,.42)}.ctgSearch input{min-width:0;flex:1;background:transparent;outline:0;color:#fff;font-size:12px}.ctgSearch input::placeholder{color:rgba(255,255,255,.38)}.ctgSearch kbd{border:1px solid rgba(255,255,255,.08);border-radius:6px;background:rgba(255,255,255,.06);padding:3px 6px;font-size:9px;color:rgba(255,255,255,.5)}.ctgTopbarActions{display:flex;align-items:center;gap:12px;margin-left:auto}.ctgTopIcon{display:flex;align-items:center;gap:7px;color:rgba(255,255,255,.72);font-size:11px}.ctgLanguage{padding:8px}.ctgTopDivider{width:1px;height:25px;background:rgba(255,255,255,.09)}.ctgNotificationButton{position:relative;padding:8px}.ctgNotificationButton>span{position:absolute;right:1px;top:1px;display:grid;place-items:center;min-width:15px;height:15px;border-radius:999px;background:var(--ctg-gold);color:#151006;font-size:8px;font-weight:800}.ctgProfileChip{display:flex;align-items:center;gap:10px;min-width:180px}.ctgAvatar{display:grid;place-items:center;width:38px;height:38px;border-radius:50%;background:#f4f4f4;color:#171717;font-size:12px;font-weight:700}.ctgProfileText{display:flex;min-width:0;flex-direction:column}.ctgProfileText strong{max-width:135px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;font-weight:550}.ctgProfileText small{margin-top:3px;color:rgba(255,255,255,.38);font-size:9px}.ctgLogout{display:grid;place-items:center;width:34px;height:34px;border-radius:9px;color:rgba(255,255,255,.44);transition:.18s}.ctgLogout:hover{background:rgba(255,255,255,.05);color:#fff}.ctgDashboardMain{min-width:0}.ctgReferenceHero{position:relative;isolation:isolate;overflow:hidden;min-height:255px;background-image:linear-gradient(90deg,#080a0b 0%,rgba(8,10,11,.86) 27%,rgba(8,10,11,.18) 57%,rgba(8,10,11,.52) 100%),url('/images/toures/20251207_143920.jpg');background-size:cover;background-position:center 45%;border-bottom:1px solid rgba(255,255,255,.08)}.ctgReferenceHeroShade{position:absolute;z-index:-1;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.06),rgba(0,0,0,.25)),radial-gradient(circle at 65% 50%,rgba(230,172,71,.16),transparent 36%)}.ctgHeroContent{position:relative;z-index:2;max-width:760px;padding:29px 30px 28px}.ctgMicroLabel{display:flex;align-items:center;gap:8px;font-size:9px;font-weight:650;letter-spacing:.24em;color:rgba(255,255,255,.58)}.ctgMicroLabel span{display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--ctg-gold);box-shadow:0 0 12px rgba(227,182,83,.8)}.ctgHeroContent h1{margin-top:10px;font-family:var(--font-outfit);font-size:clamp(3.35rem,5vw,5.1rem);font-weight:650;line-height:.9;letter-spacing:-.06em}.ctgHeroContent h1 em{font-style:normal;color:var(--ctg-gold)}.ctgHeroContent>p:not(.ctgMicroLabel){margin-top:15px;color:rgba(255,255,255,.68);font-size:14px;line-height:1.55}.ctgHeroActions{display:flex;align-items:center;gap:15px;margin-top:17px}.ctgGoldButton,.ctgGhostButton{display:inline-flex;min-height:41px;align-items:center;justify-content:center;gap:10px;border-radius:8px;padding:0 17px;font-size:11px;font-weight:620;transition:transform .18s,background .18s}.ctgGoldButton{background:linear-gradient(180deg,#efc96b,#ddb054);color:#171006;box-shadow:0 8px 28px rgba(227,182,83,.12)}.ctgGoldButton:hover{transform:translateY(-1px);background:#f2cb6d}.ctgGhostButton{color:#fff}.ctgGhostButton:hover{background:rgba(255,255,255,.045)}.ctgHeroCityNote{position:absolute;z-index:2;right:34px;top:43px;width:205px;text-align:left}.ctgHeroCityNote>span{color:var(--ctg-gold);font-size:9px;font-weight:650;letter-spacing:.23em}.ctgHeroCityNote small{display:block;margin-top:7px;color:rgba(255,255,255,.52);font-size:7px;line-height:1.65;letter-spacing:.17em}.ctgHeroCityNote i{display:block;width:28px;height:1px;margin-top:11px;background:var(--ctg-gold)}.ctgHeroCityNote p{margin-top:34px;text-align:right;color:rgba(236,193,102,.8);font-family:Georgia,'Times New Roman',serif;font-size:13px;font-style:italic;line-height:1.35}.ctgContentGrid{display:grid;grid-template-columns:minmax(0,1fr) 272px;gap:15px;padding:15px}.ctgPrimaryColumn{min-width:0}.ctgDashboardSection{margin-bottom:14px}.ctgSectionHeadingRow{display:flex;align-items:end;justify-content:space-between;gap:12px}.ctgSectionTitle h2{font-size:16px;font-weight:610;letter-spacing:-.02em}.ctgSectionTitle p{margin-top:2px;color:rgba(255,255,255,.43);font-size:10px}.ctgInlineLink{display:inline-flex;align-items:center;gap:7px;color:rgba(255,255,255,.65);font-size:9px;white-space:nowrap}.ctgInlineLink:hover{color:var(--ctg-gold)}.ctgQuickActions{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin-top:10px}.ctgActionCard{display:flex;min-width:0;min-height:92px;align-items:center;gap:12px;border:1px solid rgba(255,255,255,.1);border-radius:13px;background:linear-gradient(145deg,#111416,#0c0f11);padding:13px 14px;transition:transform .18s,border-color .18s,background .18s}.ctgActionCard:hover{transform:translateY(-2px);border-color:rgba(227,182,83,.32);background:linear-gradient(145deg,#151718,#0c0f11)}.ctgActionIcon{display:grid;place-items:center;width:48px;height:48px;flex:none;border-radius:12px;color:var(--ctg-gold)}.ctgActionCopy{min-width:0;display:flex;flex-direction:column}.ctgActionCopy strong{font-size:12px;font-weight:580}.ctgActionCopy small{margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:rgba(255,255,255,.4);font-size:8.5px}.ctgActionArrow{margin-left:auto;display:grid;place-items:center;width:28px;height:28px;flex:none;border-radius:50%;background:rgba(255,255,255,.055);color:rgba(255,255,255,.62)}.ctgSummaryGrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin-top:10px}.ctgSummaryCard{min-height:108px;border:1px solid rgba(255,255,255,.1);border-radius:13px;background:linear-gradient(145deg,#111416,#0c0f11);padding:14px 16px;display:grid;grid-template-columns:auto 1fr auto;grid-template-rows:auto auto auto;column-gap:10px;transition:transform .18s,border-color .18s}.ctgSummaryCard:hover{transform:translateY(-2px);border-color:rgba(227,182,83,.28)}.ctgSummaryCard.featured{border-color:rgba(227,182,83,.22);background:linear-gradient(135deg,rgba(227,182,83,.1),#101214 48%)}.ctgSummaryIcon{grid-row:1/4;color:var(--ctg-gold);padding-top:4px}.ctgSummaryLabel{align-self:end;color:rgba(255,255,255,.43);font-size:9px}.ctgSummaryValue{font-size:20px;font-weight:620;line-height:1.12}.ctgSummaryHelper{color:rgba(255,255,255,.35);font-size:8px}.ctgSummaryArrow{grid-column:3;grid-row:1/4;align-self:end;color:rgba(255,255,255,.45);padding-bottom:2px}.ctgLowerGrid{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(245px,.72fr);gap:14px}.ctgActivityPanel,.ctgImpactCard,.ctgRailCard{border:1px solid rgba(255,255,255,.1);border-radius:14px;background:linear-gradient(145deg,#111416,#0c0f11);box-shadow:inset 0 1px rgba(255,255,255,.025)}.ctgActivityPanel{min-width:0;overflow:hidden}.ctgPanelHeading{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px;border-bottom:1px solid rgba(255,255,255,.075)}.ctgPanelHeading h2{font-size:15px;font-weight:610}.ctgPanelHeading p{margin-top:2px;color:rgba(255,255,255,.4);font-size:9px}.ctgActivityRows{padding:0 14px 8px}.ctgActivityItem{display:grid;grid-template-columns:34px minmax(0,1fr) 88px auto;gap:10px;align-items:center;min-height:47px;border-bottom:1px solid rgba(255,255,255,.055)}.ctgActivityItem:last-child{border-bottom:0}.ctgActivityIcon{display:grid;place-items:center;width:30px;height:30px;border:1px solid rgba(227,182,83,.16);border-radius:50%;background:rgba(227,182,83,.06);color:var(--ctg-gold)}.ctgActivityCopy{min-width:0;display:flex;flex-direction:column}.ctgActivityCopy strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:9.5px;font-weight:580}.ctgActivityCopy small{margin-top:3px;color:rgba(255,255,255,.38);font-size:8px}.ctgActivityDate{color:rgba(255,255,255,.43);font-size:8px}.ctgSuccessBadge{display:inline-flex;align-items:center;justify-content:center;gap:4px;min-width:72px;border-radius:999px;background:rgba(45,177,112,.18);padding:5px 7px;color:#58dea0;font-size:7px}.ctgLoadingRows,.ctgEmptyActivity{padding:42px 20px;text-align:center;color:rgba(255,255,255,.4);font-size:10px}.ctgEmptyActivity svg{margin:0 auto 9px;color:var(--ctg-gold)}.ctgEmptyActivity strong{display:block;color:rgba(255,255,255,.72);font-size:11px}.ctgEmptyActivity p{margin-top:4px}.ctgImpactCard{position:relative;isolation:isolate;overflow:hidden;min-height:282px;padding:22px;color:#fff}.ctgImpactOrb{position:absolute;z-index:-1;right:-80px;top:-100px;width:250px;height:250px;border-radius:50%;background:radial-gradient(circle,rgba(227,182,83,.25),rgba(227,182,83,.06) 36%,transparent 68%)}.ctgImpactContent{position:relative;z-index:2}.ctgImpactContent>p:first-child{font-size:13px}.ctgImpactContent>p:first-child span{color:var(--ctg-gold)}.ctgImpactContent h2{margin-top:8px;font-size:20px;font-weight:620;line-height:1.13}.ctgImpactCopy{margin-top:12px;max-width:205px;color:rgba(255,255,255,.56);font-size:10px;line-height:1.5}.ctgImpactButton{position:absolute;left:0;top:178px;display:inline-flex;align-items:center;gap:8px;border-radius:8px;background:linear-gradient(180deg,#efc96b,#ddb054);padding:10px 13px;color:#171006;font-size:9px;font-weight:650}.ctgImpactLogo{position:absolute;right:-45px;bottom:-58px;width:205px;height:205px;object-fit:contain;opacity:.9;filter:sepia(.05) saturate(1.3)}.ctgRightRail{display:flex;min-width:0;flex-direction:column;gap:12px}.ctgRailCard{padding:15px}.ctgRailHeading{display:flex;align-items:flex-end;justify-content:space-between;gap:12px}.ctgRailHeading h2{font-size:14px;font-weight:610}.ctgRailHeading p{margin-top:4px;color:rgba(255,255,255,.45);font-size:9px}.ctgRailHeading>strong{font-size:11px;font-weight:500}.ctgProgressBar{height:8px;margin-top:11px;border-radius:999px;background:rgba(255,255,255,.07);overflow:hidden}.ctgProgressBar span{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#e1b24d,#f0c76a)}.ctgProgressList{margin-top:12px}.ctgProgressStep{display:flex;align-items:center;gap:9px;min-height:27px;color:rgba(255,255,255,.55);font-size:9px}.ctgProgressStep>span{display:grid;place-items:center;width:17px;height:17px;border:1px solid rgba(255,255,255,.28);border-radius:50%;color:rgba(255,255,255,.38)}.ctgProgressStep>span.complete{border-color:var(--ctg-gold);background:var(--ctg-gold);color:#151006}.ctgContinueButton{display:flex;min-height:38px;align-items:center;justify-content:center;gap:8px;margin-top:11px;border-radius:8px;background:linear-gradient(180deg,#efc96b,#ddb054);color:#171006;font-size:9px;font-weight:700}.ctgContinueLoading{opacity:.55}.ctgRailHeadingCompact{align-items:center}.ctgRailHeadingCompact>span{display:grid;place-items:center;min-width:19px;height:19px;border-radius:999px;background:rgba(227,182,83,.12);color:var(--ctg-gold);font-size:8px}.ctgNotificationList{margin-top:8px}.ctgNotificationItem{display:grid;grid-template-columns:8px minmax(0,1fr) auto;align-items:start;gap:8px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.055)}.ctgNotificationItem:last-child{border-bottom:0}.ctgNotificationDot{width:7px;height:7px;margin-top:3px;border-radius:50%;background:var(--ctg-gold)}.ctgNotificationDot.blue{background:#4f8dff}.ctgNotificationItem strong{display:block;font-size:8.5px;font-weight:600}.ctgNotificationItem p{margin-top:4px;color:rgba(255,255,255,.38);font-size:7.5px;line-height:1.35}.ctgNotificationItem svg{color:rgba(255,255,255,.27)}.ctgHelpPanel{display:grid;grid-template-columns:34px 1fr;gap:10px;align-items:center}.ctgHelpIcon{display:grid;place-items:center;width:34px;height:34px;border-radius:50%;background:rgba(227,182,83,.07);color:var(--ctg-gold)}.ctgHelpPanel strong{font-size:9px}.ctgHelpPanel p{margin-top:3px;color:rgba(255,255,255,.38);font-size:7.5px}.ctgHelpPanel a{grid-column:2;display:flex;align-items:center;justify-content:center;gap:7px;border:1px solid rgba(227,182,83,.25);border-radius:7px;padding:8px;color:var(--ctg-gold);font-size:8px}.ctgAdminShortcut{display:flex;align-items:center;justify-content:center;gap:7px;border:1px dashed rgba(227,182,83,.2);border-radius:10px;padding:9px;color:rgba(255,255,255,.42);font-size:8px}.ctgAdminShortcut:hover{color:var(--ctg-gold);border-color:rgba(227,182,83,.38)}
        @media(max-width:1280px){.ctgContentGrid{grid-template-columns:minmax(0,1fr) 250px}.ctgQuickActions,.ctgSummaryGrid{grid-template-columns:repeat(2,minmax(0,1fr))}.ctgLowerGrid{grid-template-columns:1fr}.ctgImpactCard{min-height:210px}.ctgImpactButton{position:static;margin-top:18px}.ctgHeroCityNote{right:20px;width:180px}}
        @media(max-width:1080px){.ctgSidebar{display:none}.ctgWorkspace{margin-left:0}.ctgMobileBrand{display:block}.ctgTopbar{padding:0 16px}.ctgSearch{width:min(470px,52vw)}.ctgContentGrid{grid-template-columns:1fr}.ctgRightRail{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));align-items:start}.ctgAdminShortcut{grid-column:1/-1}.ctgHeroCityNote{display:none}}
        @media(max-width:760px){.ctgTopbar{height:auto;min-height:64px;flex-wrap:wrap;padding:10px 14px}.ctgMobileBrand{order:1}.ctgTopbarActions{order:2}.ctgSearch{order:3;width:100%;height:38px}.ctgProfileText,.ctgLanguage span,.ctgLanguage svg:last-child,.ctgTopDivider{display:none}.ctgProfileChip{min-width:auto}.ctgAvatar{width:34px;height:34px}.ctgDashboardMain{padding-top:0}.ctgHeroContent{padding:26px 18px}.ctgHeroContent h1{font-size:3.4rem}.ctgHeroContent>p:not(.ctgMicroLabel){font-size:12px}.ctgDesktopBreak{display:none}.ctgContentGrid{padding:12px}.ctgQuickActions,.ctgSummaryGrid{grid-template-columns:1fr 1fr}.ctgRightRail{grid-template-columns:1fr}.ctgActivityItem{grid-template-columns:34px minmax(0,1fr) auto}.ctgActivityDate{display:none}.ctgSuccessBadge{min-width:58px}.ctgLowerGrid{display:block}.ctgImpactCard{margin-top:12px}}
        @media(max-width:480px){.ctgTopbarActions{gap:3px}.ctgNotificationButton,.ctgLogout,.ctgLanguage{padding:6px}.ctgHeroActions{align-items:stretch;flex-direction:column}.ctgGoldButton,.ctgGhostButton{width:100%}.ctgQuickActions,.ctgSummaryGrid{grid-template-columns:1fr}.ctgReferenceHero{min-height:330px}.ctgActionCard{min-height:82px}.ctgSummaryCard{min-height:102px}}
      `}</style>
    </div>
  );
}

function SidebarItem({
  href,
  icon,
  label,
  active = false,
  badge,
  chevron = false,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  badge?: number;
  chevron?: boolean;
}) {
  return (
    <Link href={href} className={`ctgSidebarItem ${active ? 'active' : ''}`} aria-current={active ? 'page' : undefined}>
      {icon}
      <span>{label}</span>
      {badge ? <span className="ctgSidebarBadge">{badge}</span> : null}
      {chevron ? <ArrowRight size={13} className="ctgSidebarChevron" /> : null}
    </Link>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="ctgSectionTitle">
      <h2>{title}</h2>
      <p>{subtitle}</p>
    </div>
  );
}

function ActionCard({
  href,
  icon,
  title,
  subtitle,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <Link href={href} className="ctgActionCard">
      <span className="ctgActionIcon">{icon}</span>
      <span className="ctgActionCopy"><strong>{title}</strong><small>{subtitle}</small></span>
      <span className="ctgActionArrow"><ArrowRight size={13} /></span>
    </Link>
  );
}

function SummaryCard({
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
    <Link href={href} className={`ctgSummaryCard ${featured ? 'featured' : ''}`} aria-label={`${label}: ${value}`}>
      <span className="ctgSummaryIcon">{icon}</span>
      <span className="ctgSummaryLabel">{label}</span>
      <strong className="ctgSummaryValue" style={{ color: tone ?? '#fff' }}>{value}</strong>
      <small className="ctgSummaryHelper">{helper}</small>
      <ArrowRight size={12} className="ctgSummaryArrow" />
    </Link>
  );
}
