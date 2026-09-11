const VISUAL_REFERENCE_BASE = '/images/worldmakers/reference';
const LIVE_VISUAL_BASE = '/api/worldmakers/visuals';

export const worldMakersVisuals = {
  logo: {
    src: '/images/worldmakers/logo.webp',
    width: 360,
    height: 180,
    alt: 'World Makers',
  },
  gameplayOverview: {
    src: `${LIVE_VISUAL_BASE}/gameplay-overview`,
    width: 1536,
    height: 1024,
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
      src: `${LIVE_VISUAL_BASE}/character-01`,
      width: 1152,
      height: 1536,
      alt: 'Explorador de World Makers con chaqueta amarilla y equipo de aventura',
    },
    {
      key: 'scientist-inventor',
      src: `${LIVE_VISUAL_BASE}/character-02`,
      width: 1024,
      height: 1536,
      alt: 'Exploradora científica de World Makers con tableta y gafas',
    },
    {
      key: 'nature-guardian',
      src: `${LIVE_VISUAL_BASE}/character-03`,
      width: 1152,
      height: 1536,
      alt: 'Explorador de naturaleza de World Makers con insignias ecológicas',
    },
    {
      key: 'luna-explorer',
      src: `${LIVE_VISUAL_BASE}/character-04`,
      width: 1152,
      height: 1536,
      alt: 'Exploradora de World Makers con chaqueta morada y mochila',
    },
  ],
} as const;

export type WorldMakersVisualAsset = {
  src: string;
  width: number;
  height: number;
  alt: string;
};
