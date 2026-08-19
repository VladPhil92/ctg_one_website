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
    title: pair(ABOUT.title, 'Tecnología construida para'),
    highlight: pair(ABOUT.titleHighlight, 'Nuestro propio ecosistema'),
    description: pair(
      ABOUT.description,
      'Fundada en 2024 en Cartagena, Colombia, CTG One Technology desarrolla y opera software propietario e infraestructura digital aplicada directamente en sus propias unidades de negocio. Nuestras empresas ofrecen entornos operativos reales donde la tecnología se diseña, prueba, despliega y mejora continuamente.',
    ),
    cta: pair('Meet CTG One', 'Conocer CTG One'),
  },
  {
    href: '/services',
    badge: pair(SERVICES.badge, 'Lo que construimos'),
    title: pair(SERVICES.title, 'Software e'),
    highlight: pair(SERVICES.titleHighlight, 'Infraestructura digital'),
    description: pair(
      SERVICES.description,
      'CTG One construye la base tecnológica utilizada en su propio ecosistema empresarial. Las capacidades públicas distinguen con claridad los sistemas operativos de las implementaciones parciales, el desarrollo activo y la arquitectura de hoja de ruta.',
    ),
    cta: pair('See what we build', 'Ver qué construimos'),
  },
  {
    href: '/ecosystem',
    badge: pair(ECOSYSTEM.badge, 'Nuestro portafolio'),
    title: pair(ECOSYSTEM.title, 'Ecosistema'),
    highlight: pair(ECOSYSTEM.titleHighlight, 'Empresarial'),
    description: pair(
      ECOSYSTEM.description,
      `${OPERATING_BUSINESS_UNIT_COUNT} negocios operativos ofrecen entornos reales de aplicación para CTG One Technology. La capa tecnológica se representa por separado y la madurez se documenta con evidencia, no se infiere por pertenecer al ecosistema.`,
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
      'CTG Rewards es un concepto de hoja de ruta para futuras capacidades de lealtad y referidos dentro del ecosistema. No se presenta como un programa transversal activo mientras no exista una implementación verificable con reglas publicadas.',
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
      'Conoce cómo CTG One construye y despliega software e infraestructura digital en un portafolio diversificado de negocios en operación, mientras las capacidades avanzadas de IA progresan bajo un modelo de madurez documentado.',
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
