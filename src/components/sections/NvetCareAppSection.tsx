'use client';

import React, { type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  CalendarCheck,
  Check,
  Heart,
  Home,
  MapPin,
  MessageCircle,
  Navigation,
  PawPrint,
  ShieldCheck,
  Smartphone,
  Stethoscope,
  UserCheck,
  type LucideIcon,
} from 'lucide-react';
import { Container } from '@/components/ui';
import { FadeInSection } from '@/components/ui/FadeInSection';
import { useLanguage } from '@/contexts/LanguageContext';

const poppinsFont: React.CSSProperties = {
  fontFamily: 'var(--font-poppins-nvet), Poppins, sans-serif',
};

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[#34B27A]/20 bg-[#34B27A]/[0.07] px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#23865A]">
      <span className="h-1.5 w-1.5 rounded-full bg-[#34B27A]" aria-hidden="true" />
      {children}
    </span>
  );
}

function FeatureIcon({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#0D1B2A]/[0.08] bg-white shadow-[0_8px_24px_rgba(13,27,42,0.06)]">
      <Icon size={19} strokeWidth={1.8} className="text-[#0D1B2A]" aria-hidden="true" />
      <span className="absolute -bottom-1 -right-1 h-2.5 w-2.5 rounded-full bg-[#FF8A3D] ring-2 ring-white" aria-hidden="true" />
    </span>
  );
}

function SectionHeading({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return (
    <div className="mx-auto mb-12 max-w-3xl text-center sm:mb-16">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-5 text-3xl font-bold tracking-[-0.035em] text-[#0D1B2A] sm:text-4xl lg:text-[2.7rem]" style={poppinsFont}>
        {title}
      </h2>
      <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-[#5B6670] sm:text-base">{text}</p>
    </div>
  );
}

export const NvetCareAppSection: React.FC = () => {
  const { locale } = useLanguage();
  const es = locale === 'es';

  const copy = es
    ? {
        maturity: 'En desarrollo · Cartagena',
        navOwner: 'Para familias',
        navVet: 'Para veterinarios',
        navHow: 'Cómo funciona',
        login: 'Iniciar sesión',
        heroKicker: 'Atención veterinaria a domicilio, conectada',
        heroTitle: 'El cuidado veterinario que necesitas, donde tu mascota se siente segura.',
        heroText: 'Nvet Care está construyendo una experiencia para conectar familias y profesionales veterinarios, coordinar atención en casa y mantener el contexto de cada mascota en un solo lugar.',
        heroPrimary: 'Entrar a Nvet Care',
        heroSecondary: 'Soy veterinario',
        marketNote: 'Mercado inicial: Cartagena, Colombia',
        productPreview: 'Experiencia Nvet Care',
        arrival: 'Visita a domicilio',
        arrivalStatus: 'Flujo de seguimiento',
        petHistory: 'Historial de mascota',
        petHistoryText: 'Una vista continua del cuidado y las visitas.',
        trustStrip: [
          ['Identidad profesional', 'Credenciales y permisos dentro del flujo de Nvet.'],
          ['Atención en casa', 'Una experiencia diseñada alrededor del bienestar de la mascota.'],
          ['Registro trazable', 'Interacciones y estados relevantes conservan contexto.'],
          ['Historial organizado', 'Cada atención se vincula al perfil de la mascota.'],
        ],
        howEyebrow: 'Cómo funciona',
        howTitle: 'Del primer mensaje al seguimiento, sin perder el contexto.',
        howText: 'La experiencia está diseñada para reducir fricción entre la necesidad de una familia y la atención profesional que recibe su mascota.',
        steps: [
          ['01', 'Solicita', 'Describe qué necesita tu mascota y registra la información de la visita.'],
          ['02', 'Conecta', 'Nvet organiza el flujo para encontrar y coordinar atención profesional.'],
          ['03', 'Acompaña', 'Consulta el estado de la visita y mantén la comunicación en un mismo flujo.'],
          ['04', 'Conserva', 'La atención queda asociada al historial de tu mascota para futuros seguimientos.'],
        ],
        experienceEyebrow: 'Producto',
        experienceTitle: 'Una interfaz que acompaña la visita, no que compite con ella.',
        experienceText: 'El producto prioriza solicitud, coordinación, seguimiento y continuidad del cuidado. Las visualizaciones muestran la dirección de la experiencia digital que Nvet está construyendo.',
        mobileLabel: 'Experiencia móvil',
        phoneCardTitle: 'Todo el cuidado, en una misma experiencia',
        phoneCardText: 'Solicitudes, próximas atenciones y seguimiento se presentan con una jerarquía simple y legible.',
        trackingLabel: 'Seguimiento de visita',
        trackingCardTitle: 'Seguimiento claro de la visita',
        trackingCardText: 'El estado del servicio y la coordinación se concentran en una vista pensada para reducir incertidumbre.',
        audiencesEyebrow: 'Dos experiencias, una red',
        audiencesTitle: 'Nvet funciona para quien cuida y para quien atiende.',
        audiencesText: 'La plataforma separa las necesidades de familias y profesionales, pero mantiene un mismo contexto de atención.',
        ownerTitle: 'Para familias',
        ownerText: 'Una forma más directa de organizar la atención veterinaria de tu mascota desde casa.',
        ownerItems: ['Perfil e historial de la mascota', 'Coordinación de visitas', 'Seguimiento de la atención', 'Comunicación y registro en un solo lugar'],
        vetTitle: 'Para veterinarios',
        vetText: 'Herramientas para gestionar identidad profesional, disponibilidad y atención a domicilio.',
        vetItems: ['Identidad y credenciales profesionales', 'Disponibilidad y cobertura', 'Gestión de visitas', 'Continuidad clínica y operativa'],
        vetCta: 'Conocer la experiencia profesional',
        coverageEyebrow: 'Mercado inicial',
        coverageTitle: 'Nacido en Cartagena. Diseñado para crecer por ciudades.',
        coverageText: 'Cartagena es el mercado inicial de Nvet Care. La expansión se plantea por zonas de operación, disponibilidad profesional y capacidad real de servicio; no mostramos disponibilidad ficticia.',
        coverageLabel: 'Cartagena · mercado inicial',
        coverageSub: 'La cobertura operativa se comunicará dentro del producto según disponibilidad real.',
        trustEyebrow: 'Confianza por diseño',
        trustTitle: 'La experiencia profesional empieza antes de la consulta.',
        trustText: 'Nvet organiza identidad, trazabilidad y contexto para que la tecnología reduzca fricción sin reemplazar el criterio veterinario.',
        trustIdentityTitle: 'Identidad',
        trustIdentityText: 'Flujos de verificación para profesionales y cuentas de usuario.',
        trustTraceTitle: 'Trazabilidad',
        trustTraceText: 'Registro de interacciones y estados relevantes de la atención.',
        trustContinuityTitle: 'Continuidad',
        trustContinuityText: 'Información vinculada a la mascota para mantener el contexto entre visitas.',
        trustPrivacyTitle: 'Privacidad',
        trustPrivacyText: 'Acceso a información sensible sujeto al rol y al propósito del servicio.',
        missionTitle: 'Tecnología que acerca el cuidado a la vida real.',
        missionText: 'Nvet Care busca que pedir ayuda, coordinar una visita y mantener el historial de una mascota sea más simple para las familias y más ordenado para los profesionales.',
        faqTitle: 'Preguntas frecuentes',
        faqs: [
          ['¿Nvet Care ya está disponible?', 'Nvet Care continúa en desarrollo y Cartagena es su mercado inicial. La disponibilidad de funciones se comunicará a medida que cada capacidad complete su validación.'],
          ['¿Nvet reemplaza una clínica de urgencias?', 'No. Nvet no debe utilizarse como sustituto de un servicio veterinario de urgencias. Ante una emergencia, contacta una clínica veterinaria habilitada.'],
          ['¿Los veterinarios operan como parte de CTG One?', 'Nvet es un producto del ecosistema CTG One, pero la identidad, credenciales y facultades profesionales se gestionan dentro de la experiencia de Nvet.'],
        ],
        finalTitle: 'El cuidado empieza con una mejor conexión.',
        finalText: 'Ingresa a Nvet Care o conoce cómo la plataforma está construyendo una experiencia de atención veterinaria más simple y conectada.',
        finalPrimary: 'Iniciar sesión',
        finalSecondary: 'Ver novedades',
      }
    : {
        maturity: 'In development · Cartagena',
        navOwner: 'For families',
        navVet: 'For veterinarians',
        navHow: 'How it works',
        login: 'Sign in',
        heroKicker: 'Connected veterinary care at home',
        heroTitle: 'The veterinary care you need, where your pet feels safest.',
        heroText: 'Nvet Care is building an experience that connects families with veterinary professionals, coordinates at-home care, and keeps each pet’s context in one place.',
        heroPrimary: 'Enter Nvet Care',
        heroSecondary: 'I am a veterinarian',
        marketNote: 'Initial market: Cartagena, Colombia',
        productPreview: 'Nvet Care experience',
        arrival: 'At-home visit',
        arrivalStatus: 'Tracking flow',
        petHistory: 'Pet history',
        petHistoryText: 'A continuous view of care and visits.',
        trustStrip: [
          ['Professional identity', 'Credentials and permissions within the Nvet flow.'],
          ['Care at home', 'An experience designed around pet wellbeing.'],
          ['Traceable records', 'Relevant interactions and states preserve context.'],
          ['Organized history', 'Each visit is linked to the pet profile.'],
        ],
        howEyebrow: 'How it works',
        howTitle: 'From the first request to follow-up, without losing context.',
        howText: 'The experience is designed to reduce friction between a family’s need and the professional care their pet receives.',
        steps: [
          ['01', 'Request', 'Describe what your pet needs and provide the visit information.'],
          ['02', 'Connect', 'Nvet organizes the flow for finding and coordinating professional care.'],
          ['03', 'Follow', 'Check the visit status and keep communication in one flow.'],
          ['04', 'Keep context', 'Care is associated with your pet history for future follow-up.'],
        ],
        experienceEyebrow: 'Product',
        experienceTitle: 'An interface that supports the visit instead of competing with it.',
        experienceText: 'The product prioritizes request, coordination, follow-up and continuity of care. These visuals show the direction of the digital experience Nvet is building.',
        mobileLabel: 'Mobile experience',
        phoneCardTitle: 'Pet care in one experience',
        phoneCardText: 'Requests, upcoming care and follow-up use a simple, readable hierarchy.',
        trackingLabel: 'Visit tracking',
        trackingCardTitle: 'Clear visit follow-up',
        trackingCardText: 'Service status and coordination are concentrated in a view designed to reduce uncertainty.',
        audiencesEyebrow: 'Two experiences, one network',
        audiencesTitle: 'Nvet works for the people who care and the professionals who treat.',
        audiencesText: 'The platform separates the needs of families and professionals while preserving the same care context.',
        ownerTitle: 'For families',
        ownerText: 'A more direct way to organize your pet’s veterinary care from home.',
        ownerItems: ['Pet profile and history', 'Visit coordination', 'Care follow-up', 'Communication and records in one place'],
        vetTitle: 'For veterinarians',
        vetText: 'Tools to manage professional identity, availability and at-home care.',
        vetItems: ['Professional identity and credentials', 'Availability and coverage', 'Visit management', 'Clinical and operational continuity'],
        vetCta: 'Explore the professional experience',
        coverageEyebrow: 'Initial market',
        coverageTitle: 'Born in Cartagena. Designed to grow city by city.',
        coverageText: 'Cartagena is Nvet Care’s initial market. Expansion is based on operating zones, professional availability, and real service capacity; we do not display fictional availability.',
        coverageLabel: 'Cartagena · initial market',
        coverageSub: 'Operational coverage will be communicated inside the product according to real availability.',
        trustEyebrow: 'Trust by design',
        trustTitle: 'A professional experience starts before the consultation.',
        trustText: 'Nvet organizes identity, traceability, and context so technology can reduce friction without replacing veterinary judgment.',
        trustIdentityTitle: 'Identity',
        trustIdentityText: 'Verification flows for professionals and user accounts.',
        trustTraceTitle: 'Traceability',
        trustTraceText: 'Records of relevant care interactions and states.',
        trustContinuityTitle: 'Continuity',
        trustContinuityText: 'Information linked to the pet to preserve context between visits.',
        trustPrivacyTitle: 'Privacy',
        trustPrivacyText: 'Access to sensitive information is subject to role and service purpose.',
        missionTitle: 'Technology that brings care closer to real life.',
        missionText: 'Nvet Care aims to make requesting help, coordinating a visit, and maintaining a pet’s history simpler for families and more organized for professionals.',
        faqTitle: 'Frequently asked questions',
        faqs: [
          ['Is Nvet Care already available?', 'Nvet Care remains in development and Cartagena is its initial market. Feature availability will be communicated as each capability completes validation.'],
          ['Does Nvet replace an emergency clinic?', 'No. Nvet should not be used as a replacement for emergency veterinary care. In an emergency, contact an authorized veterinary clinic.'],
          ['Do veterinarians operate as part of CTG One?', 'Nvet is a CTG One ecosystem product, while professional identity, credentials, and permissions are managed within the Nvet experience.'],
        ],
        finalTitle: 'Better care starts with a better connection.',
        finalText: 'Enter Nvet Care or see how the platform is building a simpler, more connected veterinary-care experience.',
        finalPrimary: 'Sign in',
        finalSecondary: 'See updates',
      };

  const trustIcons: LucideIcon[] = [UserCheck, Home, ShieldCheck, PawPrint];
  const stepIcons: LucideIcon[] = [MessageCircle, UserCheck, Navigation, CalendarCheck];
  const trustCards = [
    { icon: UserCheck, title: copy.trustIdentityTitle, text: copy.trustIdentityText },
    { icon: ShieldCheck, title: copy.trustTraceTitle, text: copy.trustTraceText },
    { icon: Heart, title: copy.trustContinuityTitle, text: copy.trustContinuityText },
    { icon: ShieldCheck, title: copy.trustPrivacyTitle, text: copy.trustPrivacyText },
  ];

  return (
    <div className="overflow-x-clip bg-white text-[#0D1B2A]">
      <div className="sticky top-0 z-30 border-b border-[#0D1B2A]/[0.06] bg-white/90 backdrop-blur-xl">
        <Container>
          <div className="flex min-h-16 items-center justify-between gap-5">
            <a href="#nvet-top" className="flex items-center gap-2.5" aria-label="Nvet Care">
              <span className="relative h-9 w-11">
                <Image src="/images/logo/nvet-care-icon.png" alt="" fill sizes="44px" className="object-contain" priority />
              </span>
              <span className="text-base font-bold tracking-[-0.02em]" style={poppinsFont}>Nvet <span className="text-[#34B27A]">Care</span></span>
            </a>
            <nav className="hidden items-center gap-6 text-xs font-medium text-[#52606C] lg:flex" aria-label="Nvet Care">
              <a href="#como-funciona" className="transition hover:text-[#0D1B2A]">{copy.navHow}</a>
              <a href="#familias" className="transition hover:text-[#0D1B2A]">{copy.navOwner}</a>
              <a href="#veterinarios" className="transition hover:text-[#0D1B2A]">{copy.navVet}</a>
            </nav>
            <Link href="/nvetcareapp/iniciar-sesion" className="inline-flex min-h-10 items-center justify-center rounded-full bg-[#0D1B2A] px-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-[#183047] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34B27A] focus-visible:ring-offset-2">{copy.login}</Link>
          </div>
        </Container>
      </div>

      <section id="nvet-top" className="relative scroll-mt-20 bg-[linear-gradient(180deg,#F4FBF7_0%,#FFFFFF_76%)] py-14 sm:py-20 lg:py-24">
        <div className="pointer-events-none absolute right-[-18rem] top-[-18rem] h-[42rem] w-[42rem] rounded-full bg-[#34B27A]/[0.06] blur-3xl" aria-hidden="true" />
        <Container>
          <div className="grid items-center gap-12 lg:grid-cols-[1.02fr_0.98fr] lg:gap-8">
            <FadeInSection>
              <div className="max-w-2xl">
                <div className="mb-6 flex flex-wrap items-center gap-3">
                  <Eyebrow>{copy.maturity}</Eyebrow>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7A8793]">{copy.heroKicker}</span>
                </div>
                <h1 className="max-w-3xl text-4xl font-extrabold leading-[1.03] tracking-[-0.045em] text-[#0D1B2A] sm:text-5xl lg:text-[3.8rem]" style={poppinsFont}>{copy.heroTitle}</h1>
                <p className="mt-7 max-w-xl text-base leading-8 text-[#52606C] sm:text-lg">{copy.heroText}</p>
                <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                  <Link href="/nvetcareapp/iniciar-sesion" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#34B27A] px-6 text-xs font-semibold uppercase tracking-[0.08em] text-white shadow-[0_14px_34px_rgba(52,178,122,0.25)] transition hover:-translate-y-0.5 hover:bg-[#2D9F6D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34B27A] focus-visible:ring-offset-2">{copy.heroPrimary} <ArrowRight size={15} aria-hidden="true" /></Link>
                  <a href="#veterinarios" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#0D1B2A]/10 bg-white px-6 text-xs font-semibold uppercase tracking-[0.08em] text-[#0D1B2A] transition hover:border-[#34B27A]/40 hover:bg-[#F7FBF9]"><Stethoscope size={15} aria-hidden="true" /> {copy.heroSecondary}</a>
                </div>
                <div className="mt-7 flex items-center gap-2 text-xs text-[#6B7783]"><MapPin size={14} className="text-[#FF8A3D]" aria-hidden="true" />{copy.marketNote}</div>
              </div>
            </FadeInSection>

            <FadeInSection direction="left" delay={0.06}>
              <div className="relative mx-auto w-full max-w-[620px] lg:ml-auto">
                <div className="absolute -inset-8 rounded-[3rem] bg-[#34B27A]/[0.06] blur-3xl" aria-hidden="true" />
                <div className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-white p-4 shadow-[0_35px_90px_rgba(13,27,42,0.16)] sm:p-6">
                  <div className="mb-4 flex items-center justify-between gap-4 px-1">
                    <div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#34B27A]">{copy.productPreview}</p><p className="mt-1 text-sm font-semibold text-[#0D1B2A]">{copy.arrival}</p></div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F2FAF6] px-3 py-1.5 text-[10px] font-semibold text-[#23865A]"><span className="h-1.5 w-1.5 rounded-full bg-[#34B27A]" /> {copy.arrivalStatus}</span>
                  </div>
                  <Image src="/images/nvetcareapp/vet-tracking-full.jpg" alt={copy.trackingCardTitle} width={1122} height={1402} priority sizes="(min-width: 1024px) 520px, 92vw" className="h-[390px] w-full rounded-[1.45rem] object-cover object-top sm:h-[470px]" />
                  <div className="absolute bottom-9 left-9 right-9 rounded-2xl border border-white/70 bg-white/95 p-4 shadow-[0_16px_42px_rgba(13,27,42,0.16)] backdrop-blur sm:left-auto sm:w-[245px]">
                    <div className="flex items-center gap-3"><FeatureIcon icon={PawPrint} /><div><p className="text-sm font-semibold text-[#0D1B2A]">{copy.petHistory}</p><p className="mt-1 text-[11px] leading-5 text-[#6A7680]">{copy.petHistoryText}</p></div></div>
                  </div>
                </div>
              </div>
            </FadeInSection>
          </div>
        </Container>
      </section>

      <section className="border-y border-[#0D1B2A]/[0.05] bg-[#FBFCFC] py-8">
        <Container>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {copy.trustStrip.map(([title, text], index) => {
              const Icon = trustIcons[index];
              return <div key={title} className="flex items-start gap-3 px-2 py-2"><Icon size={18} className="mt-0.5 shrink-0 text-[#34B27A]" aria-hidden="true" /><div><p className="text-xs font-semibold text-[#0D1B2A]">{title}</p><p className="mt-1 text-[11px] leading-5 text-[#73808B]">{text}</p></div></div>;
            })}
          </div>
        </Container>
      </section>

      <section id="como-funciona" className="scroll-mt-24 bg-white py-20 sm:py-28">
        <Container>
          <SectionHeading eyebrow={copy.howEyebrow} title={copy.howTitle} text={copy.howText} />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {copy.steps.map(([number, title, text], index) => {
              const Icon = stepIcons[index];
              return (
                <FadeInSection key={number} delay={index * 0.04}>
                  <article className="group h-full rounded-[1.5rem] border border-[#0D1B2A]/[0.07] bg-white p-6 transition duration-300 hover:-translate-y-1 hover:border-[#34B27A]/25 hover:shadow-[0_18px_44px_rgba(13,27,42,0.08)]">
                    <div className="mb-8 flex items-center justify-between"><span className="text-xs font-bold tracking-[0.12em] text-[#FF8A3D]">{number}</span><FeatureIcon icon={Icon} /></div>
                    <h3 className="text-lg font-semibold text-[#0D1B2A]" style={poppinsFont}>{title}</h3>
                    <p className="mt-3 text-sm leading-6 text-[#66737E]">{text}</p>
                  </article>
                </FadeInSection>
              );
            })}
          </div>
        </Container>
      </section>

      <section className="border-y border-[#0D1B2A]/[0.05] bg-[#F6FAF8] py-20 sm:py-28">
        <Container>
          <SectionHeading eyebrow={copy.experienceEyebrow} title={copy.experienceTitle} text={copy.experienceText} />
          <div className="grid gap-6 lg:grid-cols-2">
            <FadeInSection direction="left">
              <article className="relative overflow-hidden rounded-[2rem] bg-[#0D1B2A] p-6 text-white sm:p-8">
                <div className="relative z-10 max-w-sm"><span className="inline-flex rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#AEE7C9]">{copy.mobileLabel}</span><h3 className="mt-5 text-2xl font-semibold tracking-[-0.03em]" style={poppinsFont}>{copy.phoneCardTitle}</h3><p className="mt-3 text-sm leading-6 text-white/65">{copy.phoneCardText}</p></div>
                <div className="mt-8 flex justify-center sm:justify-end"><Image src="/images/nvetcareapp/home-screen-phone.jpg" alt={copy.phoneCardTitle} width={1122} height={1402} sizes="(min-width:1024px) 430px, 90vw" className="h-[410px] w-auto rounded-[1.5rem] object-cover object-top shadow-[0_22px_50px_rgba(0,0,0,0.25)]" /></div>
              </article>
            </FadeInSection>
            <FadeInSection direction="right" delay={0.05}>
              <article className="relative overflow-hidden rounded-[2rem] border border-[#0D1B2A]/[0.07] bg-white p-6 sm:p-8">
                <div className="max-w-sm"><span className="inline-flex rounded-full bg-[#34B27A]/[0.08] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#23865A]">{copy.trackingLabel}</span><h3 className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-[#0D1B2A]" style={poppinsFont}>{copy.trackingCardTitle}</h3><p className="mt-3 text-sm leading-6 text-[#66737E]">{copy.trackingCardText}</p></div>
                <div className="mt-8 flex justify-center"><Image src="/images/nvetcareapp/vet-tracking-full.jpg" alt={copy.trackingCardTitle} width={1122} height={1402} sizes="(min-width:1024px) 390px, 85vw" className="h-auto w-full max-w-[390px] rounded-[1.4rem] shadow-[0_22px_42px_rgba(13,27,42,0.16)]" /></div>
              </article>
            </FadeInSection>
          </div>
        </Container>
      </section>

      <section className="bg-white py-20 sm:py-28">
        <Container>
          <SectionHeading eyebrow={copy.audiencesEyebrow} title={copy.audiencesTitle} text={copy.audiencesText} />
          <div className="grid gap-6 lg:grid-cols-2">
            <FadeInSection direction="left">
              <article id="familias" className="scroll-mt-24 overflow-hidden rounded-[2rem] border border-[#0D1B2A]/[0.07] bg-white shadow-[0_16px_48px_rgba(13,27,42,0.06)]">
                <div className="relative h-56 sm:h-72"><Image src="/images/nvetcareapp/owner-and-dog.jpg" alt={copy.ownerTitle} fill sizes="(min-width:1024px) 50vw, 100vw" className="object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-[#0D1B2A]/50 via-transparent to-transparent" /></div>
                <div className="p-7 sm:p-8"><FeatureIcon icon={PawPrint} /><h3 className="mt-6 text-2xl font-semibold tracking-[-0.03em] text-[#0D1B2A]" style={poppinsFont}>{copy.ownerTitle}</h3><p className="mt-3 text-sm leading-6 text-[#66737E]">{copy.ownerText}</p><ul className="mt-6 grid gap-3 sm:grid-cols-2">{copy.ownerItems.map((item) => <li key={item} className="flex items-start gap-2 text-xs leading-5 text-[#4E5B66]"><Check size={15} className="mt-0.5 shrink-0 text-[#34B27A]" />{item}</li>)}</ul></div>
              </article>
            </FadeInSection>
            <FadeInSection direction="right" delay={0.05}>
              <article id="veterinarios" className="scroll-mt-24 h-full rounded-[2rem] bg-[#0D1B2A] p-7 text-white sm:p-9">
                <div className="flex h-full flex-col"><FeatureIcon icon={Stethoscope} /><h3 className="mt-6 text-2xl font-semibold tracking-[-0.03em]" style={poppinsFont}>{copy.vetTitle}</h3><p className="mt-3 max-w-lg text-sm leading-6 text-white/65">{copy.vetText}</p><ul className="mt-7 space-y-4">{copy.vetItems.map((item) => <li key={item} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/85"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#34B27A]/15"><Check size={13} className="text-[#6AD49C]" /></span>{item}</li>)}</ul><a href="#confianza" className="mt-9 inline-flex w-fit items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-[#7FE0AC] transition hover:text-white">{copy.vetCta} <ArrowRight size={14} /></a></div>
              </article>
            </FadeInSection>
          </div>
        </Container>
      </section>

      <section className="bg-[#F6FAF8] py-20 sm:py-28">
        <Container>
          <div className="grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <FadeInSection><div><Eyebrow>{copy.coverageEyebrow}</Eyebrow><h2 className="mt-5 text-3xl font-bold tracking-[-0.035em] text-[#0D1B2A] sm:text-4xl" style={poppinsFont}>{copy.coverageTitle}</h2><p className="mt-5 max-w-xl text-sm leading-7 text-[#5B6670] sm:text-base">{copy.coverageText}</p></div></FadeInSection>
            <FadeInSection direction="left" delay={0.05}>
              <div className="relative min-h-[360px] overflow-hidden rounded-[2rem] border border-[#0D1B2A]/[0.07] bg-[#DFF3E8] shadow-[0_18px_48px_rgba(13,27,42,0.08)]">
                <div className="absolute inset-0 opacity-60" style={{ backgroundImage: 'radial-gradient(circle at 18% 22%, rgba(52,178,122,.22) 0 2px, transparent 3px), radial-gradient(circle at 72% 38%, rgba(13,27,42,.08) 0 2px, transparent 3px)', backgroundSize: '48px 48px, 64px 64px' }} aria-hidden="true" />
                <div className="relative flex min-h-[360px] items-center justify-center p-8 text-center"><div className="max-w-sm rounded-[1.7rem] border border-white/70 bg-white/90 p-7 shadow-[0_20px_50px_rgba(13,27,42,0.12)] backdrop-blur"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#34B27A] text-white shadow-[0_10px_28px_rgba(52,178,122,0.28)]"><MapPin size={21} /></span><p className="mt-5 text-base font-semibold text-[#0D1B2A]" style={poppinsFont}>{copy.coverageLabel}</p><p className="mt-3 text-xs leading-6 text-[#66737E]">{copy.coverageSub}</p></div></div>
              </div>
            </FadeInSection>
          </div>
        </Container>
      </section>

      <section id="confianza" className="scroll-mt-24 bg-white py-20 sm:py-28">
        <Container>
          <SectionHeading eyebrow={copy.trustEyebrow} title={copy.trustTitle} text={copy.trustText} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {trustCards.map(({ icon, title, text }, index) => <FadeInSection key={title} delay={index * 0.04}><article className="h-full rounded-[1.5rem] border border-[#0D1B2A]/[0.07] bg-white p-6"><FeatureIcon icon={icon} /><h3 className="mt-6 text-base font-semibold text-[#0D1B2A]" style={poppinsFont}>{title}</h3><p className="mt-3 text-xs leading-6 text-[#66737E]">{text}</p></article></FadeInSection>)}
          </div>
        </Container>
      </section>

      <section className="bg-[#0D1B2A] py-20 text-white sm:py-24">
        <Container>
          <FadeInSection>
            <div className="grid items-center gap-8 lg:grid-cols-[1.08fr_0.92fr]">
              <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#72DBA2]">Nvet Care</p><h2 className="mt-4 max-w-2xl text-3xl font-bold tracking-[-0.035em] sm:text-4xl" style={poppinsFont}>{copy.missionTitle}</h2><p className="mt-5 max-w-2xl text-sm leading-7 text-white/65 sm:text-base">{copy.missionText}</p></div>
              <div className="relative h-64 overflow-hidden rounded-[1.7rem] border border-white/10 sm:h-72"><Image src="/images/nvetcareapp/mission-banner.jpg" alt={copy.missionTitle} fill sizes="(min-width:1024px) 45vw, 100vw" className="object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-[#0D1B2A]/45 to-transparent" /></div>
            </div>
          </FadeInSection>
        </Container>
      </section>

      <section className="bg-white py-20 sm:py-28">
        <Container>
          <div className="mx-auto max-w-3xl">
            <h2 className="text-center text-3xl font-bold tracking-[-0.035em] text-[#0D1B2A] sm:text-4xl" style={poppinsFont}>{copy.faqTitle}</h2>
            <div className="mt-10 divide-y divide-[#0D1B2A]/[0.07] border-y border-[#0D1B2A]/[0.07]">{copy.faqs.map(([question, answer]) => <div key={question} className="py-6"><h3 className="text-sm font-semibold text-[#0D1B2A]" style={poppinsFont}>{question}</h3><p className="mt-3 text-sm leading-7 text-[#66737E]">{answer}</p></div>)}</div>
          </div>
        </Container>
      </section>

      <section className="bg-[#F4FBF7] py-16 sm:py-20">
        <Container>
          <div className="mx-auto max-w-4xl rounded-[2rem] border border-[#34B27A]/15 bg-white px-6 py-10 text-center shadow-[0_20px_60px_rgba(13,27,42,0.07)] sm:px-10 sm:py-12">
            <Smartphone size={26} className="mx-auto text-[#34B27A]" aria-hidden="true" />
            <h2 className="mx-auto mt-5 max-w-2xl text-3xl font-bold tracking-[-0.035em] text-[#0D1B2A]" style={poppinsFont}>{copy.finalTitle}</h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-[#66737E]">{copy.finalText}</p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row"><Link href="/nvetcareapp/iniciar-sesion" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#34B27A] px-6 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-[#2D9F6D]">{copy.finalPrimary} <ArrowRight size={14} /></Link><Link href="/changelog" className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#0D1B2A]/10 bg-white px-6 text-xs font-semibold uppercase tracking-[0.08em] text-[#0D1B2A] transition hover:bg-[#F7F9F8]">{copy.finalSecondary}</Link></div>
          </div>
        </Container>
      </section>
    </div>
  );
};
