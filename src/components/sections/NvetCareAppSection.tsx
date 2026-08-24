'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Apple, ArrowUpRight, Bell, CalendarCheck, Car, CreditCard, Eye, Heart,
  MapPin, MessageCircle, PawPrint, ShieldCheck, Smartphone, Stethoscope,
  UserCheck, type LucideIcon,
} from 'lucide-react';
import { Container } from '@/components/ui';
import { Badge } from '@/components/ui/Badge';
import { FadeInSection } from '@/components/ui/FadeInSection';
import { useLanguage } from '@/contexts/LanguageContext';
import { ECOSYSTEM_TECHNOLOGY_UNITS, type TechnologyStatus } from '@/data/ecosystem-technology';

const statusClass: Record<TechnologyStatus, string> = {
  LIVE: 'border-accent/30 text-accent bg-accent/[0.035]',
  PARTIAL: 'border-amber-200/15 text-amber-100/70 bg-amber-100/[0.02]',
  'IN DEVELOPMENT': 'border-sky-300/20 text-sky-200/75 bg-sky-200/[0.025]',
  ROADMAP: 'border-white/[0.07] text-text-dim bg-white/[0.015]',
};
const statusDot: Record<TechnologyStatus, string> = {
  LIVE: 'bg-accent shadow-[0_0_10px_rgba(212,162,89,0.45)]',
  PARTIAL: 'bg-amber-200/60',
  'IN DEVELOPMENT': 'bg-sky-200/60',
  ROADMAP: 'bg-white/20',
};

function StatusPill({ status }: { status: TechnologyStatus }) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[9px] font-medium uppercase tracking-[0.14em] ${statusClass[status]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${statusDot[status]}`} aria-hidden="true" />
      {status}
    </span>
  );
}

function SectionHeader({ badge, title, text }: { badge: string; title: string; text: string }) {
  return (
    <div className="mb-10 max-w-3xl sm:mb-14">
      <Badge variant="accent" className="mb-6">{badge}</Badge>
      <h2 className="mb-5 font-outfit text-3xl font-semibold tracking-[-0.035em] text-white sm:text-4xl">{title}</h2>
      <p className="text-sm leading-relaxed text-text-muted sm:text-base">{text}</p>
    </div>
  );
}

function StoreBadge({ icon: Icon, label, sublabel }: { icon: LucideIcon; label: string; sublabel: string }) {
  return (
    <div
      className="flex min-h-14 items-center gap-3 rounded-xl border border-white/[0.09] bg-white/[0.015] px-4 py-2.5 opacity-80"
      aria-disabled="true"
    >
      <Icon size={22} className="shrink-0 text-text-dim" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-[9px] uppercase tracking-[0.1em] text-text-dim">{sublabel}</p>
        <p className="truncate text-sm text-white">{label}</p>
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
  };

  const stepIcons = [MapPin, UserCheck, Car, CalendarCheck];

  return (
    <>
      <section className="relative overflow-hidden bg-bg-primary">
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute -top-40 right-[-14%] w-[900px] h-[900px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(140,154,174,0.09), transparent 68%)' }} />
          <div className="absolute -bottom-32 left-[-10%] w-[700px] h-[700px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(212,162,89,0.06), transparent 70%)' }} />
        </div>

        <div className="relative py-20 sm:py-28 md:py-32">
          <Container>
            <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-12 lg:gap-10 items-center">
              <FadeInSection>
                <div className="max-w-2xl">
                  <div className="mb-7 flex items-center gap-4">
                    <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.02]">
                      <span className="relative h-8 w-10">
                        <Image src="/images/logo/nvet-care-icon.png" alt="Nvet Care" fill sizes="40px" className="object-contain" />
                      </span>
                    </span>
                    <Badge variant="accent">{copy.badge}</Badge>
                  </div>
                  <div className="mb-5 flex items-center gap-3">
                    <span className="w-8 h-px bg-accent/60" />
                    <span className="text-[11px] uppercase tracking-[0.18em] text-text-dim">{copy.eyebrow}</span>
                  </div>
                  <h1 className="mb-7 font-outfit font-semibold text-4xl sm:text-5xl md:text-[3.4rem] leading-[1.05] tracking-[-0.04em]">
                    <span className="text-white">{copy.title}</span>{' '}<span className="text-accent">{copy.highlight}</span>
                  </h1>
                  <p className="mb-9 text-sm sm:text-base leading-relaxed text-text-muted max-w-xl">{copy.description}</p>

                  <div className="flex flex-wrap gap-3 mb-6">
                    <StoreBadge icon={Apple} label={copy.appStore} sublabel={copy.appStoreSub} />
                    <StoreBadge icon={Smartphone} label={copy.play} sublabel={copy.playSub} />
                  </div>
                  <Link href={copy.followProgressHref} className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-accent hover:text-white transition-colors">
                    <Bell size={13} /> {copy.followProgress} <ArrowUpRight size={13} />
                  </Link>
                </div>
              </FadeInSection>

              <FadeInSection direction="left" delay={0.08}>
                <div className="relative mx-auto w-full max-w-[300px]">
                  <div className="rounded-[2.5rem] border border-white/[0.09] bg-black/30 p-3 shadow-[0_40px_100px_rgba(0,0,0,0.45)]">
                    <div className="rounded-[2rem] border border-white/[0.06] bg-[#050a10] p-5 pt-8">
                      <div className="mx-auto mb-6 h-1 w-16 rounded-full bg-white/10" aria-hidden="true" />
                      <div className="mb-5 flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.04] text-accent"><PawPrint size={16} /></span>
                        <div className="min-w-0">
                          <div className="h-2 w-24 rounded-full bg-white/[0.09] mb-1.5" />
                          <div className="h-1.5 w-16 rounded-full bg-white/[0.05]" />
                        </div>
                      </div>
                      {[Stethoscope, CalendarCheck, MapPin].map((Icon, index) => (
                        <div key={index} className="mb-2.5 flex items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.015] p-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-text-dim"><Icon size={14} /></span>
                          <div className="min-w-0 flex-1">
                            <div className="h-1.5 w-full max-w-[110px] rounded-full bg-white/[0.08] mb-1.5" />
                            <div className="h-1.5 w-16 rounded-full bg-white/[0.04]" />
                          </div>
                        </div>
                      ))}
                      <div className="mt-4 rounded-xl border border-accent/15 bg-accent/[0.03] p-3 text-center">
                        <span className="text-[9px] uppercase tracking-[0.14em] text-accent/80">{es ? 'Concepto de producto' : 'Product concept'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </FadeInSection>
            </div>
          </Container>
        </div>

        <div className="relative pb-20 sm:pb-28">
          <Container>
            <div className="grid lg:grid-cols-2 gap-6">
              <FadeInSection direction="left">
                <div className="h-full rounded-2xl border border-white/[0.055] bg-white/[0.012] p-7 sm:p-8">
                  <div className="mb-5 flex items-center justify-between gap-4">
                    <span className="text-[9px] uppercase tracking-[0.18em] text-text-dim">{copy.statusBadge}</span>
                    {unit && <StatusPill status={unit.status} />}
                  </div>
                  <h2 className="mb-3 font-outfit text-lg text-white">{copy.statusTitle}</h2>
                  <p className="text-sm leading-relaxed text-text-muted">{copy.statusText}</p>
                </div>
              </FadeInSection>
              <FadeInSection direction="right" delay={0.05}>
                <div className="h-full rounded-2xl border border-accent/15 bg-accent/[0.025] p-7 sm:p-8">
                  <div className="mb-5 flex items-center gap-3">
                    <Eye size={17} className="text-accent" />
                    <span className="text-[9px] uppercase tracking-[0.18em] text-accent">{copy.evidenceTitle}</span>
                  </div>
                  <p className="text-sm leading-relaxed text-text-muted">{copy.evidenceText}</p>
                </div>
              </FadeInSection>
            </div>
          </Container>
        </div>
      </section>

      <section className="relative bg-bg-secondary border-y border-white/[0.035] py-20 sm:py-28">
        <Container>
          <SectionHeader badge={copy.audienceBadge} title={copy.audienceTitle} text={copy.audienceText} />
          <div className="grid md:grid-cols-2 gap-5">
            {[
              { icon: PawPrint, title: copy.ownerTitle, items: copy.ownerItems },
              { icon: Stethoscope, title: copy.vetTitle, items: copy.vetItems },
            ].map((card, index) => {
              const Icon = card.icon;
              return (
                <FadeInSection key={card.title} delay={0.03 + index * 0.05}>
                  <div className="h-full rounded-2xl border border-white/[0.055] bg-black/20 p-7 sm:p-8">
                    <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-full border border-accent/20 text-accent">
                      <Icon size={18} />
                    </div>
                    <h3 className="mb-5 font-outfit text-xl text-white">{card.title}</h3>
                    <ul className="space-y-3">
                      {card.items.map((item) => (
                        <li key={item} className="flex items-start gap-3 text-sm text-text-muted leading-relaxed">
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent/60" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </FadeInSection>
              );
            })}
          </div>
        </Container>
      </section>

      <section className="relative bg-bg-primary py-20 sm:py-28">
        <Container>
          <SectionHeader badge={copy.stepsBadge} title={copy.stepsTitle} text={copy.stepsText} />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {copy.steps.map((step, index) => {
              const Icon = stepIcons[index];
              return (
                <FadeInSection key={step.title} delay={0.03 + index * 0.05}>
                  <div className="h-full rounded-2xl border border-white/[0.055] bg-white/[0.01] p-6">
                    <div className="mb-5 flex items-center justify-between">
                      <span className="font-mono text-[10px] text-accent/60">{String(index + 1).padStart(2, '0')}</span>
                      <Icon size={16} className="text-text-dim" aria-hidden="true" />
                    </div>
                    <h3 className="mb-2.5 font-outfit text-base text-white">{step.title}</h3>
                    <p className="text-xs leading-relaxed text-text-muted">{step.text}</p>
                  </div>
                </FadeInSection>
              );
            })}
          </div>
        </Container>
      </section>

      <section className="relative bg-bg-secondary border-y border-white/[0.035] py-20 sm:py-28">
        <Container>
          <SectionHeader badge={copy.capsBadge} title={copy.capsTitle} text={copy.capsText} />
          {unit && (
            <FadeInSection>
              <div className="rounded-2xl border border-white/[0.055] bg-black/20 p-6 sm:p-7 mb-8">
                <div className="space-y-2.5">
                  {unit.capabilities.map((capability) => (
                    <div key={capability.nameEn} className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-white/[0.04] px-4 py-3">
                      <span className="text-sm text-text-secondary">{es ? capability.nameEs : capability.nameEn}</span>
                      <StatusPill status={capability.status} />
                    </div>
                  ))}
                </div>
              </div>
            </FadeInSection>
          )}
          <Link href="/ecosystem" className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-accent hover:text-white transition-colors">
            {copy.capsLink} <ArrowUpRight size={13} />
          </Link>
        </Container>
      </section>

      <section className="relative bg-bg-primary py-20 sm:py-28">
        <Container>
          <SectionHeader badge={copy.trustBadge} title={copy.trustTitle} text={copy.trustText} />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {copy.trustItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <FadeInSection key={item.title} delay={0.03 + index * 0.04}>
                  <div className="h-full rounded-2xl border border-white/[0.05] p-6">
                    <Icon size={18} className="text-accent mb-5" />
                    <h3 className="mb-2.5 font-outfit text-sm text-white">{item.title}</h3>
                    <p className="text-xs leading-relaxed text-text-dim">{item.text}</p>
                  </div>
                </FadeInSection>
              );
            })}
          </div>
        </Container>
      </section>

      <section className="relative bg-bg-secondary border-t border-white/[0.035] py-20 sm:py-28">
        <Container>
          <FadeInSection>
            <Badge variant="accent" className="mb-6">{copy.faqBadge}</Badge>
            <h2 className="mb-10 font-outfit text-3xl font-semibold tracking-[-0.035em] text-white sm:text-4xl">{copy.faqTitle}</h2>
          </FadeInSection>
          <div className="grid sm:grid-cols-2 gap-4">
            {copy.faqs.map((faq, index) => (
              <FadeInSection key={faq.q} delay={0.02 + index * 0.03}>
                <div className="h-full rounded-xl border border-white/[0.05] p-6">
                  <div className="mb-3 flex items-start gap-2.5">
                    <MessageCircle size={14} className="mt-0.5 shrink-0 text-accent/70" />
                    <h3 className="text-sm text-white">{faq.q}</h3>
                  </div>
                  <p className="text-xs leading-relaxed text-text-muted">{faq.a}</p>
                </div>
              </FadeInSection>
            ))}
          </div>
        </Container>
      </section>

      <section className="relative bg-bg-primary py-20 sm:py-24">
        <Container>
          <FadeInSection>
            <div className="rounded-2xl border border-accent/15 bg-accent/[0.025] p-7 sm:p-10 grid md:grid-cols-[1fr_auto] gap-8 items-center">
              <div>
                <h2 className="mb-3 font-outfit text-2xl sm:text-3xl text-white">{copy.closingTitle}</h2>
                <p className="max-w-2xl text-sm leading-relaxed text-text-muted">{copy.closingText}</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href="/contact" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-accent/25 px-5 py-3 text-xs uppercase tracking-[0.12em] text-accent hover:bg-accent/5 transition-colors whitespace-nowrap">
                  {copy.contactCta} <ArrowUpRight size={13} />
                </Link>
                <Link href="/changelog" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/[0.09] px-5 py-3 text-xs uppercase tracking-[0.12em] text-text-muted hover:text-white transition-colors whitespace-nowrap">
                  {copy.changelogCta}
                </Link>
              </div>
            </div>
          </FadeInSection>
        </Container>
      </section>
    </>
  );
};
