'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  Heart,
  Home,
  MapPin,
  MessageCircle,
  PawPrint,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Stethoscope,
  Syringe,
  UserCheck,
  Video,
  type LucideIcon,
} from 'lucide-react';
import { Container } from '@/components/ui';
import { FadeInSection } from '@/components/ui/FadeInSection';
import { useLanguage } from '@/contexts/LanguageContext';

const palette = {
  navy: '#0D1B2A',
  green: '#34B27A',
  lightGreen: '#B7E4C7',
  orange: '#FF8A3D',
  mist: '#F2F4F7',
};

const poppins: React.CSSProperties = {
  fontFamily: 'var(--font-poppins-nvet), Poppins, sans-serif',
};

type ServiceCard = {
  icon: LucideIcon;
  title: string;
  text: string;
};

function BrandMark() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="relative h-9 w-11 shrink-0">
        <Image src="/images/logo/nvet-care-icon.png" alt="" fill sizes="44px" className="object-contain" priority />
      </span>
      <span className="text-[17px] font-bold tracking-[-0.03em] text-[#0D1B2A]" style={poppins}>
        Nvet <span className="font-medium text-[#34B27A]">Care</span>
      </span>
    </div>
  );
}

function Pill({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] ${
        dark
          ? 'border-white/15 bg-white/10 text-white/85'
          : 'border-[#34B27A]/20 bg-[#34B27A]/[0.08] text-[#23865A]'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dark ? 'bg-[#B7E4C7]' : 'bg-[#34B27A]'}`} aria-hidden="true" />
      {children}
    </span>
  );
}

function FeatureIcon({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#0D1B2A]/[0.08] bg-white shadow-[0_10px_26px_rgba(13,27,42,0.08)]">
      <Icon size={19} strokeWidth={1.8} className="text-[#0D1B2A]" aria-hidden="true" />
      <span className="absolute -bottom-1 -right-1 h-2.5 w-2.5 rounded-full bg-[#FF8A3D] ring-2 ring-white" aria-hidden="true" />
    </span>
  );
}

function SectionTitle({ eyebrow, title, text, align = 'left' }: { eyebrow: string; title: string; text: string; align?: 'left' | 'center' }) {
  return (
    <div className={`${align === 'center' ? 'mx-auto text-center' : ''} max-w-3xl`}>
      <Pill>{eyebrow}</Pill>
      <h2 className="mt-5 text-3xl font-bold leading-[1.08] tracking-[-0.045em] text-[#0D1B2A] sm:text-4xl lg:text-[2.85rem]" style={poppins}>
        {title}
      </h2>
      <p className={`${align === 'center' ? 'mx-auto' : ''} mt-5 max-w-2xl text-sm leading-7 text-[#5F6B75] sm:text-base`}>
        {text}
      </p>
    </div>
  );
}

export function NvetCareHomepageV2() {
  const { locale } = useLanguage();
  const es = locale === 'es';

  const copy = es
    ? {
        nav: ['Servicios', 'Cómo funciona', 'La app', 'Cartagena'],
        status: 'En desarrollo · Cartagena',
        kicker: 'Tu mascota, en buenas manos',
        heroA: 'Cuidado veterinario,',
        heroB: 'cuando más lo necesitas.',
        heroText:
          'Una experiencia para solicitar atención, acompañar la visita y conservar el contexto de tu mascota sin convertir el cuidado en un proceso complicado.',
        primary: 'Entrar a Nvet Care',
        secondary: 'Conocer servicios',
        heroPoints: ['Atención en casa', 'Profesionales verificados', 'Seguimiento conectado'],
        servicesEyebrow: 'Servicios',
        servicesTitle: 'Lo esencial primero. El resto aparece cuando lo necesitas.',
        servicesText:
          'La portada reduce ruido y organiza el cuidado en seis necesidades claras, con una jerarquía visual pensada para decidir rápido.',
        services: [
          ['Veterinario a domicilio', 'Coordina una visita profesional en casa.'],
          ['Telemedicina', 'Consulta y orientación veterinaria por videollamada.'],
          ['Atención prioritaria', 'Una ruta clara para situaciones que requieren respuesta rápida.'],
          ['Tienda veterinaria', 'Productos para el cuidado cotidiano de tu mascota.'],
          ['Vacunas y chequeos', 'Prevención, seguimiento y recordatorios.'],
          ['Historial clínico', 'Consultas, vacunas y evolución organizadas por mascota.'],
        ],
        homeEyebrow: 'Atención en casa',
        homeTitle: 'La experiencia ocurre donde tu mascota se siente segura.',
        homeText:
          'La tecnología coordina la visita, pero el protagonismo sigue siendo el vínculo entre la familia, el profesional y la mascota.',
        homeBullets: ['Solicitud simple', 'Información de la mascota', 'Seguimiento de la visita', 'Continuidad después de la atención'],
        howEyebrow: 'Cómo funciona',
        howTitle: 'Tres momentos. Un mismo recorrido.',
        howText: 'Cada etapa tiene un propósito específico para evitar pantallas saturadas y decisiones innecesarias.',
        steps: [
          ['01', 'Solicita', 'Cuéntanos qué necesita tu mascota y dónde debe realizarse la atención.'],
          ['02', 'Coordina', 'La plataforma organiza disponibilidad, información y contexto.'],
          ['03', 'Acompaña', 'Sigue el estado de la visita y conserva la continuidad del servicio.'],
        ],
        appEyebrow: 'Producto digital',
        appTitle: 'Una app que acompaña la atención, no que compite con ella.',
        appText:
          'Inicio, solicitud, seguimiento e historial se presentan como momentos distintos de una misma experiencia para mantener claridad en móvil.',
        appCard1: 'Solicita atención',
        appCard1Text: 'Accesos principales y contexto de la mascota en una sola entrada.',
        appCard2: 'Veterinario en camino',
        appCard2Text: 'Estado de la visita, ubicación y comunicación en un mismo flujo.',
        connectedEyebrow: 'Confianza por diseño',
        connectedTitle: 'La confianza se construye antes de que empiece la consulta.',
        connectedText:
          'Identidad profesional, trazabilidad, contexto clínico y privacidad se presentan como una sola capa de servicio.',
        trust: [
          ['Profesionales verificados', 'Identidad y rol visibles dentro del flujo.'],
          ['Continuidad clínica', 'Cada atención permanece ligada a la mascota.'],
          ['Comunicación contextual', 'Mensajes y estados conservan el contexto del servicio.'],
          ['Datos protegidos', 'Acceso organizado según rol y propósito.'],
        ],
        cityEyebrow: 'Cartagena',
        cityTitle: 'Una red pensada para crecer con cobertura real.',
        cityText:
          'Cartagena es el mercado inicial. La disponibilidad debe comunicarse según capacidad operativa real, sin inventar barrios o zonas de cobertura.',
        finalTitle: 'Cuidar mejor empieza por conectar mejor.',
        finalText: 'Explora Nvet Care y conoce una experiencia veterinaria más clara, cercana y conectada.',
        finalPrimary: 'Iniciar sesión',
        finalSecondary: 'Ver cómo funciona',
      }
    : {
        nav: ['Services', 'How it works', 'The app', 'Cartagena'],
        status: 'In development · Cartagena',
        kicker: 'Your pet, in good hands',
        heroA: 'Veterinary care,',
        heroB: 'when you need it most.',
        heroText:
          'An experience to request care, follow the visit, and preserve your pet’s context without turning care into a complicated process.',
        primary: 'Enter Nvet Care',
        secondary: 'Explore services',
        heroPoints: ['At-home care', 'Verified professionals', 'Connected follow-up'],
        servicesEyebrow: 'Services',
        servicesTitle: 'What matters first. Everything else when you need it.',
        servicesText:
          'The homepage reduces noise and organizes care into six clear needs with a visual hierarchy designed for fast decisions.',
        services: [
          ['At-home veterinarian', 'Coordinate professional care at home.'],
          ['Telemedicine', 'Veterinary guidance through video.'],
          ['Priority care', 'A clear path for situations that need a faster response.'],
          ['Veterinary store', 'Products for everyday pet care.'],
          ['Vaccines and checkups', 'Prevention, follow-up, and reminders.'],
          ['Clinical history', 'Visits, vaccines, and progress organized per pet.'],
        ],
        homeEyebrow: 'At-home care',
        homeTitle: 'Care happens where your pet feels safe.',
        homeText:
          'Technology coordinates the visit while the relationship between family, professional, and pet remains at the center.',
        homeBullets: ['Simple request', 'Pet context', 'Visit tracking', 'Continuity after care'],
        howEyebrow: 'How it works',
        howTitle: 'Three moments. One journey.',
        howText: 'Each stage has a specific purpose to avoid crowded screens and unnecessary decisions.',
        steps: [
          ['01', 'Request', 'Tell us what your pet needs and where care should happen.'],
          ['02', 'Coordinate', 'The platform organizes availability, information, and context.'],
          ['03', 'Follow', 'Track the visit and preserve continuity after care.'],
        ],
        appEyebrow: 'Digital product',
        appTitle: 'An app that supports care instead of competing with it.',
        appText:
          'Home, request, tracking, and history appear as distinct moments in the same journey to keep the mobile experience clear.',
        appCard1: 'Request care',
        appCard1Text: 'Primary actions and pet context in one entry point.',
        appCard2: 'Veterinarian en route',
        appCard2Text: 'Visit status, location, and communication in one flow.',
        connectedEyebrow: 'Trust by design',
        connectedTitle: 'Trust starts before the visit begins.',
        connectedText:
          'Professional identity, traceability, clinical context, and privacy are presented as one service layer.',
        trust: [
          ['Verified professionals', 'Identity and role visible in the flow.'],
          ['Clinical continuity', 'Each care event remains linked to the pet.'],
          ['Contextual communication', 'Messages and states keep service context.'],
          ['Protected data', 'Access organized by role and purpose.'],
        ],
        cityEyebrow: 'Cartagena',
        cityTitle: 'A network designed to grow with real coverage.',
        cityText:
          'Cartagena is the initial market. Availability should reflect real operating capacity without inventing neighborhoods or coverage zones.',
        finalTitle: 'Better care starts with a better connection.',
        finalText: 'Explore Nvet Care and discover a veterinary experience designed to feel clear, close, and connected.',
        finalPrimary: 'Sign in',
        finalSecondary: 'See how it works',
      };

  const serviceIcons: LucideIcon[] = [Home, Video, Heart, ShoppingBag, Syringe, CalendarCheck];
  const services: ServiceCard[] = copy.services.map(([title, text], index) => ({
    icon: serviceIcons[index],
    title,
    text,
  }));

  const trustIcons: LucideIcon[] = [UserCheck, Stethoscope, MessageCircle, ShieldCheck];

  return (
    <div className="overflow-x-clip bg-white text-[#0D1B2A]" style={poppins}>
      <header className="sticky top-0 z-40 border-b border-[#0D1B2A]/[0.06] bg-white/90 backdrop-blur-xl">
        <Container>
          <div className="flex min-h-16 items-center justify-between gap-4">
            <a href="#nvet-home" aria-label="Nvet Care">
              <BrandMark />
            </a>
            <nav className="hidden items-center gap-6 text-xs font-medium text-[#52606C] lg:flex" aria-label="Nvet Care">
              <a href="#servicios" className="transition hover:text-[#0D1B2A]">{copy.nav[0]}</a>
              <a href="#como-funciona" className="transition hover:text-[#0D1B2A]">{copy.nav[1]}</a>
              <a href="#producto" className="transition hover:text-[#0D1B2A]">{copy.nav[2]}</a>
              <a href="#cartagena" className="transition hover:text-[#0D1B2A]">{copy.nav[3]}</a>
            </nav>
            <Link href="/nvetcareapp/iniciar-sesion" className="inline-flex min-h-10 items-center justify-center rounded-full bg-[#0D1B2A] px-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-[#183047]">
              {es ? 'Iniciar sesión' : 'Sign in'}
            </Link>
          </div>
        </Container>
      </header>

      <main>
        <section id="nvet-home" className="relative min-h-[720px] scroll-mt-20 overflow-hidden bg-[#0D1B2A] text-white sm:min-h-[760px] lg:min-h-[720px]">
          <div className="absolute inset-0 lg:left-[42%]">
            <Image
              src="/images/nvetcareapp/owner-and-dog.jpg"
              alt={es ? 'Atención veterinaria cercana en casa' : 'Close veterinary care at home'}
              fill
              priority
              sizes="100vw"
              className="object-cover object-center lg:object-[55%_center]"
            />
          </div>
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(13,27,42,0.10)_0%,rgba(13,27,42,0.86)_70%,#0D1B2A_100%)] lg:bg-[linear-gradient(90deg,#0D1B2A_0%,#0D1B2A_38%,rgba(13,27,42,0.78)_54%,rgba(13,27,42,0.18)_78%,rgba(13,27,42,0.15)_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_30%,rgba(52,178,122,0.14),transparent_38%)]" aria-hidden="true" />
          <Container className="relative z-10 flex min-h-[720px] items-end pb-12 pt-24 sm:min-h-[760px] sm:pb-16 lg:min-h-[720px] lg:items-center lg:py-24">
            <div className="grid w-full items-center gap-12 lg:grid-cols-[0.86fr_1.14fr]">
              <FadeInSection>
                <div className="max-w-2xl">
                  <div className="flex flex-wrap items-center gap-3">
                    <Pill dark>{copy.status}</Pill>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/65">{copy.kicker}</span>
                  </div>
                  <h1 className="mt-7 text-4xl font-extrabold leading-[0.98] tracking-[-0.055em] sm:text-5xl lg:text-[4.25rem]">
                    {copy.heroA}{' '}
                    <span className="text-[#76D7A8]">{copy.heroB}</span>
                  </h1>
                  <p className="mt-7 max-w-xl text-base leading-8 text-white/72 sm:text-lg">{copy.heroText}</p>
                  <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                    <Link href="/nvetcareapp/iniciar-sesion" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#34B27A] px-6 text-xs font-semibold uppercase tracking-[0.08em] text-white shadow-[0_18px_42px_rgba(52,178,122,0.25)] transition hover:-translate-y-0.5 hover:bg-[#2D9F6D]">
                      {copy.primary} <ArrowRight size={15} aria-hidden="true" />
                    </Link>
                    <a href="#servicios" className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/20 bg-white/10 px-6 text-xs font-semibold uppercase tracking-[0.08em] text-white backdrop-blur transition hover:bg-white/15">
                      {copy.secondary}
                    </a>
                  </div>
                  <div className="mt-8 flex flex-wrap gap-x-5 gap-y-3 text-xs text-white/70">
                    {copy.heroPoints.map((point, index) => {
                      const Icon = [Home, ShieldCheck, Smartphone][index];
                      return (
                        <span key={point} className="inline-flex items-center gap-2">
                          <Icon size={14} className="text-[#76D7A8]" aria-hidden="true" /> {point}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </FadeInSection>

              <div className="hidden justify-end lg:flex">
                <div className="relative mr-4 h-[520px] w-[280px] translate-y-8 overflow-hidden rounded-[2.3rem] border-[8px] border-white/90 bg-white shadow-[0_36px_90px_rgba(0,0,0,0.38)]">
                  <Image src="/images/nvetcareapp/home-screen-phone.jpg" alt="Nvet Care mobile app" fill sizes="280px" className="object-cover object-top" priority />
                </div>
              </div>
            </div>
          </Container>
        </section>

        <section id="servicios" className="scroll-mt-24 bg-white py-20 sm:py-24 lg:py-28">
          <Container>
            <SectionTitle eyebrow={copy.servicesEyebrow} title={copy.servicesTitle} text={copy.servicesText} align="center" />
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((service, index) => {
                const Icon = service.icon;
                const tones = ['#F0FAF5', '#F1F7FC', '#FFF3EF', '#FFF9EE', '#F2FAF6', '#F6F4FB'];
                return (
                  <FadeInSection key={service.title} delay={index * 0.03}>
                    <article className="group h-full rounded-[1.75rem] border border-[#0D1B2A]/[0.06] bg-white p-6 shadow-[0_14px_42px_rgba(13,27,42,0.055)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_54px_rgba(13,27,42,0.09)]">
                      <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: tones[index] }}>
                        <Icon size={21} strokeWidth={1.8} className="text-[#0D1B2A]" aria-hidden="true" />
                      </span>
                      <h3 className="mt-5 text-base font-semibold tracking-[-0.02em] text-[#0D1B2A]">{service.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-[#69757F]">{service.text}</p>
                      <div className="mt-5 h-px bg-[#0D1B2A]/[0.06]" />
                      <span className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[#23865A]">
                        {es ? 'Conocer más' : 'Learn more'} <ArrowRight size={13} aria-hidden="true" />
                      </span>
                    </article>
                  </FadeInSection>
                );
              })}
            </div>
          </Container>
        </section>

        <section className="border-y border-[#0D1B2A]/[0.05] bg-[#F4F8F6] py-20 sm:py-24 lg:py-28">
          <Container>
            <div className="grid items-center gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:gap-14">
              <FadeInSection direction="left">
                <div className="relative overflow-hidden rounded-[2.2rem] bg-white shadow-[0_28px_80px_rgba(13,27,42,0.12)]">
                  <div className="relative aspect-[16/11]">
                    <Image src="/images/nvetcareapp/mission-banner.jpg" alt={copy.homeTitle} fill sizes="(min-width:1024px) 54vw, 94vw" className="object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0D1B2A]/50 via-transparent to-transparent" />
                    <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/40 bg-white/92 p-4 shadow-xl backdrop-blur sm:bottom-7 sm:left-7 sm:right-auto sm:max-w-[330px]">
                      <div className="flex items-center gap-3">
                        <FeatureIcon icon={PawPrint} />
                        <div>
                          <p className="text-sm font-semibold text-[#0D1B2A]">{es ? 'Cuidado centrado en la mascota' : 'Pet-centered care'}</p>
                          <p className="mt-1 text-[11px] leading-5 text-[#69757F]">{es ? 'Menos traslados, menos fricción y más contexto.' : 'Less travel, less friction, more context.'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </FadeInSection>

              <FadeInSection direction="right">
                <div>
                  <SectionTitle eyebrow={copy.homeEyebrow} title={copy.homeTitle} text={copy.homeText} />
                  <div className="mt-8 grid gap-3 sm:grid-cols-2">
                    {copy.homeBullets.map((item, index) => {
                      const Icon = [MessageCircle, PawPrint, MapPin, Heart][index];
                      return (
                        <div key={item} className="flex items-center gap-3 rounded-2xl border border-[#0D1B2A]/[0.06] bg-white p-4">
                          <Icon size={17} className="text-[#34B27A]" aria-hidden="true" />
                          <span className="text-sm font-medium text-[#0D1B2A]">{item}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </FadeInSection>
            </div>
          </Container>
        </section>

        <section id="como-funciona" className="scroll-mt-24 bg-white py-20 sm:py-24 lg:py-28">
          <Container>
            <SectionTitle eyebrow={copy.howEyebrow} title={copy.howTitle} text={copy.howText} align="center" />
            <div className="relative mt-12 grid gap-4 lg:grid-cols-3">
              <div className="pointer-events-none absolute left-[16.6%] right-[16.6%] top-8 hidden border-t border-dashed border-[#34B27A]/35 lg:block" aria-hidden="true" />
              {copy.steps.map(([number, title, text], index) => {
                const Icon = [MessageCircle, CalendarCheck, CheckCircle2][index];
                return (
                  <FadeInSection key={number} delay={index * 0.05}>
                    <article className="relative rounded-[1.75rem] border border-[#0D1B2A]/[0.06] bg-[#F8FBF9] p-6 text-center sm:p-8">
                      <span className="relative z-10 mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full bg-[#34B27A] text-lg font-bold text-white shadow-[0_14px_30px_rgba(52,178,122,0.25)]">{number}</span>
                      <Icon size={20} className="mx-auto mt-6 text-[#34B27A]" aria-hidden="true" />
                      <h3 className="mt-3 text-lg font-semibold text-[#0D1B2A]">{title}</h3>
                      <p className="mt-3 text-sm leading-6 text-[#68747F]">{text}</p>
                    </article>
                  </FadeInSection>
                );
              })}
            </div>
          </Container>
        </section>

        <section id="producto" className="scroll-mt-24 overflow-hidden bg-[#0D1B2A] py-20 text-white sm:py-24 lg:py-28">
          <Container>
            <div className="grid items-start gap-12 lg:grid-cols-[0.82fr_1.18fr] lg:gap-16">
              <FadeInSection>
                <div className="lg:sticky lg:top-28">
                  <Pill dark>{copy.appEyebrow}</Pill>
                  <h2 className="mt-5 text-3xl font-bold leading-[1.08] tracking-[-0.045em] sm:text-4xl lg:text-[2.85rem]">{copy.appTitle}</h2>
                  <p className="mt-5 max-w-xl text-sm leading-7 text-white/65 sm:text-base">{copy.appText}</p>
                  <div className="mt-8 flex flex-wrap gap-3">
                    <span className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs text-white/70">{es ? 'Solicitud' : 'Request'}</span>
                    <span className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs text-white/70">{es ? 'Seguimiento' : 'Tracking'}</span>
                    <span className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs text-white/70">{es ? 'Historial' : 'History'}</span>
                  </div>
                </div>
              </FadeInSection>

              <div className="grid gap-5 sm:grid-cols-2">
                <FadeInSection direction="left">
                  <article className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.055] p-5 sm:p-6">
                    <div className="relative mx-auto h-[470px] w-full max-w-[300px] overflow-hidden rounded-[2rem] border-[7px] border-white bg-white shadow-[0_28px_60px_rgba(0,0,0,0.36)]">
                      <Image src="/images/nvetcareapp/home-screen-phone.jpg" alt={copy.appCard1} fill sizes="300px" className="object-cover object-top" />
                    </div>
                    <h3 className="mt-6 text-lg font-semibold">{copy.appCard1}</h3>
                    <p className="mt-2 text-sm leading-6 text-white/60">{copy.appCard1Text}</p>
                  </article>
                </FadeInSection>
                <FadeInSection direction="right" delay={0.04}>
                  <article className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.055] p-5 sm:p-6">
                    <div className="relative mx-auto h-[470px] w-full max-w-[300px] overflow-hidden rounded-[2rem] border-[7px] border-white bg-[#EAF7F0] shadow-[0_28px_60px_rgba(0,0,0,0.36)]">
                      <Image src={es ? '/images/nvetcareapp/vet-tracking-mockup-es.png' : '/images/nvetcareapp/vet-tracking-mockup-en.png'} alt={copy.appCard2} fill sizes="300px" className="object-contain p-2" />
                    </div>
                    <h3 className="mt-6 text-lg font-semibold">{copy.appCard2}</h3>
                    <p className="mt-2 text-sm leading-6 text-white/60">{copy.appCard2Text}</p>
                  </article>
                </FadeInSection>
              </div>
            </div>
          </Container>
        </section>

        <section className="bg-white py-20 sm:py-24 lg:py-28">
          <Container>
            <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-14">
              <FadeInSection direction="left">
                <div>
                  <SectionTitle eyebrow={copy.connectedEyebrow} title={copy.connectedTitle} text={copy.connectedText} />
                  <div className="mt-8 grid gap-3 sm:grid-cols-2">
                    {copy.trust.map(([title, text], index) => {
                      const Icon = trustIcons[index];
                      return (
                        <div key={title} className="rounded-2xl border border-[#0D1B2A]/[0.06] bg-[#F8FBF9] p-4">
                          <FeatureIcon icon={Icon} />
                          <h3 className="mt-4 text-sm font-semibold text-[#0D1B2A]">{title}</h3>
                          <p className="mt-2 text-xs leading-5 text-[#69757F]">{text}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </FadeInSection>
              <FadeInSection direction="right">
                <div className="relative overflow-hidden rounded-[2.2rem] border border-[#0D1B2A]/[0.06] bg-[#F6FAF8] shadow-[0_28px_80px_rgba(13,27,42,0.10)]">
                  <div className="relative aspect-[4/3]">
                    <Image src="/images/nvetcareapp/feature-showcase.jpg" alt={copy.connectedTitle} fill sizes="(min-width:1024px) 50vw, 94vw" className="object-cover" />
                  </div>
                </div>
              </FadeInSection>
            </div>
          </Container>
        </section>

        <section id="cartagena" className="scroll-mt-24 border-y border-[#0D1B2A]/[0.05] bg-[#F4F8F6] py-20 sm:py-24 lg:py-28">
          <Container>
            <div className="grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14">
              <FadeInSection>
                <div>
                  <SectionTitle eyebrow={copy.cityEyebrow} title={copy.cityTitle} text={copy.cityText} />
                  <div className="mt-8 flex flex-wrap gap-3">
                    <span className="inline-flex items-center gap-2 rounded-full border border-[#34B27A]/20 bg-white px-4 py-2 text-xs font-semibold text-[#0D1B2A]"><MapPin size={14} className="text-[#34B27A]" /> Cartagena</span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-[#34B27A]/20 bg-white px-4 py-2 text-xs font-semibold text-[#0D1B2A]"><Clock3 size={14} className="text-[#34B27A]" /> {es ? 'Cobertura según disponibilidad' : 'Coverage by availability'}</span>
                  </div>
                </div>
              </FadeInSection>
              <FadeInSection direction="right">
                <div className="relative min-h-[390px] overflow-hidden rounded-[2.2rem] bg-[#0D1B2A] shadow-[0_28px_80px_rgba(13,27,42,0.14)]">
                  <Image src="/images/nvetcareapp/pattern-nodes.png" alt="" fill sizes="(min-width:1024px) 56vw, 94vw" className="object-cover opacity-55" />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(52,178,122,0.22),transparent_46%)]" />
                  <div className="absolute inset-0 flex items-center justify-center p-8 text-center">
                    <div>
                      <span className="mx-auto inline-flex h-20 w-20 items-center justify-center rounded-[1.7rem] border border-white/10 bg-white/[0.07] shadow-2xl backdrop-blur">
                        <MapPin size={32} className="text-[#76D7A8]" />
                      </span>
                      <p className="mt-5 text-3xl font-bold tracking-[-0.04em] text-white">Cartagena</p>
                      <p className="mt-2 text-sm text-white/55">Colombia</p>
                    </div>
                  </div>
                </div>
              </FadeInSection>
            </div>
          </Container>
        </section>

        <section className="bg-white py-20 sm:py-24 lg:py-28">
          <Container>
            <FadeInSection>
              <div className="relative overflow-hidden rounded-[2.4rem] bg-[#0D1B2A] px-6 py-12 text-center text-white shadow-[0_32px_90px_rgba(13,27,42,0.16)] sm:px-10 sm:py-16 lg:px-16">
                <div className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-[#34B27A]/20 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-28 -right-20 h-72 w-72 rounded-full bg-[#FF8A3D]/10 blur-3xl" />
                <div className="relative mx-auto max-w-3xl">
                  <BrandMark />
                  <h2 className="mt-7 text-3xl font-bold leading-[1.08] tracking-[-0.045em] text-white sm:text-4xl lg:text-[3rem]">{copy.finalTitle}</h2>
                  <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-white/65 sm:text-base">{copy.finalText}</p>
                  <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                    <Link href="/nvetcareapp/iniciar-sesion" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#34B27A] px-6 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-[#2D9F6D]">
                      {copy.finalPrimary} <ArrowRight size={15} />
                    </Link>
                    <a href="#como-funciona" className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] px-6 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-white/10">
                      {copy.finalSecondary}
                    </a>
                  </div>
                </div>
              </div>
            </FadeInSection>
          </Container>
        </section>
      </main>
    </div>
  );
}
