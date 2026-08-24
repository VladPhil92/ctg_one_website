'use client';

import React, { type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Apple, ArrowUpRight, Bell, CalendarCheck, Car, CreditCard, Eye, Heart,
  MapPin, MessageCircle, PawPrint, ShieldCheck, Smartphone, Stethoscope,
  UserCheck, type LucideIcon,
} from 'lucide-react';
import { Container } from '@/components/ui';
import { FadeInSection } from '@/components/ui/FadeInSection';
import { useLanguage } from '@/contexts/LanguageContext';
import { ECOSYSTEM_TECHNOLOGY_UNITS, type TechnologyStatus } from '@/data/ecosystem-technology';

// Nvet Care's own visual identity, sampled directly from its brand kit
// (solid button fill, wordmark, and icon-system reference sheets) rather
// than reusing ctgone.com's dark "command center" palette. This subsite is
// intentionally allowed to look and feel like its own product — the ideas
// below are the only place that identity lives, scoped to this route via
// Tailwind arbitrary values so tailwind.config.ts / globals.css stay
// untouched. Class names must stay static string literals (no
// interpolation) so Tailwind's JIT scanner can pick them up.
const statusClass: Record<TechnologyStatus, string> = {
  LIVE: 'border-[#1E9C6C]/25 text-[#1E9C6C] bg-[#1E9C6C]/[0.08]',
  PARTIAL: 'border-amber-500/25 text-amber-700 bg-amber-500/[0.08]',
  'IN DEVELOPMENT': 'border-sky-500/25 text-sky-700 bg-sky-500/[0.08]',
  ROADMAP: 'border-[#0A1B2E]/12 text-[#5B6670] bg-[#0A1B2E]/[0.03]',
};
const statusDot: Record<TechnologyStatus, string> = {
  LIVE: 'bg-[#1E9C6C] shadow-[0_0_8px_rgba(30,156,108,0.5)]',
  PARTIAL: 'bg-amber-500',
  'IN DEVELOPMENT': 'bg-sky-500',
  ROADMAP: 'bg-[#0A1B2E]/30',
};

// Poppins end to end (H1-H3 and body), per the brand kit's own typography
// sheet. The route-scoped --font-poppins-nvet variable is set in
// nvetcareapp/layout.tsx; the global `h1..h6 { font-family: var(--font-outfit) }`
// base rule in globals.css targets headings directly, so each heading needs
// this applied on the element itself to win over that rule.
const poppinsFont: React.CSSProperties = { fontFamily: 'var(--font-poppins-nvet), Poppins, sans-serif' };

function StatusPill({ status }: { status: TechnologyStatus }) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border-[1px] px-3 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] ${statusClass[status]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${statusDot[status]}`} aria-hidden="true" />
      {status}
    </span>
  );
}

// A small pale-green outline chip — the eyebrow/badge shape used throughout
// Nvet Care's own marketing sheets — standing in for the site's global gold
// `Badge` component, which stays untouched for every other page.
function NvetPill({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border-[1px] border-[#1E9C6C]/25 bg-[#1E9C6C]/[0.06] px-3.5 py-1.5 text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.16em] text-[#1E9C6C] ${className}`.trim()}>
      {children}
    </span>
  );
}

// Nvet Care's icon system is documented as "línea + nodos": rounded-stroke
// line icons with a small circular orange node marking the connection
// point. This wrapper reproduces that literally instead of using bare
// Lucide icons.
function NodeIcon({ icon: Icon, size = 18, tone = 'navy' }: { icon: LucideIcon; size?: number; tone?: 'navy' | 'green' }) {
  return (
    <span className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-[1px] border-[#0A1B2E]/10 bg-white shadow-[0_1px_2px_rgba(10,27,46,0.04)]">
      <Icon size={size} strokeWidth={1.75} className={tone === 'green' ? 'text-[#1E9C6C]' : 'text-[#0A1B2E]'} aria-hidden="true" />
      <span className="absolute -bottom-1 -right-1 h-2.5 w-2.5 rounded-full bg-[#FF8F2E] ring-2 ring-white" aria-hidden="true" />
    </span>
  );
}

function SectionHeader({ badge, title, text }: { badge: string; title: string; text: string }) {
  return (
    <div className="mb-10 max-w-3xl sm:mb-14">
      <NvetPill className="mb-6">{badge}</NvetPill>
      <h2 className="mb-5 text-3xl font-bold tracking-[-0.025em] text-[#0A1B2E] sm:text-4xl" style={poppinsFont}>{title}</h2>
      <p className="text-sm leading-relaxed text-[#4A5A68] sm:text-base">{text}</p>
    </div>
  );
}

function StoreBadge({ icon: Icon, label, sublabel }: { icon: LucideIcon; label: string; sublabel: string }) {
  return (
    <div
      className="flex min-h-14 items-center gap-3 rounded-xl border-[1px] border-[#0A1B2E]/10 bg-[#0A1B2E]/[0.02] px-4 py-2.5 opacity-90"
      aria-disabled="true"
    >
      <Icon size={22} className="shrink-0 text-[#5B6670]" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-[9px] uppercase tracking-[0.1em] text-[#8592A0]">{sublabel}</p>
        <p className="truncate text-sm text-[#0A1B2E]">{label}</p>
      </div>
    </div>
  );
}

export const NvetCareAppSection: React.FC = () => {
  const { locale } = useLanguage();
  const es = locale === 'es';
  const unit = ECOSYSTEM_TECHNOLOGY_UNITS.find((item) => item.id === 'veterinary');

  const copy = es ? {
    badge: 'NVET CARE APP · App móvil en desarrollo',
    eyebrow: 'Marketplace veterinario a domicilio en Cartagena',
    title: 'Tu veterinario de confianza,', highlight: 'a un toque de distancia.',
    description: 'Nvet Care está construyendo un marketplace bajo demanda que conecta a dueños de mascotas en Cartagena con veterinarios verificados para visitas a domicilio, con reserva integrada y pagos divididos de forma segura entre la plataforma y el profesional.',
    appStoreSub: 'Descarga en', appStore: 'App Store · Próximamente',
    playSub: 'Descarga en', play: 'Google Play · Próximamente',
    followProgress: 'Sigue el desarrollo real', followProgressHref: '/changelog',
    statusBadge: 'Estado del producto', statusTitle: 'Estado del producto', statusText: 'La app móvil y el marketplace están en construcción. Esta página se actualiza junto con el código: no promocionamos capacidades que todavía no existen.',
    evidenceTitle: 'Por qué lo mostramos así', evidenceText: 'CTG One nunca confunde visión de producto con producto terminado. Cuando Nvet Care avance de estado, este subsitio y el mapa de tecnología en /ecosystem se actualizan juntos, no antes.',
    audienceBadge: '01 · Para quién es', audienceTitle: 'Un marketplace de dos lados.', audienceText: 'Nvet Care conecta dos experiencias distintas dentro de una misma app: quien necesita atención para su mascota, y el veterinario verificado que la presta a domicilio.',
    ownerTitle: 'Dueños de mascota', ownerItems: ['Encuentra veterinarios verificados cerca de ti', 'Agenda la visita a la hora que te sirva', 'Recibe atención profesional en casa', 'Paga de forma segura desde la app'],
    vetTitle: 'Veterinarios verificados', vetItems: ['Verifica tu identidad y credenciales', 'Define tu disponibilidad y zona de cobertura', 'Atiende visitas a domicilio', 'Recibe tu pago de forma segura y trazable'],
    stepsBadge: '02 · Cómo funcionará', stepsTitle: 'De la solicitud a la atención, en un flujo trazable.', stepsText: 'El flujo objetivo del producto está definido; cada capacidad avanza de estado a medida que existe implementación real, no antes.',
    steps: [
      { title: 'Solicitud', text: 'El dueño describe la necesidad de su mascota y su ubicación en Cartagena.' },
      { title: 'Verificación', text: 'Se confirma la identidad del veterinario y su disponibilidad para la zona.' },
      { title: 'Visita a domicilio', text: 'El veterinario atiende a la mascota directamente en el hogar.' },
      { title: 'Pago y seguimiento', text: 'El pago se divide de forma segura y la atención queda registrada.' },
    ],
    capsBadge: '03 · Capacidades', capsTitle: 'Capacidades con madurez explícita.', capsText: 'Los mismos estados que aparecen en el mapa de tecnología del ecosistema, sin duplicar la fuente de verdad.',
    capsLink: 'Ver mapa completo de tecnología',
    trustBadge: '04 · Principios de diseño', trustTitle: 'Confianza y seguridad, desde el diseño.', trustText: 'Estos son los principios sobre los que se está construyendo el producto, no capacidades ya activas.',
    trustItems: [
      { icon: ShieldCheck, title: 'Veterinarios verificados', text: 'Identidad y credenciales confirmadas antes de operar en la plataforma.' },
      { icon: CreditCard, title: 'Pagos divididos y trazables', text: 'El cobro se reparte entre plataforma y profesional con registro auditable.' },
      { icon: Heart, title: 'Historial por mascota', text: 'Cada visita queda asociada al perfil de la mascota, no solo del dueño.' },
      { icon: Eye, title: 'Datos protegidos por diseño', text: 'Acceso a información sensible limitado por identidad y propósito.' },
    ],
    faqBadge: 'Preguntas frecuentes', faqTitle: 'Lo que la gente suele preguntar.',
    faqs: [
      { q: '¿Cuándo estará disponible?', a: 'Aún no hay fecha pública de lanzamiento. Puedes seguir el avance real en nuestro changelog.' },
      { q: '¿En qué ciudad opera?', a: 'El primer mercado objetivo es Cartagena.' },
      { q: '¿Nvet Care reemplaza una urgencia veterinaria?', a: 'No. Para emergencias, contacta directamente a una clínica veterinaria de urgencias.' },
      { q: '¿Cómo me entero cuando esté disponible?', a: 'Escríbenos por nuestro canal de contacto; el avance real también queda reflejado en el changelog y en el mapa de tecnología.' },
    ],
    closingTitle: 'La app todavía no está publicada.', closingText: 'Este subsitio se actualiza en cuanto exista evidencia real de producto, siguiendo la misma regla de evidencia que el resto de CTG One.',
    contactCta: 'Escríbenos', changelogCta: 'Ver changelog',
    conceptTag: 'Concepto de producto',
    mockupAlt: 'Maqueta de diseño de la pantalla de seguimiento de una visita veterinaria a domicilio, con el estado del servicio y el tiempo estimado de llegada.',
    ownerPhotoAlt: 'Una persona abraza a su perro en casa.',
    featureShowcaseAlt: 'Un veterinario atiende a un perro en la sala de una casa, junto a los beneficios del servicio a domicilio y los pasos para reservarlo.',
    missionBannerAlt: 'Una persona abraza a su perro y a su gato, junto al mensaje de misión de Nvet Care.',
    galleryBadge: 'Más conceptos de producto',
    galleryTitle: 'Otras pantallas del concepto.',
    galleryText: 'Ilustraciones adicionales del diseño en curso — mockups, no capturas de un producto ya publicado.',
    mapTrackingFullAlt: 'Maqueta de diseño de la pantalla de seguimiento con mapa, mostrando la ruta del veterinario hacia la ubicación del cliente.',
    homeScreenPhotoAlt: 'Una persona sostiene un teléfono mostrando la pantalla de inicio del concepto de app, con servicios y una cita próxima de ejemplo.',
  } : {
    badge: 'NVET CARE APP · Mobile app in development',
    eyebrow: 'On-demand home-visit veterinary marketplace in Cartagena',
    title: 'Your trusted veterinarian,', highlight: 'one tap away.',
    description: 'Nvet Care is building an on-demand marketplace connecting pet owners in Cartagena with verified veterinarians for home visits, with integrated booking and secure split payments between the platform and the professional.',
    appStoreSub: 'Download on', appStore: 'App Store · Coming soon',
    playSub: 'Get it on', play: 'Google Play · Coming soon',
    followProgress: 'Follow real progress', followProgressHref: '/changelog',
    statusBadge: 'Product status', statusTitle: 'Product status', statusText: 'The mobile app and marketplace are under construction. This page updates alongside the code: we do not promote capabilities that do not exist yet.',
    evidenceTitle: 'Why we show it this way', evidenceText: 'CTG One never confuses product vision with a finished product. When Nvet Care advances in status, this subsite and the technology map at /ecosystem update together, not before.',
    audienceBadge: '01 · Who it is for', audienceTitle: 'A two-sided marketplace.', audienceText: 'Nvet Care connects two distinct experiences inside one app: the person who needs care for their pet, and the verified veterinarian who delivers it at home.',
    ownerTitle: 'Pet owners', ownerItems: ['Find verified veterinarians near you', 'Book a visit at a time that works for you', 'Get professional care at home', 'Pay securely from the app'],
    vetTitle: 'Verified veterinarians', vetItems: ['Verify your identity and credentials', 'Set your availability and coverage area', 'Deliver home visits', 'Get paid securely and traceably'],
    stepsBadge: '02 · How it will work', stepsTitle: 'From request to care, in a traceable flow.', stepsText: 'The target product flow is defined; each capability advances in status as real implementation exists, not before.',
    steps: [
      { title: 'Request', text: 'The owner describes their pet’s need and their location in Cartagena.' },
      { title: 'Verification', text: 'The veterinarian’s identity and availability for the area are confirmed.' },
      { title: 'Home visit', text: 'The veterinarian cares for the pet directly at home.' },
      { title: 'Payment and follow-up', text: 'Payment is split securely and the visit is recorded.' },
    ],
    capsBadge: '03 · Capabilities', capsTitle: 'Capabilities with explicit maturity.', capsText: 'The same statuses shown on the ecosystem technology map, without duplicating the source of truth.',
    capsLink: 'View the full technology map',
    trustBadge: '04 · Design principles', trustTitle: 'Trust and safety, by design.', trustText: 'These are the principles the product is being built on, not capabilities that are already active.',
    trustItems: [
      { icon: ShieldCheck, title: 'Verified veterinarians', text: 'Identity and credentials confirmed before operating on the platform.' },
      { icon: CreditCard, title: 'Split, traceable payments', text: 'Payment is split between platform and professional with an auditable record.' },
      { icon: Heart, title: 'Per-pet history', text: 'Every visit is tied to the pet’s profile, not just the owner’s.' },
      { icon: Eye, title: 'Data protected by design', text: 'Access to sensitive information limited by identity and purpose.' },
    ],
    faqBadge: 'Frequently asked questions', faqTitle: 'What people usually ask.',
    faqs: [
      { q: 'When will it be available?', a: 'There is no public launch date yet. You can follow real progress in our changelog.' },
      { q: 'Which city does it operate in?', a: 'The first target market is Cartagena.' },
      { q: 'Does Nvet Care replace a veterinary emergency?', a: 'No. For emergencies, contact an emergency veterinary clinic directly.' },
      { q: 'How will I know when it launches?', a: 'Reach out through our contact channel; real progress is also reflected in the changelog and the technology map.' },
    ],
    closingTitle: 'The app is not published yet.', closingText: 'This subsite updates as soon as real product evidence exists, following the same evidence rule as the rest of CTG One.',
    contactCta: 'Contact us', changelogCta: 'View changelog',
    conceptTag: 'Product concept',
    mockupAlt: 'Design mockup of the home-visit tracking screen, showing service status and estimated arrival time.',
    ownerPhotoAlt: 'A person hugging their dog at home.',
    featureShowcaseAlt: 'A veterinarian tending to a dog in a living room, alongside the benefits of the home-visit service and the steps to book it.',
    missionBannerAlt: 'A person hugging their dog and cat, alongside Nvet Care’s mission statement.',
    galleryBadge: 'More product concepts',
    galleryTitle: 'Other screens from the concept.',
    galleryText: 'Additional illustrations of the design in progress — mockups, not screenshots of an already-published product.',
    mapTrackingFullAlt: 'Design mockup of the map tracking screen, showing the veterinarian’s route to the client’s location.',
    homeScreenPhotoAlt: 'A person holding a phone showing the app concept’s home screen, with services and a sample upcoming appointment.',
  };

  const stepIcons = [MapPin, UserCheck, Car, CalendarCheck];

  return (
    <div style={poppinsFont}>
      <section className="relative overflow-hidden bg-white">
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute -top-40 right-[-14%] w-[900px] h-[900px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(30,156,108,0.05), transparent 68%)' }} />
          <div className="absolute -bottom-32 left-[-10%] w-[700px] h-[700px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(255,143,46,0.05), transparent 70%)' }} />
          <Image
            src="/images/logo/nvet-care-icon.png"
            alt=""
            width={520}
            height={404}
            aria-hidden="true"
            loading="eager"
            className="absolute -right-16 top-24 opacity-[0.04] hidden lg:block"
          />
        </div>

        <div className="relative py-20 sm:py-28 md:py-32">
          <Container>
            <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-12 lg:gap-10 items-center">
              <FadeInSection>
                <div className="max-w-2xl">
                  <div className="mb-6 flex items-center gap-3">
                    <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl border-[1px] border-[#0A1B2E]/8 bg-[#0A1B2E]/[0.02]">
                      <span className="relative h-7 w-9">
                        <Image src="/images/logo/nvet-care-icon.png" alt="Nvet Care" fill sizes="36px" className="object-contain" />
                      </span>
                    </span>
                    <span className="text-xl font-bold tracking-[-0.01em]" style={poppinsFont}>
                      <span className="text-[#0A1B2E]">Nvet</span> <span className="text-[#1E9C6C]">Care</span>
                    </span>
                  </div>
                  <NvetPill className="mb-6">{copy.badge}</NvetPill>
                  <div className="mb-5 flex items-center gap-3">
                    <span className="w-8 h-px bg-[#1E9C6C]/60" />
                    <span className="text-[11px] uppercase tracking-[0.18em] text-[#8592A0]">{copy.eyebrow}</span>
                  </div>
                  <h1 className="mb-7 font-extrabold text-4xl sm:text-5xl md:text-[3.4rem] leading-[1.05] tracking-[-0.03em]" style={poppinsFont}>
                    <span className="text-[#0A1B2E]">{copy.title}</span>{' '}<span className="text-[#1E9C6C]">{copy.highlight}</span>
                  </h1>
                  <p className="mb-9 text-sm sm:text-base leading-relaxed text-[#4A5A68] max-w-xl">{copy.description}</p>

                  <div className="flex flex-wrap items-center gap-4 mb-6">
                    <Link
                      href={copy.followProgressHref}
                      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#1E9C6C] px-6 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-white shadow-[0_10px_24px_rgba(30,156,108,0.28)] transition-transform hover:-translate-y-0.5 hover:bg-[#178258]"
                    >
                      <Bell size={13} /> {copy.followProgress} <ArrowUpRight size={13} />
                    </Link>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <StoreBadge icon={Apple} label={copy.appStore} sublabel={copy.appStoreSub} />
                    <StoreBadge icon={Smartphone} label={copy.play} sublabel={copy.playSub} />
                  </div>
                </div>
              </FadeInSection>

              <FadeInSection direction="left" delay={0.08}>
                <div className="relative mx-auto w-full max-w-[280px]">
                  {/* A pattern tile from the brand kit's own graphic-pattern sheet ("Conexión de nodos") — pure abstract art, no text or claims. */}
                  <Image
                    src="/images/nvetcareapp/pattern-nodes.png"
                    alt=""
                    aria-hidden="true"
                    width={266}
                    height={216}
                    className="absolute -right-5 -top-8 hidden w-28 -rotate-6 rounded-2xl shadow-[0_20px_40px_rgba(10,27,46,0.18)] sm:block"
                  />
                  <Image
                    src={es ? '/images/nvetcareapp/vet-tracking-mockup-es.png' : '/images/nvetcareapp/vet-tracking-mockup-en.png'}
                    alt={copy.mockupAlt}
                    width={432}
                    height={348}
                    loading="eager"
                    className="relative h-auto w-full drop-shadow-[0_30px_60px_rgba(10,27,46,0.18)]"
                  />
                  <p className="mt-4 text-center text-[9px] uppercase tracking-[0.14em] text-[#8592A0]">{copy.conceptTag}</p>
                </div>
              </FadeInSection>
            </div>
          </Container>
        </div>

        <div className="relative pb-20 sm:pb-28">
          <Container>
            <div className="grid lg:grid-cols-2 gap-6">
              <FadeInSection direction="left">
                <div className="h-full rounded-2xl border-[1px] border-[#0A1B2E]/[0.08] bg-white p-7 sm:p-8 shadow-[0_1px_3px_rgba(10,27,46,0.04)]">
                  <div className="mb-5 flex items-center justify-between gap-4">
                    <span className="text-[9px] uppercase tracking-[0.18em] text-[#8592A0]">{copy.statusBadge}</span>
                    {unit && <StatusPill status={unit.status} />}
                  </div>
                  <h2 className="mb-3 text-lg font-semibold text-[#0A1B2E]" style={poppinsFont}>{copy.statusTitle}</h2>
                  <p className="text-sm leading-relaxed text-[#4A5A68]">{copy.statusText}</p>
                </div>
              </FadeInSection>
              <FadeInSection direction="right" delay={0.05}>
                <div className="h-full rounded-2xl border-[1px] border-[#1E9C6C]/15 bg-[#1E9C6C]/[0.04] p-7 sm:p-8">
                  <div className="mb-5 flex items-center gap-3">
                    <Eye size={17} className="text-[#1E9C6C]" />
                    <span className="text-[9px] uppercase tracking-[0.18em] text-[#1E9C6C]">{copy.evidenceTitle}</span>
                  </div>
                  <p className="text-sm leading-relaxed text-[#4A5A68]">{copy.evidenceText}</p>
                </div>
              </FadeInSection>
            </div>
          </Container>
        </div>
      </section>

      <section className="relative bg-[#FAFBFC] border-y border-[#0A1B2E]/[0.05] py-20 sm:py-28">
        <Container>
          <SectionHeader badge={copy.audienceBadge} title={copy.audienceTitle} text={copy.audienceText} />
          <div className="grid md:grid-cols-2 gap-5">
            {[
              { icon: PawPrint, title: copy.ownerTitle, items: copy.ownerItems, tone: 'green' as const, photo: '/images/nvetcareapp/owner-and-dog.jpg', photoAlt: copy.ownerPhotoAlt },
              { icon: Stethoscope, title: copy.vetTitle, items: copy.vetItems, tone: 'navy' as const, photo: null, photoAlt: '' },
            ].map((card, index) => (
              <FadeInSection key={card.title} delay={0.03 + index * 0.05}>
                <div className="h-full overflow-hidden rounded-2xl border-[1px] border-[#0A1B2E]/[0.08] bg-white shadow-[0_1px_3px_rgba(10,27,46,0.04)]">
                  {card.photo && (
                    <div className="relative h-40 w-full sm:h-48">
                      <Image src={card.photo} alt={card.photoAlt} fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
                    </div>
                  )}
                  <div className="p-7 sm:p-8">
                    <div className="mb-6">
                      <NodeIcon icon={card.icon} size={19} tone={card.tone} />
                    </div>
                    <h3 className="mb-5 text-xl font-semibold text-[#0A1B2E]" style={poppinsFont}>{card.title}</h3>
                    <ul className="space-y-3">
                      {card.items.map((item) => (
                        <li key={item} className="flex items-start gap-3 text-sm text-[#4A5A68] leading-relaxed">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#FF8F2E]" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </FadeInSection>
            ))}
          </div>
        </Container>
      </section>

      <section className="relative bg-white py-20 sm:py-28">
        <Container>
          <SectionHeader badge={copy.stepsBadge} title={copy.stepsTitle} text={copy.stepsText} />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {copy.steps.map((step, index) => {
              const Icon = stepIcons[index];
              return (
                <FadeInSection key={step.title} delay={0.03 + index * 0.05}>
                  <div className="h-full rounded-2xl border-[1px] border-[#0A1B2E]/[0.08] bg-white p-6 shadow-[0_1px_3px_rgba(10,27,46,0.04)]">
                    <div className="mb-5 flex items-center justify-between">
                      <span className="font-mono text-[10px] text-[#FF8F2E] font-semibold">{String(index + 1).padStart(2, '0')}</span>
                      <NodeIcon icon={Icon} size={15} tone={index % 2 === 0 ? 'green' : 'navy'} />
                    </div>
                    <h3 className="mb-2.5 text-base font-semibold text-[#0A1B2E]" style={poppinsFont}>{step.title}</h3>
                    <p className="text-xs leading-relaxed text-[#4A5A68]">{step.text}</p>
                  </div>
                </FadeInSection>
              );
            })}
          </div>
        </Container>
      </section>

      <section className="relative bg-white pb-20 sm:pb-28">
        <Container>
          <FadeInSection>
            <div className="overflow-hidden rounded-2xl border-[1px] border-[#0A1B2E]/[0.08] shadow-[0_1px_3px_rgba(10,27,46,0.04)]">
              <Image
                src="/images/nvetcareapp/feature-showcase.jpg"
                alt={copy.featureShowcaseAlt}
                width={1402}
                height={1122}
                sizes="(min-width: 1152px) 1152px, 100vw"
                className="h-auto w-full"
              />
            </div>
          </FadeInSection>
        </Container>
      </section>

      <section className="relative bg-white pb-20 sm:pb-28">
        <Container>
          <SectionHeader badge={copy.galleryBadge} title={copy.galleryTitle} text={copy.galleryText} />
          <div className="grid sm:grid-cols-2 gap-6">
            <FadeInSection direction="left">
              <div className="mx-auto max-w-[380px] overflow-hidden rounded-2xl border-[1px] border-[#0A1B2E]/[0.08] shadow-[0_1px_3px_rgba(10,27,46,0.04)]">
                <Image
                  src="/images/nvetcareapp/vet-tracking-full.jpg"
                  alt={copy.mapTrackingFullAlt}
                  width={1024}
                  height={1536}
                  sizes="(min-width: 640px) 380px, 90vw"
                  className="h-auto w-full"
                />
              </div>
            </FadeInSection>
            <FadeInSection direction="right" delay={0.05}>
              <div className="mx-auto max-w-[380px] overflow-hidden rounded-2xl border-[1px] border-[#0A1B2E]/[0.08] shadow-[0_1px_3px_rgba(10,27,46,0.04)]">
                <Image
                  src="/images/nvetcareapp/home-screen-phone.jpg"
                  alt={copy.homeScreenPhotoAlt}
                  width={1122}
                  height={1402}
                  sizes="(min-width: 640px) 380px, 90vw"
                  className="h-auto w-full"
                />
              </div>
            </FadeInSection>
          </div>
        </Container>
      </section>

      <section className="relative bg-[#FAFBFC] border-y border-[#0A1B2E]/[0.05] py-20 sm:py-28">
        <Container>
          <SectionHeader badge={copy.capsBadge} title={copy.capsTitle} text={copy.capsText} />
          {unit && (
            <FadeInSection>
              <div className="rounded-2xl border-[1px] border-[#0A1B2E]/[0.08] bg-white p-6 sm:p-7 mb-8 shadow-[0_1px_3px_rgba(10,27,46,0.04)]">
                <div className="space-y-2.5">
                  {unit.capabilities.map((capability) => (
                    <div key={capability.nameEn} className="flex min-h-11 items-center justify-between gap-3 rounded-lg border-[1px] border-[#0A1B2E]/[0.05] px-4 py-3">
                      <span className="text-sm text-[#334352]">{es ? capability.nameEs : capability.nameEn}</span>
                      <StatusPill status={capability.status} />
                    </div>
                  ))}
                </div>
              </div>
            </FadeInSection>
          )}
          <Link href="/ecosystem" className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-[#1E9C6C] hover:text-[#0A1B2E] transition-colors">
            {copy.capsLink} <ArrowUpRight size={13} />
          </Link>
        </Container>
      </section>

      <section className="relative bg-white py-20 sm:py-28">
        <Container>
          <SectionHeader badge={copy.trustBadge} title={copy.trustTitle} text={copy.trustText} />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {copy.trustItems.map((item, index) => (
              <FadeInSection key={item.title} delay={0.03 + index * 0.04}>
                <div className="h-full rounded-2xl border-[1px] border-[#0A1B2E]/[0.07] p-6">
                  <div className="mb-5">
                    <NodeIcon icon={item.icon} tone={index % 2 === 0 ? 'green' : 'navy'} />
                  </div>
                  <h3 className="mb-2.5 text-sm font-semibold text-[#0A1B2E]" style={poppinsFont}>{item.title}</h3>
                  <p className="text-xs leading-relaxed text-[#5B6670]">{item.text}</p>
                </div>
              </FadeInSection>
            ))}
          </div>
        </Container>
      </section>

      <section className="relative bg-[#0D1B2A] py-20 sm:py-28">
        <Container>
          <FadeInSection>
            <div className="overflow-hidden rounded-2xl">
              <Image
                src="/images/nvetcareapp/mission-banner.jpg"
                alt={copy.missionBannerAlt}
                width={1536}
                height={1024}
                sizes="(min-width: 1152px) 1152px, 100vw"
                className="h-auto w-full"
              />
            </div>
          </FadeInSection>
        </Container>
      </section>

      <section className="relative bg-[#FAFBFC] border-t border-[#0A1B2E]/[0.05] py-20 sm:py-28">
        <Container>
          <FadeInSection>
            <NvetPill className="mb-6">{copy.faqBadge}</NvetPill>
            <h2 className="mb-10 text-3xl font-bold tracking-[-0.025em] text-[#0A1B2E] sm:text-4xl" style={poppinsFont}>{copy.faqTitle}</h2>
          </FadeInSection>
          <div className="grid sm:grid-cols-2 gap-4">
            {copy.faqs.map((faq, index) => (
              <FadeInSection key={faq.q} delay={0.02 + index * 0.03}>
                <div className="h-full rounded-xl border-[1px] border-[#0A1B2E]/[0.08] bg-white p-6 shadow-[0_1px_3px_rgba(10,27,46,0.04)]">
                  <div className="mb-3 flex items-start gap-2.5">
                    <MessageCircle size={14} className="mt-0.5 shrink-0 text-[#1E9C6C]" />
                    <h3 className="text-sm font-semibold text-[#0A1B2E]" style={poppinsFont}>{faq.q}</h3>
                  </div>
                  <p className="text-xs leading-relaxed text-[#4A5A68]">{faq.a}</p>
                </div>
              </FadeInSection>
            ))}
          </div>
        </Container>
      </section>

      <section className="relative bg-white py-20 sm:py-24">
        <Container>
          <FadeInSection>
            <div className="rounded-2xl border-[1px] border-[#1E9C6C]/15 bg-[#1E9C6C]/[0.04] p-7 sm:p-10 grid md:grid-cols-[1fr_auto] gap-8 items-center">
              <div>
                <h2 className="mb-3 text-2xl sm:text-3xl font-bold text-[#0A1B2E]" style={poppinsFont}>{copy.closingTitle}</h2>
                <p className="max-w-2xl text-sm leading-relaxed text-[#4A5A68]">{copy.closingText}</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href="/contact" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#1E9C6C] px-5 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-white shadow-[0_8px_20px_rgba(30,156,108,0.25)] transition-transform hover:-translate-y-0.5 hover:bg-[#178258] whitespace-nowrap">
                  {copy.contactCta} <ArrowUpRight size={13} />
                </Link>
                <Link href="/changelog" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border-[1px] border-[#1E9C6C]/30 bg-white px-5 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-[#1E9C6C] hover:bg-[#1E9C6C]/5 transition-colors whitespace-nowrap">
                  {copy.changelogCta}
                </Link>
              </div>
            </div>
          </FadeInSection>
        </Container>
      </section>
    </div>
  );
};
