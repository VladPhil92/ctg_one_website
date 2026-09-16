'use client';

import Image from 'next/image';
import { ArrowRight, Home, MapPin, Smartphone, Stethoscope, type LucideIcon } from 'lucide-react';
import { Container } from '@/components/ui';
import { useLanguage } from '@/contexts/LanguageContext';
import { nvetPublicAssets, type NvetPublicAsset } from '@/lib/nvet/publicAssets';

type VisualCard = {
  id: string;
  asset: NvetPublicAsset;
  eyebrow: string;
  title: string;
  text: string;
  href: string;
  cta: string;
  icon: LucideIcon;
  tone: 'light' | 'dark';
  imageClassName?: string;
};

function VisualCard({ card, priority = false, es }: { card: VisualCard; priority?: boolean; es: boolean }) {
  const Icon = card.icon;
  const dark = card.tone === 'dark';

  return (
    <article
      className={`group relative min-h-[430px] snap-start overflow-hidden rounded-[2rem] border shadow-[0_18px_56px_rgba(13,27,42,0.10)] md:min-h-[500px] ${
        dark ? 'border-white/10 bg-[#0D1B2A]' : 'border-[#0D1B2A]/[0.07] bg-[#F6FAF8]'
      }`}
      data-nvet-visual-card={card.id}
    >
      <Image
        src={card.asset.src}
        alt={es ? card.asset.altEs : card.asset.altEn}
        fill
        priority={priority}
        sizes="(min-width: 1280px) 38vw, (min-width: 768px) 48vw, 88vw"
        className={`transition duration-700 ease-out group-hover:scale-[1.025] ${card.imageClassName ?? 'object-cover'}`}
      />
      <div
        className={`absolute inset-0 ${
          dark
            ? 'bg-gradient-to-t from-[#07111C] via-[#07111C]/45 to-transparent'
            : 'bg-gradient-to-t from-[#0D1B2A]/82 via-[#0D1B2A]/14 to-transparent'
        }`}
        aria-hidden="true"
      />
      <div className="absolute inset-x-0 bottom-0 z-10 p-6 sm:p-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/12 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white backdrop-blur-md">
          <Icon size={13} aria-hidden="true" />
          {card.eyebrow}
        </div>
        <h3 className="mt-4 max-w-lg text-2xl font-semibold tracking-[-0.035em] text-white sm:text-3xl">{card.title}</h3>
        <p className="mt-3 max-w-lg text-sm leading-7 text-white/78">{card.text}</p>
        <a
          href={card.href}
          className="mt-6 inline-flex min-h-10 items-center gap-2 rounded-full bg-white px-4 text-xs font-semibold text-[#0D1B2A] transition hover:-translate-y-0.5 hover:bg-[#F2F7F4]"
        >
          {card.cta}
          <ArrowRight size={14} aria-hidden="true" />
        </a>
      </div>
    </article>
  );
}

export function NvetCareVisualLibrary() {
  const { locale } = useLanguage();
  const es = locale === 'es';
  const trackingAsset = es ? nvetPublicAssets.trackingEs : nvetPublicAssets.trackingEn;

  const copy = es
    ? {
        eyebrow: 'Experiencia visual',
        title: 'Menos explicación. Más experiencia visible.',
        text: 'Esta galería usa únicamente activos que ya existen en el producto público de Nvet Care. Cada imagen representa un momento concreto del recorrido: atención en casa, producto digital, seguimiento y continuidad.',
        swipe: 'Desliza para explorar',
        cards: [
          {
            id: 'home-care',
            asset: nvetPublicAssets.homeCare,
            eyebrow: 'Atención en casa',
            title: 'El servicio ocurre donde la mascota se siente segura.',
            text: 'La experiencia física y la coordinación digital se presentan como partes de un mismo recorrido, sin convertir la tecnología en protagonista de la consulta.',
            href: '#como-funciona',
            cta: 'Ver cómo funciona',
            icon: Home,
            tone: 'light' as const,
            imageClassName: 'object-cover object-center',
          },
          {
            id: 'mobile-product',
            asset: nvetPublicAssets.homeApp,
            eyebrow: 'Producto digital',
            title: 'Una entrada simple para solicitar, consultar y continuar.',
            text: 'La interfaz concentra las acciones principales y evita que la primera pantalla se convierta en un tablero saturado.',
            href: '#producto',
            cta: 'Explorar la app',
            icon: Smartphone,
            tone: 'dark' as const,
            imageClassName: 'object-cover object-top',
          },
          {
            id: 'tracking',
            asset: trackingAsset,
            eyebrow: 'Seguimiento',
            title: 'El estado de la atención permanece visible durante el recorrido.',
            text: 'La vista de seguimiento prioriza estado, ubicación y contexto operativo en una sola composición legible.',
            href: '#producto',
            cta: 'Ver seguimiento',
            icon: MapPin,
            tone: 'dark' as const,
            imageClassName: 'object-contain bg-[#EAF7F0] p-4 sm:p-7',
          },
          {
            id: 'connected-care',
            asset: nvetPublicAssets.featureShowcase,
            eyebrow: 'Experiencia conectada',
            title: 'Cada pantalla tiene un propósito dentro del servicio.',
            text: 'Solicitud, seguimiento e historial se muestran como momentos distintos, conectados por el contexto de la mascota.',
            href: '#confianza',
            cta: 'Ver capa de confianza',
            icon: Stethoscope,
            tone: 'light' as const,
            imageClassName: 'object-cover object-center',
          },
        ],
      }
    : {
        eyebrow: 'Visual experience',
        title: 'Less explanation. More visible experience.',
        text: 'This gallery uses only assets already present in the public Nvet Care product. Each image represents a concrete moment in the journey: at-home care, the digital product, tracking, and continuity.',
        swipe: 'Swipe to explore',
        cards: [
          {
            id: 'home-care',
            asset: nvetPublicAssets.homeCare,
            eyebrow: 'At-home care',
            title: 'Care happens where the pet feels safe.',
            text: 'The physical service and digital coordination are presented as one journey without making technology compete with the visit itself.',
            href: '#como-funciona',
            cta: 'See how it works',
            icon: Home,
            tone: 'light' as const,
            imageClassName: 'object-cover object-center',
          },
          {
            id: 'mobile-product',
            asset: nvetPublicAssets.homeApp,
            eyebrow: 'Digital product',
            title: 'A simple entry point to request, review, and continue care.',
            text: 'The interface keeps primary actions together without turning the first screen into a crowded dashboard.',
            href: '#producto',
            cta: 'Explore the app',
            icon: Smartphone,
            tone: 'dark' as const,
            imageClassName: 'object-cover object-top',
          },
          {
            id: 'tracking',
            asset: trackingAsset,
            eyebrow: 'Tracking',
            title: 'Care status remains visible throughout the journey.',
            text: 'The tracking view prioritizes status, location, and operational context in one readable composition.',
            href: '#producto',
            cta: 'View tracking',
            icon: MapPin,
            tone: 'dark' as const,
            imageClassName: 'object-contain bg-[#EAF7F0] p-4 sm:p-7',
          },
          {
            id: 'connected-care',
            asset: nvetPublicAssets.featureShowcase,
            eyebrow: 'Connected experience',
            title: 'Each screen has a specific purpose inside the service.',
            text: 'Request, tracking, and history appear as distinct moments connected by the pet’s context.',
            href: '#confianza',
            cta: 'See the trust layer',
            icon: Stethoscope,
            tone: 'light' as const,
            imageClassName: 'object-cover object-center',
          },
        ],
      };

  return (
    <section className="border-t border-[#0D1B2A]/[0.06] bg-[#F4F8F6] py-20 sm:py-24 lg:py-28" data-testid="nvet-visual-library">
      <Container>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#34B27A]/20 bg-[#34B27A]/[0.08] px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#23865A]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#34B27A]" aria-hidden="true" />
              {copy.eyebrow}
            </span>
            <h2 className="mt-5 text-3xl font-bold tracking-[-0.04em] text-[#0D1B2A] sm:text-4xl lg:text-[2.7rem]">{copy.title}</h2>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-[#5B6670] sm:text-base">{copy.text}</p>
          </div>
          <p className="hidden items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#6C7882] sm:flex lg:hidden">
            {copy.swipe}
            <ArrowRight size={14} aria-hidden="true" />
          </p>
        </div>

        <div className="nvet-visual-rail mt-10 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-3 lg:grid lg:grid-cols-2 lg:overflow-visible lg:pb-0">
          {copy.cards.map((card, index) => (
            <div key={card.id} className="w-[86vw] max-w-[620px] shrink-0 lg:w-auto lg:max-w-none">
              <VisualCard card={card} priority={index === 0} es={es} />
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
