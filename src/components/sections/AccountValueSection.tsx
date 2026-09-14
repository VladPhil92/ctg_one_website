'use client';

import Link from 'next/link';
import {
  ArrowUpRight,
  BookOpenCheck,
  Fingerprint,
  Gift,
  LayoutDashboard,
  WalletCards,
} from 'lucide-react';

import { Container } from '@/components/ui';
import { FadeInSection } from '@/components/ui/FadeInSection';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

export const AccountValueSection: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const { locale } = useLanguage();
  const es = locale === 'es';

  const benefits = es
    ? [
        {
          icon: Fingerprint,
          title: 'Una identidad CTG One',
          text: 'Usa una sola cuenta para tu perfil, verificación de identidad y acceso a las experiencias compatibles del ecosistema.',
          status: 'Disponible',
        },
        {
          icon: WalletCards,
          title: 'Wallet y actividad',
          text: 'Consulta tu saldo, movimientos y capacidades financieras habilitadas sin administrar cuentas separadas para cada producto.',
          status: 'Disponible',
        },
        {
          icon: BookOpenCheck,
          title: 'Tu educación',
          text: 'Conserva en tu cuenta cursos, conferencias, recursos y accesos educativos que hayas activado o adquirido.',
          status: 'Disponible',
        },
        {
          icon: LayoutDashboard,
          title: 'Un centro de control',
          text: 'Reúne identidad, Wallet, inversión, educación y accesos a servicios habilitados desde un dashboard personal.',
          status: 'Disponible',
        },
      ]
    : [
        {
          icon: Fingerprint,
          title: 'One CTG One identity',
          text: 'Use one account for your profile, identity verification and access to compatible ecosystem experiences.',
          status: 'Available',
        },
        {
          icon: WalletCards,
          title: 'Wallet and activity',
          text: 'Review your balance, activity and enabled financial capabilities without managing separate accounts for each product.',
          status: 'Available',
        },
        {
          icon: BookOpenCheck,
          title: 'Your education',
          text: 'Keep courses, talks, resources and educational access you activate or purchase attached to your account.',
          status: 'Available',
        },
        {
          icon: LayoutDashboard,
          title: 'One control center',
          text: 'Bring identity, Wallet, investment, education and enabled service access together in one personal dashboard.',
          status: 'Available',
        },
      ];

  return (
    <section
      className="relative overflow-hidden border-y border-white/[0.06] bg-[#04070b] py-16 sm:py-20 md:py-24"
      aria-labelledby="account-value-title"
    >
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(circle at 18% 20%, rgba(214,174,86,.09), transparent 28%), radial-gradient(circle at 82% 76%, rgba(36,140,255,.07), transparent 30%)',
        }}
      />

      <Container size="large" className="relative z-10">
        <FadeInSection>
          <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-end lg:gap-12">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#d6ae56]/25 bg-[#d6ae56]/[0.055] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#f1c75b]">
                <Fingerprint size={14} aria-hidden="true" />
                {es ? 'Valor de tu cuenta' : 'Your account value'}
              </div>
              <h2
                id="account-value-title"
                className="max-w-[720px] font-outfit text-4xl font-semibold leading-[0.98] tracking-[-0.045em] text-white sm:text-5xl md:text-6xl"
              >
                {es ? '¿Para qué crear una cuenta CTG One?' : 'Why create a CTG One account?'}
              </h2>
            </div>

            <div className="max-w-2xl lg:justify-self-end">
              <p className="text-base leading-relaxed text-white/68 sm:text-lg">
                {es
                  ? 'Porque tu cuenta no es solo un inicio de sesión: es la identidad que conecta las funciones que ya puedes usar dentro de CTG One y conserva tu actividad a medida que el ecosistema crece.'
                  : 'Because your account is more than a sign-in: it is the identity that connects the CTG One capabilities you can already use and keeps your activity together as the ecosystem grows.'}
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href={isLoading || !isAuthenticated ? '/registro' : '/dashboard'}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#d6ae56] px-5 text-sm font-semibold text-[#080b10] transition hover:-translate-y-0.5 hover:bg-[#f1c75b]"
                >
                  {isAuthenticated ? (es ? 'Ir a mi cuenta' : 'Go to my account') : (es ? 'Crear mi cuenta' : 'Create my account')}
                  <ArrowUpRight size={16} aria-hidden="true" />
                </Link>
                <Link
                  href="/ecosystem"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.025] px-5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:border-[#d6ae56]/35 hover:bg-white/[0.05]"
                >
                  {es ? 'Ver ecosistema' : 'View ecosystem'}
                </Link>
              </div>
            </div>
          </div>
        </FadeInSection>

        <div className="mt-10 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {benefits.map(({ icon: Icon, title, text, status }, index) => (
            <FadeInSection key={title} delay={0.04 * index}>
              <article className="h-full rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#d6ae56]/20 bg-[#d6ae56]/[0.05] text-[#f1c75b]">
                    <Icon size={18} strokeWidth={1.5} aria-hidden="true" />
                  </span>
                  <span className="rounded-full border border-emerald-400/20 bg-emerald-400/[0.06] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-emerald-300/85">
                    {status}
                  </span>
                </div>
                <h3 className="mt-5 font-outfit text-xl font-semibold tracking-[-0.025em] text-white">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/52">{text}</p>
              </article>
            </FadeInSection>
          ))}
        </div>

        <FadeInSection delay={0.18}>
          <div className="mt-4 flex flex-col gap-4 rounded-2xl border border-[#248cff]/15 bg-[#248cff]/[0.035] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#248cff]/20 bg-[#248cff]/[0.06] text-[#78baff]">
                <Gift size={18} strokeWidth={1.5} aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold text-white">CTG Rewards</p>
                <p className="mt-1 max-w-3xl text-xs leading-relaxed text-white/48 sm:text-sm">
                  {es
                    ? 'La fidelización transversal entre negocios sigue en roadmap. Crear una cuenta hoy no significa que ya estés acumulando puntos o recompensas; esa capacidad solo se activará cuando exista un programa operativo y verificable.'
                    : 'Cross-business loyalty remains on the roadmap. Creating an account today does not mean you are already earning points or rewards; that capability will only be activated when an operational, verifiable program exists.'}
                </p>
              </div>
            </div>
            <Link href="/rewards" className="inline-flex min-h-11 shrink-0 items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-[#78baff] hover:text-white">
              {es ? 'Ver roadmap' : 'View roadmap'} <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </FadeInSection>
      </Container>
    </section>
  );
};
