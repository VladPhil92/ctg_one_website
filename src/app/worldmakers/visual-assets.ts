const LIVE_VISUAL_BASE = '/api/worldmakers/visuals';

type AssetDefinition = {
  src: string;
  width: number;
  height: number;
  alt: string;
  isOriginal: boolean;
};

/**
 * World Makers original-master contract.
 *
 * Every asset below resolves to an unmodified master: either a production
 * master URL supplied through a Render environment variable, or the live
 * proxy at `/api/worldmakers/visuals/*`, which streams the exact committed
 * bytes from `World-Makers-Game/docs/visual-reference/world-makers-v2`
 * (see that directory's README for the LFS-bypass storage note). Neither
 * path performs WebP/AVIF derivation, quality reduction, destructive crop
 * or Next.js image re-optimization, so `isOriginal` is always true here.
 */
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
    isOriginal: true,
  };
}

export const worldMakersVisuals = {
  logo: nativeAsset(
    process.env.WORLDMK_ASSET_LOGO_URL,
    `${LIVE_VISUAL_BASE}/logo`,
    1024,
    1536,
    'World Makers',
  ),
  hero: nativeAsset(
    process.env.WORLDMK_ASSET_HERO_URL,
    `${LIVE_VISUAL_BASE}/hero`,
    1672,
    941,
    'World Makers: crea, explora y aprende en un mundo vivo de ciencia, naturaleza, exploración y construcción',
  ),
  gameplayOverview: nativeAsset(
    process.env.WORLDMK_ASSET_GAMEPLAY_OVERVIEW_URL,
    `${LIVE_VISUAL_BASE}/gameplay-overview`,
    1536,
    1024,
    'Visualización aprobada de World Makers con gameplay en primera persona, construcción, ciencia y misión integrada',
  ),
  gameplayScience: nativeAsset(
    process.env.WORLDMK_ASSET_GAMEPLAY_SCIENCE_URL,
    `${LIVE_VISUAL_BASE}/gameplay-science`,
    1672,
    941,
    'Gameplay científico de World Makers: misión River Renewal Project con paneles de química, física, biología y botánica integrados en primera persona',
  ),
  gameplayBuild: nativeAsset(
    process.env.WORLDMK_ASSET_GAMEPLAY_BUILD_URL,
    `${LIVE_VISUAL_BASE}/gameplay-build`,
    1672,
    941,
    'Gameplay de construcción de World Makers: módulo eco-científico, materiales y sistema de snap-to-connector en primera persona',
  ),
  universeOverview: nativeAsset(
    process.env.WORLDMK_ASSET_UNIVERSE_URL,
    `${LIVE_VISUAL_BASE}/universe`,
    1024,
    1536,
    'Universo World Makers con exploración, construcción, ciencia, naturaleza y aprendizaje',
  ),
  visualIdentity: nativeAsset(
    process.env.WORLDMK_ASSET_VISUAL_IDENTITY_URL,
    `${LIVE_VISUAL_BASE}/visual-identity`,
    1312,
    1199,
    'Guía visual aprobada de World Makers con paleta, formas y lenguaje de diseño',
  ),
  formsAndAnimation: nativeAsset(
    process.env.WORLDMK_ASSET_FORMS_STYLE_URL,
    `${LIVE_VISUAL_BASE}/forms-style`,
    1774,
    887,
    'Política de formas y estilo aprobada de World Makers: límite anti-voxel, personajes y siluetas de referencia',
  ),
  characters: [
    {
      key: 'curious-explorer',
      ...nativeAsset(
        process.env.WORLDMK_ASSET_CHARACTER_01_URL,
        `${LIVE_VISUAL_BASE}/character-01`,
        1086,
        1448,
        'Explorador principal de World Makers con chaqueta amarilla, insignia de brújula y equipo de aventura',
      ),
    },
    {
      key: 'scientist-inventor',
      ...nativeAsset(
        process.env.WORLDMK_ASSET_CHARACTER_02_URL,
        `${LIVE_VISUAL_BASE}/character-02`,
        1024,
        1536,
        'Exploradora científica de World Makers con equipo tecnológico cian y azul, coleta y tableta de campo',
      ),
    },
    {
      key: 'nature-guardian',
      ...nativeAsset(
        process.env.WORLDMK_ASSET_CHARACTER_03_URL,
        `${LIVE_VISUAL_BASE}/character-03`,
        1086,
        1448,
        'Guardián de la naturaleza de World Makers con equipo ecológico verde e insignias de hoja',
      ),
    },
    {
      key: 'luna-explorer',
      ...nativeAsset(
        process.env.WORLDMK_ASSET_CHARACTER_04_URL,
        `${LIVE_VISUAL_BASE}/character-04`,
        1086,
        1448,
        'Exploradora de World Makers con chaqueta morada, gafas de aviador y mochila de aventura',
      ),
    },
  ],
} as const;

export type WorldMakersVisualAsset = AssetDefinition;
