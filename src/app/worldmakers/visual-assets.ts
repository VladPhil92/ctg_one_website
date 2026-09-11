const VISUAL_REFERENCE_BASE =
  'https://raw.githubusercontent.com/VladPhil92/World-Makers-Game/main/docs/visual-reference/world-makers-v1';

export const worldMakersVisuals = {
  logo: {
    src: `${VISUAL_REFERENCE_BASE}/logo-primary.webp`,
    width: 360,
    height: 180,
    alt: 'Dirección visual aprobada del logotipo de World Makers',
  },
  gameplayOverview: {
    src: `${VISUAL_REFERENCE_BASE}/gameplay-visual-direction-overview.webp`,
    width: 120,
    height: 180,
    alt: 'Referencia visual conceptual de gameplay, mundo eco-fantástico e interfaz de misión de World Makers',
  },
  visualIdentity: {
    src: `${VISUAL_REFERENCE_BASE}/visual-identity-base-guide.webp`,
    width: 120,
    height: 180,
    alt: 'Guía visual conceptual de identidad, paleta y lenguaje formal de World Makers',
  },
  formsAndAnimation: {
    src: `${VISUAL_REFERENCE_BASE}/forms-design-animation-reference.webp`,
    width: 180,
    height: 164,
    alt: 'Referencia conceptual de formas, diseño y animación para World Makers',
  },
  characters: [
    {
      key: 'curious-explorer',
      src: `${VISUAL_REFERENCE_BASE}/character-01-curious-explorer.webp`,
      width: 200,
      height: 250,
      alt: 'Referencia visual del personaje Explorador curioso de World Makers',
    },
    {
      key: 'scientist-inventor',
      src: `${VISUAL_REFERENCE_BASE}/character-02-scientist-inventor.webp`,
      width: 200,
      height: 250,
      alt: 'Referencia visual del personaje Inventora científica de World Makers',
    },
    {
      key: 'nature-guardian',
      src: `${VISUAL_REFERENCE_BASE}/character-03-nature-guardian.webp`,
      width: 144,
      height: 180,
      alt: 'Referencia visual del personaje Guardián de la naturaleza de World Makers',
    },
    {
      key: 'luna-explorer',
      src: `${VISUAL_REFERENCE_BASE}/character-04-luna-explorer.webp`,
      width: 150,
      height: 180,
      alt: 'Referencia visual de Luna, exploradora del conocimiento de World Makers',
    },
  ],
} as const;

export type WorldMakersVisualAsset = {
  src: string;
  width: number;
  height: number;
  alt: string;
};
