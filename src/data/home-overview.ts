import type { Locale } from '@/i18n/translations';
import { ABOUT, SERVICES, ECOSYSTEM, REWARDS, CONTACT, OPERATING_BUSINESS_UNIT_COUNT } from '@/data/content';

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

// The home is a high-traffic bilingual surface. Keep its card copy explicitly
// localized instead of relying on exact whole-sentence DOM substitution, which
// is fragile whenever canonical English product truth is edited.
export const HOME_OVERVIEW_ITEMS: HomeOverviewItem[] = [
  {
    href: '/about',
    badge: pair(ABOUT.badge, 'Sobre CTG One'),
    title: pair(ABOUT.title, 'Tecnología creada para'),
    highlight: pair(ABOUT.titleHighlight, 'nuestras propias empresas'),
    description: pair(
      ABOUT.description,
      'Fundada en 2024 en Cartagena, Colombia, CTG One Technology crea y opera el software detrás de sus propias empresas. Cada negocio nos da un lugar real donde diseñar, probar, lanzar y seguir mejorando lo que construimos.',
    ),
    cta: pair('Meet CTG One', 'Conocer CTG One'),
  },
  {
    href: '/services',
    badge: pair(SERVICES.badge, 'Lo que construimos'),
    title: pair(SERVICES.title, 'Software para'),
    highlight: pair(SERVICES.titleHighlight, 'operaciones reales'),
    description: pair(
      SERVICES.description,
      'Creamos el software y las herramientas digitales sobre los que funcionan nuestros negocios: conectamos operaciones, organizamos información, automatizamos tareas y gestionamos cuentas. Solo decimos que algo está disponible cuando realmente funciona.',
    ),
    cta: pair('See what we build', 'Ver qué construimos'),
  },
  {
    href: '/ecosystem',
    badge: pair(ECOSYSTEM.badge, 'Nuestro portafolio'),
    title: pair(ECOSYSTEM.title, 'Nuestros'),
    highlight: pair(ECOSYSTEM.titleHighlight, 'negocios'),
    description: pair(
      ECOSYSTEM.description,
      `${OPERATING_BUSINESS_UNIT_COUNT} negocios reales, en sectores como hospedaje, gastronomía, salud y bienes raíces. Ahí es donde usamos, probamos y mejoramos nuestra tecnología.`,
    ),
    cta: pair('Explore the portfolio', 'Explorar el portafolio'),
  },
  {
    href: '/rewards',
    badge: pair(REWARDS.badge, 'CTG Rewards · Hoja de ruta'),
    title: pair(REWARDS.title, 'CTG'),
    highlight: pair(REWARDS.titleHighlight, 'Recompensas'),
    description: pair(
      REWARDS.description,
      "CTG Rewards es un programa de lealtad y referidos que estamos planeando para nuestros negocios. Todavía no está activo — solo lo mostraremos como disponible cuando un negocio tenga una versión real, funcionando, con reglas publicadas.",
    ),
    cta: pair('View CTG Rewards', 'Ver CTG Recompensas'),
  },
  {
    href: '/token',
    badge: pair('CTGO · Web3', 'CTGO · Web3'),
    title: pair('CTGO', 'CTGO'),
    highlight: pair('Web3 Strategy', 'Estrategia Web3'),
    description: pair(
      'Utility architecture in development. We do not publish on-chain metrics, holder counts, price, or contracts until verifiable production evidence exists.',
      'Arquitectura de utilidad en desarrollo. No publicamos métricas on-chain, número de holders, precio ni contratos hasta contar con evidencia productiva verificable.',
    ),
    cta: pair('View Web3 strategy', 'Ver estrategia Web3'),
  },
  {
    href: '/contact',
    badge: pair(CONTACT.badge, 'Contáctanos'),
    title: pair(CONTACT.title, 'Tecnología para'),
    highlight: pair(CONTACT.titleHighlight, 'Operaciones reales'),
    description: pair(
      CONTACT.description,
      'Conoce cómo CTG One crea y opera tecnología en sus negocios, y en qué punto está nuestro trabajo de IA.',
    ),
    cta: pair('Talk to the team', 'Hablar con el equipo'),
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
