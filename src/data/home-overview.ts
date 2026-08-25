import type { Locale } from '@/i18n/translations';
import { ABOUT, SERVICES, ECOSYSTEM, CONTACT, OPERATING_BUSINESS_UNIT_COUNT } from '@/data/content';

type LocalizedText = Record<Locale, string>;

export type HomeOverviewItem = {
  href: string;
  badge: LocalizedText;
  title: LocalizedText;
  highlight: LocalizedText;
  description: LocalizedText;
  cta: LocalizedText;
};

const pair = (en: string, es: string): LocalizedText => ({ en, es });

export const HOME_OVERVIEW_ITEMS: HomeOverviewItem[] = [
  {
    href: '/ecosystem',
    badge: pair(ECOSYSTEM.badge, 'Nuestros negocios'),
    title: pair('Real businesses,', 'Negocios reales,'),
    highlight: pair('different sectors.', 'distintos sectores.'),
    description: pair(
      ECOSYSTEM.description,
      `${OPERATING_BUSINESS_UNIT_COUNT} negocios reales en sectores como hospedaje, gastronomía, salud, educación y bienes raíces. Ahí es donde usamos, probamos y mejoramos nuestra tecnología.`,
    ),
    cta: pair('Explore our businesses', 'Explorar nuestros negocios'),
  },
  {
    href: '/services',
    badge: pair(SERVICES.badge, 'Tecnología CTG One'),
    title: pair('Technology that', 'Tecnología que'),
    highlight: pair('connects operations.', 'conecta operaciones.'),
    description: pair(
      'We build software and systems that organize information, automate tasks, manage users and connect operations across our businesses.',
      'Desarrollamos software y sistemas que permiten organizar información, automatizar procesos, gestionar usuarios y conectar operaciones entre nuestros negocios.',
    ),
    cta: pair('Explore our technology', 'Conocer nuestra tecnología'),
  },
  {
    href: '/about',
    badge: pair(ABOUT.badge, 'Sobre CTG One'),
    title: pair('Built in', 'Construimos desde'),
    highlight: pair('Cartagena.', 'Cartagena.'),
    description: pair(
      ABOUT.description,
      'CTG One Technology nació en Cartagena y desarrolla tecnología aplicada a productos y operaciones reales. Nuestro modelo conecta desarrollo de software con aprendizaje directo del negocio.',
    ),
    cta: pair('Meet CTG One', 'Conocer CTG One'),
  },
  {
    href: '/contact',
    badge: pair(CONTACT.badge, 'Contacto'),
    title: pair('Let’s build', 'Hablemos de'),
    highlight: pair('something real.', 'algo real.'),
    description: pair(
      'Explore CTG One, our products and the businesses where our technology is put to work.',
      'Conoce CTG One, nuestros productos y los negocios donde ponemos nuestra tecnología a trabajar.',
    ),
    cta: pair('Contact CTG One', 'Contactar a CTG One'),
  },
];

export function localizeHomeOverview(item: HomeOverviewItem, locale: Locale) {
  return {
    badge: item.badge[locale],
    title: item.title[locale],
    highlight: item.highlight[locale],
    description: item.description[locale],
    cta: item.cta[locale],
  };
}
