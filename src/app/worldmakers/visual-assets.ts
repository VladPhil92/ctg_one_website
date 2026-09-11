const VISUAL_REFERENCE_BASE = '/images/worldmakers/reference';

export const worldMakersVisuals = {
  logo: {
    src: '/images/worldmakers/logo.webp',
    width: 360,
    height: 180,
    alt: 'World Makers',
  },
  gameplayOverview: {
    src: `${VISUAL_REFERENCE_BASE}/gameplay-overview.avif`,
    width: 1080,
    height: 720,
    alt: 'Visualización aprobada de World Makers con gameplay en primera persona, construcción, ciencia y misión integrada',
  },
  visualIdentity: {
    src: `${VISUAL_REFERENCE_BASE}/visual-identity.avif`,
    width: 720,
    height: 1080,
    alt: 'Guía visual aprobada de World Makers con paleta, formas y lenguaje de diseño',
  },
  formsAndAnimation: {
    src: `${VISUAL_REFERENCE_BASE}/forms-style-animation.avif`,
    width: 960,
    height: 877,
    alt: 'Guía de estilo visual aprobada de World Makers para formas, entornos, personajes, objetos y animación',
  },
  characters: [
    {
      key: 'curious-explorer',
      src: `${VISUAL_REFERENCE_BASE}/character-01.avif`,
      width: 720,
      height: 900,
      alt: 'Hoja de diseño aprobada del Explorador curioso de World Makers',
    },
    {
      key: 'scientist-inventor',
      src: `${VISUAL_REFERENCE_BASE}/character-02.avif`,
      width: 720,
      height: 900,
      alt: 'Hoja de diseño aprobada de la Inventora científica de World Makers',
    },
    {
      key: 'nature-guardian',
      src: `${VISUAL_REFERENCE_BASE}/character-03.avif`,
      width: 720,
      height: 900,
      alt: 'Hoja de diseño aprobada del Guardián de la naturaleza de World Makers',
    },
    {
      key: 'luna-explorer',
      src: `${VISUAL_REFERENCE_BASE}/character-04.avif`,
      width: 720,
      height: 865,
      alt: 'Hoja de diseño aprobada de Luna, exploradora del conocimiento de World Makers',
    },
  ],
} as const;

export type WorldMakersVisualAsset = {
  src: string;
  width: number;
  height: number;
  alt: string;
};
