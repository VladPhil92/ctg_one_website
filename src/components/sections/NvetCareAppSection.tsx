'use client';

import React, { type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  CalendarCheck,
  Check,
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

const poppinsFont: React.CSSProperties = {
  fontFamily: 'var(--font-poppins-nvet), Poppins, sans-serif',
};

type Service = {
  icon: LucideIcon;
  title: string;
  text: string;
};

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[#34B27A]/20 bg-[#34B27A]/[0.08] px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#23865A]">
      <span className="h-1.5 w-1.5 rounded-full bg-[#34B27A]" aria-hidden="true" />
      {children}
    </span>
  );
}

function IconBubble({ icon: Icon, dark = false }: { icon: LucideIcon; dark?: boolean }) {
  return (
    <span
      className={`relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border shadow-[0_8px_24px_rgba(13,27,42,0.06)] ${
        dark ? 'border-white/10 bg-white/[0.06]' : 'border-[#0D1B2A]/[0.08] bg-white'
      }`}
    >
      <Icon size={19} strokeWidth={1.8} className={dark ? 'text-white' : 'text-[#0D1B2A]'} aria-hidden="true" />
      <span
        className={`absolute -bottom-1 -right-1 h-2.5 w-2.5 rounded-full bg-[#FF8A3D] ring-2 ${
          dark ? 'ring-[#0D1B2A]' : 'ring-white'
        }`}
        aria-hidden="true"
      />
    </span>
  );
}

function SectionHeading({
  eyebrow,
  title,
  text,
  align = 'center',
}: {
  eyebrow: string;
  title: string;
  text: string;
  align?: 'center' | 'left';
}) {
  return (
    <div className={`${align === 'center' ? 'mx-auto text-center' : ''} max-w-3xl`}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2
        className="mt-5 text-3xl font-bold tracking-[-0.035em] text-[#0D1B2A] sm:text-4xl lg:text-[2.7rem]"
        style={poppinsFont}
      >
        {title}
      </h2>
      <p className={`${align === 'center' ? 'mx-auto' : ''} mt-5 max-w-2xl text-sm leading-7 text-[#5B6670] sm:text-base`}>
        {text}
      </p>
    </div>
  );
}

function ServiceCard({ service, index }: { service: Service; index: number }) {
  const Icon = service.icon;
  const surfaces = ['bg-[#F1FAF5]', 'bg-[#F2F7FC]', 'bg-[#FFF5F0]', 'bg-[#FFF9EF]', 'bg-[#F3FAF7]', 'bg-[#F6F5FB]'];

  return (
    <article className="group h-full rounded-[1.6rem] border border-[#0D1B2A]/[0.06] bg-white p-5 shadow-[0_14px_40px_rgba(13,27,42,0.045)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_50px_rgba(13,27,42,0.08)] sm:p-6">
      <span className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${surfaces[index % surfaces.length]}`}>
        <Icon size={21} strokeWidth={1.8} className="text-[#0D1B2A]" aria-hidden="true" />
      </span>
      <h3 className="mt-5 text-base font-semibold tracking-[-0.02em] text-[#0D1B2A]" style={poppinsFont}>
        {service.title}
      </h3>
      <p className="mt-2 text-sm leading-6 text-[#69757F]">{service.text}</p>
    </article>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-[#0D1B2A]/[0.06] bg-white/90 px-4 py-4 shadow-[0_10px_30px_rgba(13,27,42,0.06)] backdrop-blur">
      <p className="text-xl font-bold tracking-[-0.03em] text-[#0D1B2A]" style={poppinsFont}>{value}</p>
      <p className="mt-1 text-[11px] leading-5 text-[#6B7783]">{label}</p>
    </div>
  );
}

export const NvetCareAppSection: React.FC = () => {
  const { locale } = useLanguage();
  const es = locale === 'es';

  const copy = es
    ? {
        navServices: 'Servicios',
        navHow: 'Cómo funciona',
        navApp: 'La app',
        navTrust: 'Confianza',
        navVet: 'Veterinarios',
        login: 'Iniciar sesión',
        maturity: 'En desarrollo · Cartagena',
        heroKicker: 'Atención veterinaria conectada',
        heroTitleA: 'Cuidado veterinario,',
        heroTitleB: 'cuando más lo necesitas.',
        heroText: 'Una experiencia diseñada para conectar familias y profesionales veterinarios, coordinar atención en casa y conservar el contexto de cada mascota en un solo lugar.',
        heroPrimary: 'Entrar a Nvet Care',
        heroSecondary: 'Conocer servicios',
        heroMicro: ['Profesionales verificados', 'Atención a domicilio', 'Seguimiento conectado'],
        servicesEyebrow: 'Servicios',
        servicesTitle: 'Todo el cuidado, con una jerarquía más simple.',
        servicesText: 'La portada prioriza las necesidades principales y deja los detalles para el momento adecuado. Menos ruido visual, más claridad para decidir.',
        services: [
          ['Veterinario a domicilio', 'Coordina una visita profesional en casa.'],
          ['Telemedicina', 'Orientación veterinaria por videollamada.'],
          ['Atención prioritaria', 'Un acceso claro para situaciones que requieren respuesta rápida.'],
          ['Tienda veterinaria', 'Productos y cuidado diario en una misma experiencia.'],
          ['Vacunas y chequeos', 'Prevención, seguimiento y recordatorios.'],
          ['Historial clínico', 'Consultas, vacunas y evolución organizadas por mascota.'],
        ],
        homeEyebrow: 'Atención en casa',
        homeTitle: 'La tecnología acompaña la consulta; no compite con ella.',
        homeText: 'Nvet organiza la solicitud y el seguimiento, mientras la experiencia de atención permanece centrada en la mascota y su familia.',
        steps: [
          ['01', 'Solicita', 'Indica qué necesita tu mascota y dónde debe realizarse la atención.'],
          ['02', 'Coordina', 'La plataforma organiza disponibilidad, información y contexto del servicio.'],
          ['03', 'Acompaña', 'Consulta el estado de la visita y mantén la comunicación en un mismo flujo.'],
        ],
        appEyebrow: 'Producto digital',
        appTitle: 'La app concentra lo importante sin convertir cada pantalla en un tablero.',
        appText: 'Solicitud, seguimiento e historial aparecen como momentos distintos de una misma experiencia. En móvil, las visualizaciones se presentan en carrusel para conservar legibilidad.',
        appCardHome: 'Inicio y solicitudes',
        appCardHomeText: 'Accesos principales, próxima atención y contexto de la mascota.',
        appCardTracking: 'Seguimiento de visita',
        appCardTrackingText: 'Estado, comunicación y llegada del profesional en una sola vista.',
        connectedEyebrow: 'Experiencia conectada',
        connectedTitle: 'De la coordinación digital a la atención real.',
        connectedText: 'La página separa claramente producto, servicio y confianza para que cada imagen tenga un propósito específico.',
        familiesTitle: 'Para familias',
        familiesText: 'Menos fricción para pedir ayuda, mantener el historial y entender qué está ocurriendo en cada etapa.',
        familiesItems: ['Perfil e historial por mascota', 'Seguimiento de la atención', 'Comunicación en un mismo flujo'],
        vetsTitle: 'Para profesionales',
        vetsText: 'Identidad, disponibilidad y contexto operativo organizados alrededor de la atención.',
        vetsItems: ['Credenciales y permisos', 'Gestión de visitas', 'Continuidad clínica y operativa'],
        coverageEyebrow: 'Cartagena',
        coverageTitle: 'Mercado inicial, cobertura comunicada con responsabilidad.',
        coverageText: 'La disponibilidad debe mostrarse según capacidad real. Por eso la página evita dibujar zonas ficticias y utiliza una visualización de red hasta que la cobertura operativa pueda publicarse con precisión.',
        coverageMetricA: '1 ciudad',
        coverageMetricAText: 'mercado inicial',
        coverageMetricB: 'Por zonas',
        coverageMetricBText: 'expansión operativa',
        trustEyebrow: 'Confianza por diseño',
        trustTitle: 'La experiencia profesional empieza antes de que el veterinario llegue.',
        trustText: 'Identidad, trazabilidad, privacidad y continuidad forman una sola capa de confianza. El diseño los agrupa para evitar repetir mensajes en múltiples secciones.',
        trustCards: [
          ['Identidad', 'Verificación de cuentas y profesionales.'],
          ['Trazabilidad', 'Estados e interacciones conservan contexto.'],
          ['Continuidad', 'Cada atención se vincula a la mascota.'],
          ['Privacidad', 'Acceso a información según rol y propósito.'],
        ],
        missionTitle: 'Tecnología que acerca el cuidado a la vida real.',
        missionText: 'Una página menos saturada permite que la fotografía humana, la interfaz del producto y la propuesta profesional se complementen en lugar de competir entre sí.',
        faqTitle: 'Preguntas frecuentes',
        faqs: [
          ['¿Nvet Care ya está disponible?', 'Nvet Care continúa en desarrollo y Cartagena es su mercado inicial. La disponibilidad de funciones se comunicará a medida que cada capacidad complete su validación.'],
          ['¿Nvet reemplaza una clínica de urgencias?', 'No. Ante una emergencia veterinaria, contacta un servicio de urgencias habilitado.'],
          ['¿Cómo se gestiona la identidad profesional?', 'Las credenciales, permisos y roles profesionales forman parte de la experiencia de Nvet y se administran de acuerdo con el flujo del servicio.'],
        ],
        finalTitle: 'El cuidado empieza con una mejor conexión.',
        finalText: 'Explora Nvet Care y conoce una experiencia veterinaria diseñada para ser clara, cercana y conectada.',
        finalPrimary: 'Iniciar sesión',
        finalSecondary: 'Ver cómo funciona',
      }
    : {
        navServices: 'Services',
        navHow: 'How it works',
        navApp: 'The app',
        navTrust: 'Trust',
        navVet: 'Veterinarians',
        login: 'Sign in',
        maturity: 'In development · Cartagena',
        heroKicker: 'Connected veterinary care',
        heroTitleA: 'Veterinary care,',
        heroTitleB: 'when you need it most.',
        heroText: 'An experience designed to connect families and veterinary professionals, coordinate at-home care, and keep each pet’s context in one place.',
        heroPrimary: 'Enter Nvet Care',
        heroSecondary: 'Explore services',
        heroMicro: ['Verified professionals', 'At-home care', 'Connected follow-up'],
        servicesEyebrow: 'Services',
        servicesTitle: 'Pet care with a simpler hierarchy.',
        servicesText: 'The homepage prioritizes primary needs and reveals detail at the right moment. Less visual noise, more clarity when making a decision.',
        services: [
          ['At-home veterinarian', 'Coordinate professional care at home.'],
          ['Telemedicine', 'Veterinary guidance by video call.'],
          ['Priority care', 'A clear path for situations that require a faster response.'],
          ['Veterinary store', 'Products and daily care in one experience.'],
          ['Vaccines and checkups', 'Prevention, follow-up, and reminders.'],
          ['Clinical history', 'Visits, vaccines, and progress organized per pet.'],
        ],
        homeEyebrow: 'Care at home',
        homeTitle: 'Technology supports the visit instead of competing with it.',
        homeText: 'Nvet organizes the request and follow-up while the care experience remains centered on the pet and family.',
        steps: [
          ['01', 'Request', 'Tell us what your pet needs and where care should take place.'],
          ['02', 'Coordinate', 'The platform organizes availability, information, and service context.'],
          ['03', 'Follow', 'Track the visit and keep communication in one flow.'],
        ],
        appEyebrow: 'Digital product',
        appTitle: 'The app keeps what matters together without turning every screen into a dashboard.',
        appText: 'Request, tracking, and history appear as distinct moments in one experience. On mobile, product visuals become a swipeable gallery to preserve readability.',
        appCardHome: 'Home and requests',
        appCardHomeText: 'Primary actions, upcoming care, and pet context.',
        appCardTracking: 'Visit tracking',
        appCardTrackingText: 'Status, communication, and professional arrival in one view.',
        connectedEyebrow: 'Connected experience',
        connectedTitle: 'From digital coordination to real-world care.',
        connectedText: 'The page clearly separates product, service, and trust so each visual has a specific purpose.',
        familiesTitle: 'For families',
        familiesText: 'Less friction when asking for help, keeping records, and understanding each stage of care.',
        familiesItems: ['Pet profile and history', 'Care follow-up', 'Communication in one flow'],
        vetsTitle: 'For professionals',
        vetsText: 'Identity, availability, and operating context organized around care.',
        vetsItems: ['Credentials and permissions', 'Visit management', 'Clinical and operational continuity'],
        coverageEyebrow: 'Cartagena',
        coverageTitle: 'Initial market, with responsible coverage communication.',
        coverageText: 'Availability should reflect real operating capacity. The page therefore uses a network visualization until coverage can be published accurately.',
        coverageMetricA: '1 city',
        coverageMetricAText: 'initial market',
        coverageMetricB: 'By zones',
        coverageMetricBText: 'operating expansion',
        trustEyebrow: 'Trust by design',
        trustTitle: 'The professional experience starts before the veterinarian arrives.',
        trustText: 'Identity, traceability, privacy, and continuity form one trust layer. The design groups them to avoid repeating the same message across the page.',
        trustCards: [
          ['Identity', 'Verification for accounts and professionals.'],
          ['Traceability', 'Relevant states and interactions preserve context.'],
          ['Continuity', 'Each care event remains linked to the pet.'],
          ['Privacy', 'Information access follows role and purpose.'],
        ],
        missionTitle: 'Technology that brings care closer to real life.',
        missionText: 'A less crowded page lets human photography, the product interface, and the professional proposition support one another rather than compete.',
        faqTitle: 'Frequently asked questions',
        faqs: [
          ['Is Nvet Care already available?', 'Nvet Care remains in development and Cartagena is its initial market. Feature availability will be communicated as each capability completes validation.'],
          ['Does Nvet replace an emergency clinic?', 'No. In a veterinary emergency, contact an authorized emergency service.'],
          ['How is professional identity managed?', 'Professional credentials, permissions, and roles are managed within the Nvet experience according to the service flow.'],
        ],
        finalTitle: 'Better care starts with a better connection.',
        finalText: 'Explore Nvet Care and discover a veterinary experience designed to feel clear, close, and connected.',
        finalPrimary: 'Sign in',
        finalSecondary: 'See how it works',
      };

  const serviceIcons: LucideIcon[] = [Home, Video, Heart, ShoppingBag, Syringe, CalendarCheck];
  const services: Service[] = copy.services.map(([title, text], index) => ({ icon: serviceIcons[index], title, text }));
  const trustIcons: LucideIcon[] = [UserCheck, ShieldCheck, Heart, ShieldCheck];

  return (
    <div className="overflow-x-clip bg-white text-[#0D1B2A]">
      <header className="sticky top-0 z-40 border-b border-[#0D1B2A]/[0.06] bg-white/92 backdrop-blur-xl">
        <Container>
          <div className="flex min-h-16 items-center justify-between gap-5">
            <a href="#nvet-top" className="flex items-center gap-2.5" aria-label="Nvet Care">
              <span className="relative h-9 w-11">
                <Image src="/images/logo/nvet-care-icon.png" alt="" fill sizes="44px" className="object-contain" priority />
              </span>
              <span className="text-base font-bold tracking-[-0.02em]" style={poppinsFont}>
                Nvet <span className="text-[#34B27A]">Care</span>
              </span>
            </a>

            <nav className="hidden items-center gap-6 text-xs font-medium text-[#52606C] xl:flex" aria-label="Nvet Care">
              <a href="#servicios" className="transition hover:text-[#0D1B2A]">{copy.navServices}</a>
              <a href="#como-funciona" className="transition hover:text-[#0D1B2A]">{copy.navHow}</a>
              <a href="#producto" className="transition hover:text-[#0D1B2A]">{copy.navApp}</a>
              <a href="#confianza" className="transition hover:text-[#0D1B2A]">{copy.navTrust}</a>
              <a href="#veterinarios" className="transition hover:text-[#0D1B2A]">{copy.navVet}</a>
            </nav>

            <Link
              href="/nvetcareapp/iniciar-sesion"
              className="inline-flex min-h-10 items-center justify-center rounded-full bg-[#0D1B2A] px-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-[#183047] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34B27A] focus-visible:ring-offset-2"
            >
              {copy.login}
            </Link>
          </div>
        </Container>
      </header>

      <main>
        <section id="nvet-top" className="relative scroll-mt-20 overflow-hidden bg-[linear-gradient(135deg,#F4FBF7_0%,#FFFFFF_48%,#F7FBFA_100%)] py-14 sm:py-20 lg:py-24">
          <div className="pointer-events-none absolute -left-28 top-[-12rem] h-[30rem] w-[30rem] rounded-full bg-[#B7E4C7]/30 blur-3xl" aria-hidden="true" />
          <div className="pointer-events-none absolute -right-36 bottom-[-16rem] h-[34rem] w-[34rem] rounded-full bg-[#34B27A]/10 blur-3xl" aria-hidden="true" />
          <Container>
            <div className="grid items-center gap-12 lg:grid-cols-[0.94fr_1.06fr] lg:gap-12">
              <FadeInSection>
                <div className="relative z-10 max-w-2xl">
                  <div className="mb-6 flex flex-wrap items-center gap-3">
                    <Eyebrow>{copy.maturity}</Eyebrow>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7A8793]">{copy.heroKicker}</span>
                  </div>
                  <h1 className="text-4xl font-extrabold leading-[1.02] tracking-[-0.05em] text-[#0D1B2A] sm:text-5xl lg:text-[4rem]" style={poppinsFont}>
                    {copy.heroTitleA}{' '}
                    <span className="text-[#2D9F6D]">{copy.heroTitleB}</span>
                  </h1>
                  <p className="mt-7 max-w-xl text-base leading-8 text-[#52606C] sm:text-lg">{copy.heroText}</p>
                  <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                    <Link
                      href="/nvetcareapp/iniciar-sesion"
                      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#34B27A] px-6 text-xs font-semibold uppercase tracking-[0.08em] text-white shadow-[0_14px_34px_rgba(52,178,122,0.24)] transition hover:-translate-y-0.5 hover:bg-[#2D9F6D]"
                    >
                      {copy.heroPrimary} <ArrowRight size={15} aria-hidden="true" />
                    </Link>
                    <a
                      href="#servicios"
                      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#0D1B2A]/10 bg-white px-6 text-xs font-semibold uppercase tracking-[0.08em] text-[#0D1B2A] transition hover:border-[#34B27A]/40 hover:bg-[#F7FBF9]"
                    >
                      {copy.heroSecondary}
                    </a>
                  </div>
                  <div className="mt-8 flex flex-wrap gap-x-5 gap-y-3 text-xs text-[#66737E]">
                    {copy.heroMicro.map((item, index) => {
                      const Icon = [ShieldCheck, Home, Smartphone][index];
                      return (
                        <span key={item} className="inline-flex items-center gap-2">
                          <Icon size={14} className="text-[#34B27A]" aria-hidden="true" />
                          {item}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </FadeInSection>

              <FadeInSection direction="left" delay={0.05}>
                <div className="relative mx-auto w-full max-w-[720px] lg:ml-auto">
                  <div className="absolute -inset-8 rounded-[3rem] bg-[#34B27A]/[0.07] blur-3xl" aria-hidden="true" />
                  <div className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-white shadow-[0_34px_90px_rgba(13,27,42,0.16)]">
                    <div className="relative aspect-[1.22/1] sm:aspect-[1.42/1]">
                      <Image
                        src="/images/nvetcareapp/owner-and-dog.jpg"
                        alt={es ? 'Familia con su mascota en casa' : 'Family with their pet at home'}
                        fill
                        priority
                        sizes="(min-width: 1024px) 52vw, 94vw"
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0D1B2A]/38 via-transparent to-transparent" />
                    </div>
                    <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-4 sm:bottom-7 sm:left-7 sm:right-7">
                      <div className="max-w-[250px] rounded-2xl border border-white/60 bg-white/92 p-4 shadow-[0_14px_36px_rgba(13,27,42,0.14)] backdrop-blur">
                        <div className="flex items-center gap-3">
                          <IconBubble icon={PawPrint} />
                          <div>
                            <p className="text-sm font-semibold text-[#0D1B2A]" style={poppinsFont}>{es ? 'Cuidado en casa' : 'Care at home'}</p>
                            <p className="mt-1 text-[11px] leading-5 text-[#66737E]">{es ? 'Una experiencia pensada alrededor de la mascota.' : 'An experience designed around the pet.'}</p>
                          </div>
                        </div>
                      </div>
                      <div className="relative hidden h-[220px] w-[145px] overflow-hidden rounded-[1.45rem] border-4 border-white bg-white shadow-[0_20px_44px_rgba(13,27,42,0.22)] sm:block">
                        <Image src="/images/nvetcareapp/home-screen-phone.jpg" alt="Nvet Care mobile app" fill sizes="145px" className="object-cover object-top" />
                      </div>
                    </div>
                  </div>
                </div>
              </FadeInSection>
            </div>
          </Container>
        </section>

        <section id="servicios" className="scroll-mt-24 bg-white py-20 sm:py-24 lg:py-28">
          <Container>
            <SectionHeading eyebrow={copy.servicesEyebrow} title={copy.servicesTitle} text={copy.servicesText} />
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((service, index) => (
                <FadeInSection key={service.title} delay={index * 0.035}>
                  <ServiceCard service={service} index={index} />
                </FadeInSection>
              ))}
            </div>
          </Container>
        </section>

        <section id="como-funciona" className="scroll-mt-24 border-y border-[#0D1B2A]/[0.05] bg-[#F5FAF7] py-20 sm:py-24 lg:py-28">
          <Container>
            <div className="grid items-center gap-10 lg:grid-cols-[1.06fr_0.94fr] lg:gap-12">
              <FadeInSection direction="left">
                <div className="relative overflow-hidden rounded-[2rem] border border-white bg-white shadow-[0_24px_70px_rgba(13,27,42,0.10)]">
                  <div className="relative aspect-[4/3] sm:aspect-[16/10]">
                    <Image
                      src="/images/nvetcareapp/mission-banner.jpg"
                      alt={copy.homeTitle}
                      fill
                      sizes="(min-width: 1024px) 52vw, 94vw"
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0D1B2A]/40 via-transparent to-transparent" />
                  </div>
                </div>
              </FadeInSection>

              <FadeInSection direction="right" delay={0.04}>
                <div>
                  <SectionHeading eyebrow={copy.homeEyebrow} title={copy.homeTitle} text={copy.homeText} align="left" />
                  <div className="mt-8 space-y-3">
                    {copy.steps.map(([number, title, text], index) => {
                      const StepIcon = [MessageCircle, CalendarCheck, Home][index];
                      return (
                        <div key={number} className="flex gap-4 rounded-2xl border border-[#0D1B2A]/[0.06] bg-white p-4 sm:p-5">
                          <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#34B27A] text-xs font-bold text-white">{number}</span>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <StepIcon size={16} className="text-[#34B27A]" aria-hidden="true" />
                              <h3 className="text-sm font-semibold text-[#0D1B2A]" style={poppinsFont}>{title}</h3>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-[#69757F]">{text}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </FadeInSection>
            </div>
          </Container>
        </section>

        <section id="producto" className="scroll-mt-24 bg-white py-20 sm:py-24 lg:py-28">
          <Container>
            <SectionHeading eyebrow={copy.appEyebrow} title={copy.appTitle} text={copy.appText} />

            <div className="mt-12 grid gap-5 lg:grid-cols-[0.92fr_1.08fr]">
              <FadeInSection direction="left">
                <article className="relative h-full overflow-hidden rounded-[2rem] bg-[#0D1B2A] p-6 text-white sm:p-8">
                  <div className="relative z-10 max-w-sm">
                    <span className="inline-flex rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#B7E4C7]">{copy.appCardHome}</span>
                    <h3 className="mt-5 text-2xl font-semibold tracking-[-0.03em]" style={poppinsFont}>{copy.appCardHome}</h3>
                    <p className="mt-3 text-sm leading-6 text-white/65">{copy.appCardHomeText}</p>
                  </div>
                  <div className="mt-8 flex justify-center sm:justify-end">
                    <Image
                      src="/images/nvetcareapp/home-screen-phone.jpg"
                      alt={copy.appCardHome}
                      width={1122}
                      height={1402}
                      sizes="(min-width:1024px) 430px, 86vw"
                      className="h-[390px] w-auto rounded-[1.45rem] object-cover object-top shadow-[0_22px_50px_rgba(0,0,0,0.28)] sm:h-[450px]"
                    />
                  </div>
                </article>
              </FadeInSection>

              <FadeInSection direction="right" delay={0.05}>
                <article className="h-full overflow-hidden rounded-[2rem] border border-[#0D1B2A]/[0.07] bg-[#F6FAF8] p-6 sm:p-8">
                  <div className="max-w-lg">
                    <span className="inline-flex rounded-full bg-[#34B27A]/[0.09] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#23865A]">{copy.appCardTracking}</span>
                    <h3 className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-[#0D1B2A]" style={poppinsFont}>{copy.appCardTracking}</h3>
                    <p className="mt-3 text-sm leading-6 text-[#66737E]">{copy.appCardTrackingText}</p>
                  </div>
                  <div className="mt-8 grid gap-4 sm:grid-cols-2">
                    <div className="relative min-h-[250px] overflow-hidden rounded-[1.5rem] border border-white bg-white shadow-[0_16px_40px_rgba(13,27,42,0.10)] sm:min-h-[330px]">
                      <Image
                        src={es ? '/images/nvetcareapp/vet-tracking-mockup-es.png' : '/images/nvetcareapp/vet-tracking-mockup-en.png'}
                        alt={copy.appCardTracking}
                        fill
                        sizes="(min-width:1024px) 24vw, 44vw"
                        className="object-contain p-3"
                      />
                    </div>
                    <div className="relative min-h-[250px] overflow-hidden rounded-[1.5rem] border border-white bg-white shadow-[0_16px_40px_rgba(13,27,42,0.10)] sm:min-h-[330px]">
                      <Image
                        src="/images/nvetcareapp/vet-tracking-full.jpg"
                        alt={copy.appCardTracking}
                        fill
                        sizes="(min-width:1024px) 24vw, 44vw"
                        className="object-cover object-top"
                      />
                    </div>
                  </div>
                </article>
              </FadeInSection>
            </div>

            <FadeInSection delay={0.06}>
              <div className="mt-5 overflow-hidden rounded-[2rem] border border-[#0D1B2A]/[0.06] bg-white shadow-[0_18px_50px_rgba(13,27,42,0.06)]">
                <div className="grid items-center gap-8 p-6 sm:p-8 lg:grid-cols-[0.82fr_1.18fr]">
                  <div>
                    <Eyebrow>{copy.connectedEyebrow}</Eyebrow>
                    <h3 className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-[#0D1B2A] sm:text-3xl" style={poppinsFont}>{copy.connectedTitle}</h3>
                    <p className="mt-4 max-w-xl text-sm leading-7 text-[#66737E]">{copy.connectedText}</p>
                  </div>
                  <div className="relative min-h-[260px] overflow-hidden rounded-[1.6rem] bg-[#F6FAF8] sm:min-h-[330px]">
                    <Image src="/images/nvetcareapp/feature-showcase.jpg" alt={copy.connectedTitle} fill sizes="(min-width:1024px) 54vw, 90vw" className="object-cover object-center" />
                  </div>
                </div>
              </div>
            </FadeInSection>
          </Container>
        </section>

        <section className="border-y border-[#0D1B2A]/[0.05] bg-[#F7FAF9] py-20 sm:py-24 lg:py-28">
          <Container>
            <SectionHeading eyebrow={copy.connectedEyebrow} title={copy.connectedTitle} text={copy.connectedText} />
            <div className="mt-12 grid gap-5 lg:grid-cols-2">
              <FadeInSection direction="left">
                <article id="familias" className="scroll-mt-24 h-full rounded-[2rem] border border-[#0D1B2A]/[0.07] bg-white p-7 shadow-[0_16px_48px_rgba(13,27,42,0.06)] sm:p-8">
                  <IconBubble icon={PawPrint} />
                  <h3 className="mt-6 text-2xl font-semibold tracking-[-0.03em]" style={poppinsFont}>{copy.familiesTitle}</h3>
                  <p className="mt-3 text-sm leading-7 text-[#66737E]">{copy.familiesText}</p>
                  <ul className="mt-7 space-y-3">
                    {copy.familiesItems.map((item) => (
                      <li key={item} className="flex items-start gap-3 text-sm text-[#4E5B66]">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#34B27A]/10"><Check size={12} className="text-[#23865A]" /></span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </article>
              </FadeInSection>

              <FadeInSection direction="right" delay={0.04}>
                <article id="veterinarios" className="scroll-mt-24 h-full rounded-[2rem] bg-[#0D1B2A] p-7 text-white shadow-[0_18px_56px_rgba(13,27,42,0.16)] sm:p-8">
                  <IconBubble icon={Stethoscope} dark />
                  <h3 className="mt-6 text-2xl font-semibold tracking-[-0.03em]" style={poppinsFont}>{copy.vetsTitle}</h3>
                  <p className="mt-3 text-sm leading-7 text-white/65">{copy.vetsText}</p>
                  <ul className="mt-7 space-y-3">
                    {copy.vetsItems.map((item) => (
                      <li key={item} className="flex items-start gap-3 text-sm text-white/82">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#34B27A]/15"><Check size={12} className="text-[#72DBA2]" /></span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </article>
              </FadeInSection>
            </div>
          </Container>
        </section>

        <section className="bg-white py-20 sm:py-24 lg:py-28">
          <Container>
            <div className="grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12">
              <FadeInSection>
                <div>
                  <SectionHeading eyebrow={copy.coverageEyebrow} title={copy.coverageTitle} text={copy.coverageText} align="left" />
                  <div className="mt-8 grid max-w-md grid-cols-2 gap-3">
                    <Metric value={copy.coverageMetricA} label={copy.coverageMetricAText} />
                    <Metric value={copy.coverageMetricB} label={copy.coverageMetricBText} />
                  </div>
                </div>
              </FadeInSection>

              <FadeInSection direction="left" delay={0.05}>
                <div className="relative min-h-[390px] overflow-hidden rounded-[2rem] border border-[#0D1B2A]/[0.07] bg-[#EAF7F0] shadow-[0_20px_56px_rgba(13,27,42,0.09)]">
                  <Image src="/images/nvetcareapp/pattern-nodes.png" alt="" fill sizes="(min-width:1024px) 55vw, 94vw" className="object-cover opacity-45" />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(52,178,122,.15),transparent_36%),linear-gradient(135deg,rgba(255,255,255,.74),rgba(223,243,232,.55))]" />
                  <div className="relative flex min-h-[390px] items-center justify-center p-8">
                    <div className="w-full max-w-sm rounded-[1.8rem] border border-white/80 bg-white/92 p-7 text-center shadow-[0_20px_50px_rgba(13,27,42,0.12)] backdrop-blur">
                      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#34B27A] text-white shadow-[0_10px_28px_rgba(52,178,122,0.28)]"><MapPin size={23} /></span>
                      <p className="mt-5 text-xl font-semibold tracking-[-0.02em] text-[#0D1B2A]" style={poppinsFont}>Cartagena, Colombia</p>
                      <p className="mt-3 text-sm leading-6 text-[#66737E]">{es ? 'Cobertura comunicada según disponibilidad real del servicio.' : 'Coverage communicated according to real service availability.'}</p>
                    </div>
                  </div>
                </div>
              </FadeInSection>
            </div>
          </Container>
        </section>

        <section id="confianza" className="scroll-mt-24 border-y border-[#0D1B2A]/[0.05] bg-[#F6FAF8] py-20 sm:py-24 lg:py-28">
          <Container>
            <SectionHeading eyebrow={copy.trustEyebrow} title={copy.trustTitle} text={copy.trustText} />
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {copy.trustCards.map(([title, text], index) => {
                const Icon = trustIcons[index];
                return (
                  <FadeInSection key={title} delay={index * 0.035}>
                    <article className="h-full rounded-[1.5rem] border border-[#0D1B2A]/[0.07] bg-white p-6">
                      <IconBubble icon={Icon} />
                      <h3 className="mt-6 text-base font-semibold text-[#0D1B2A]" style={poppinsFont}>{title}</h3>
                      <p className="mt-3 text-xs leading-6 text-[#66737E]">{text}</p>
                    </article>
                  </FadeInSection>
                );
              })}
            </div>
          </Container>
        </section>

        <section className="bg-[#0D1B2A] py-20 text-white sm:py-24">
          <Container>
            <FadeInSection>
              <div className="grid items-center gap-8 lg:grid-cols-[1.02fr_0.98fr]">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#72DBA2]">Nvet Care</p>
                  <h2 className="mt-4 max-w-2xl text-3xl font-bold tracking-[-0.035em] sm:text-4xl" style={poppinsFont}>{copy.missionTitle}</h2>
                  <p className="mt-5 max-w-2xl text-sm leading-7 text-white/65 sm:text-base">{copy.missionText}</p>
                  <div className="mt-7 flex flex-wrap gap-3 text-xs text-white/72">
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2"><Heart size={14} className="text-[#72DBA2]" /> {es ? 'Bienestar' : 'Wellbeing'}</span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2"><ShieldCheck size={14} className="text-[#72DBA2]" /> {es ? 'Confianza' : 'Trust'}</span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2"><Clock3 size={14} className="text-[#72DBA2]" /> {es ? 'Continuidad' : 'Continuity'}</span>
                  </div>
                </div>
                <div className="relative h-72 overflow-hidden rounded-[1.8rem] border border-white/10 sm:h-80">
                  <Image src="/images/nvetcareapp/mission-banner.jpg" alt={copy.missionTitle} fill sizes="(min-width:1024px) 46vw, 94vw" className="object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0D1B2A]/50 to-transparent" />
                </div>
              </div>
            </FadeInSection>
          </Container>
        </section>

        <section className="bg-white py-20 sm:py-24 lg:py-28">
          <Container>
            <div className="mx-auto max-w-3xl">
              <h2 className="text-center text-3xl font-bold tracking-[-0.035em] text-[#0D1B2A] sm:text-4xl" style={poppinsFont}>{copy.faqTitle}</h2>
              <div className="mt-10 divide-y divide-[#0D1B2A]/[0.07] border-y border-[#0D1B2A]/[0.07]">
                {copy.faqs.map(([question, answer]) => (
                  <div key={question} className="py-6">
                    <h3 className="text-sm font-semibold text-[#0D1B2A]" style={poppinsFont}>{question}</h3>
                    <p className="mt-3 text-sm leading-7 text-[#66737E]">{answer}</p>
                  </div>
                ))}
              </div>
            </div>
          </Container>
        </section>

        <section className="bg-[#F4FBF7] py-16 sm:py-20">
          <Container>
            <div className="mx-auto max-w-4xl rounded-[2rem] border border-[#34B27A]/15 bg-white px-6 py-10 text-center shadow-[0_20px_60px_rgba(13,27,42,0.07)] sm:px-10 sm:py-12">
              <Smartphone size={26} className="mx-auto text-[#34B27A]" aria-hidden="true" />
              <h2 className="mx-auto mt-5 max-w-2xl text-3xl font-bold tracking-[-0.035em] text-[#0D1B2A]" style={poppinsFont}>{copy.finalTitle}</h2>
              <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-[#66737E]">{copy.finalText}</p>
              <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
                <Link href="/nvetcareapp/iniciar-sesion" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#34B27A] px-6 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-[#2D9F6D]">
                  {copy.finalPrimary} <ArrowRight size={14} />
                </Link>
                <a href="#como-funciona" className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#0D1B2A]/10 bg-white px-6 text-xs font-semibold uppercase tracking-[0.08em] text-[#0D1B2A] transition hover:bg-[#F7F9F8]">
                  {copy.finalSecondary}
                </a>
              </div>
            </div>
          </Container>
        </section>
      </main>
    </div>
  );
};
