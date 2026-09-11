const VISUAL_REFERENCE_BASE = '/images/worldmakers/reference';
const LIVE_VISUAL_BASE = '/api/worldmakers/visuals';

type AssetDefinition = {
  src: string;
  width: number;
  height: number;
  alt: string;
  isOriginal: boolean;
};

function nativeAsset(
  source: string | undefined,
  fallback: string,
  width: number,
  height: number,
  alt: string,
): AssetDefinition {
  const originalSource = source?.trim();
  return {
    src: originalSource || fallback,
    width,
    height,
    alt,
    isOriginal: Boolean(originalSource),
  };
}

function optionalNativeAsset(
  source: string | undefined,
  width: number,
  height: number,
  alt: string,
): AssetDefinition | null {
  const originalSource = source?.trim();
  if (!originalSource) return null;
  return { src: originalSource, width, height, alt, isOriginal: true };
}

/**
 * World Makers original-master contract.
 *
 * Production master URLs are supplied by Render environment variables. They are
 * intentionally consumed as direct image URLs and must point to the exact bytes
 * delivered by the art source: no WebP/AVIF derivation, no quality reduction,
 * no destructive crop and no intermediary Next.js image optimization.
 *
 * Existing repository derivatives remain only as temporary fallbacks until a
 * master URL is configured for a given asset.
 */
export const worldMakersVisuals = {
  logo: nativeAsset(
    process.env.WORLDMK_ASSET_LOGO_URL,
    '/images/worldmakers/logo.webp',
    1536,
    768,
    'World Makers',
  ),
  hero: nativeAsset(
    process.env.WORLDMK_ASSET_HERO_URL,
    '/images/worldmakers/hero-first-person.webp',
    1536,
    864,
    'World Makers: un mundo vivo de ciencia, naturaleza, exploración y construcción',
  ),
  gameplayOverview: nativeAsset(
    process.env.WORLDMK_ASSET_GAMEPLAY_OVERVIEW_URL,
    `${LIVE_VISUAL_BASE}/gameplay-overview`,
    1536,
    1024,
    'Visualización aprobada de World Makers con gameplay en primera persona, construcción, ciencia y misión integrada',
  ),
  gameplayScience: optionalNativeAsset(
    process.env.WORLDMK_ASSET_GAMEPLAY_SCIENCE_URL,
    1536,
    864,
    'Gameplay científico de World Makers con química, física, biología y botánica integradas en primera persona',
  ),
  gameplayBuild: optionalNativeAsset(
    process.env.WORLDMK_ASSET_GAMEPLAY_BUILD_URL,
    1536,
    864,
    'Gameplay de construcción de World Makers con módulo eco-científico, materiales y sistemas de energía y agua',
  ),
  universeOverview: optionalNativeAsset(
    process.env.WORLDMK_ASSET_UNIVERSE_URL,
    1024,
    1536,
    'Universo World Makers con exploración, construcción, ciencia, naturaleza y aprendizaje',
  ),
  visualIdentity: {
    src: `${VISUAL_REFERENCE_BASE}/visual-identity.avif`,
    width: 720,
    height: 1080,
    alt: 'Guía visual aprobada de World Makers con paleta, formas y lenguaje de diseño',
    isOriginal: false,
  },
  formsAndAnimation: {
    src: `${VISUAL_REFERENCE_BASE}/forms-style-animation.avif`,
    width: 960,
    height: 877,
    alt: 'Guía de estilo visual aprobada de World Makers para formas, entornos, personajes, objetos y animación',
    isOriginal: false,
  },
  characters: [
    {
      key: 'curious-explorer',
      ...nativeAsset(
        process.env.WORLDMK_ASSET_CHARACTER_01_URL,
        `${LIVE_VISUAL_BASE}/character-01`,
        1152,
        1536,
        'Explorador de World Makers con chaqueta amarilla y equipo de aventura',
      ),
    },
    {
      key: 'scientist-inventor',
      ...nativeAsset(
        process.env.WORLDMK_ASSET_CHARACTER_02_URL,
        `${LIVE_VISUAL_BASE}/character-02`,
        1024,
        1536,
        'Exploradora científica de World Makers con tableta y gafas',
      ),
    },
    {
      key: 'nature-guardian',
      ...nativeAsset(
        process.env.WORLDMK_ASSET_CHARACTER_03_URL,
        `${LIVE_VISUAL_BASE}/character-03`,
        1152,
        1536,
        'Explorador de naturaleza de World Makers con insignias ecológicas',
      ),
    },
    {
      key: 'luna-explorer',
      ...nativeAsset(
        process.env.WORLDMK_ASSET_CHARACTER_04_URL,
        `${LIVE_VISUAL_BASE}/character-04`,
        1152,
        1536,
        'Exploradora de World Makers con chaqueta morada y mochila',
      ),
    },
  ],
} as const;

export type WorldMakersVisualAsset = AssetDefinition;
