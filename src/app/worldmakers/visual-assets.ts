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
 * v3 public-story assets resolve through `/api/worldmakers/visuals/*`, which
 * prefers the user-approved byte-identical PNG masters in
 * `World-Makers-Game/docs/visual-reference/world-makers-v3` and fails soft to
 * the established v2 originals until a v3 binary is present upstream.
 * Existing v2 assets may still resolve from explicitly configured production
 * master URLs. No asset in this registry is intentionally routed through the
 * Next.js image optimizer or a WebP/AVIF derivative pipeline.
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

  // v3 public visual story. These deliberately bypass legacy Render image
  // variables because those variables still point at the superseded v2
  // marketing/gameplay batch. The API route owns the v3 -> v2 fail-soft
  // switch and therefore never leaves a broken image on the public page.
  hero: nativeAsset(
    undefined,
    `${LIVE_VISUAL_BASE}/hero`,
    1672,
    941,
    'Explorador de World Makers contemplando un mundo vivo de ciencia, naturaleza y construcción, sin texto ni logotipos incrustados',
  ),
  beforeAfter: nativeAsset(
    undefined,
    `${LIVE_VISUAL_BASE}/before-after`,
    1536,
    1024,
    'Un mismo mundo de World Makers antes y después de una transformación ambiental positiva',
  ),
  ecologicalConstruction: nativeAsset(
    undefined,
    `${LIVE_VISUAL_BASE}/ecological-construction`,
    1536,
    1024,
    'Construcción ecológica en World Makers con vivienda sostenible, energía eólica, captación de agua, huertos y reforestación',
  ),
  experiment: nativeAsset(
    undefined,
    `${LIVE_VISUAL_BASE}/experiment`,
    1536,
    1024,
    'Experimento científico en World Makers sobre el efecto de la luz en el crecimiento de las plantas',
  ),

  // Existing page sections already consume these semantic roles. Pointing
  // them at the v3 story assets places the new imagery where it makes visual
  // sense without duplicating sections: transformation, science, building.
  gameplayOverview: nativeAsset(
    undefined,
    `${LIVE_VISUAL_BASE}/before-after`,
    1536,
    1024,
    'Transformación ambiental en World Makers: un mundo degradado frente al mismo entorno restaurado por las decisiones del jugador',
  ),
  gameplayScience: nativeAsset(
    undefined,
    `${LIVE_VISUAL_BASE}/experiment`,
    1536,
    1024,
    'Experimento científico de World Makers sobre cómo distintas condiciones de luz afectan el crecimiento de las plantas',
  ),
  gameplayBuild: nativeAsset(
    undefined,
    `${LIVE_VISUAL_BASE}/ecological-construction`,
    1536,
    1024,
    'Construcción ecológica de World Makers con materiales, vivienda sostenible, energía eólica, agua, huertos y reforestación',
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
