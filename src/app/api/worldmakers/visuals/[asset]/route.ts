import { NextRequest, NextResponse } from 'next/server';

type AssetCandidate = {
  set: 'world-makers-v2' | 'world-makers-v3';
  filename: string;
};

type AssetRoute = {
  candidates: AssetCandidate[];
};

/**
 * Public World Makers visual routing.
 *
 * v3 candidates are tried first for the four user-approved original PNG
 * masters. Until a v3 binary exists upstream, the route fails soft to the
 * current v2 master so a missing upload can never break the public page.
 * Once the byte-identical v3 PNG is present in World-Makers-Game@main, the
 * website starts serving it without a second application deploy.
 */
const ASSETS: Record<string, AssetRoute> = {
  logo: {
    candidates: [{ set: 'world-makers-v2', filename: 'logo-primary.png' }],
  },
  hero: {
    candidates: [
      { set: 'world-makers-v3', filename: 'Portada sin letras(4).png' },
      { set: 'world-makers-v2', filename: 'hero-banner.png' },
    ],
  },
  'before-after': {
    candidates: [
      { set: 'world-makers-v3', filename: 'Antes y Después(1).png' },
      { set: 'world-makers-v2', filename: 'gameplay-overview.png' },
    ],
  },
  'ecological-construction': {
    candidates: [
      { set: 'world-makers-v3', filename: 'Construcción Ecológica(1).png' },
      { set: 'world-makers-v2', filename: 'gameplay-build.png' },
    ],
  },
  experiment: {
    candidates: [
      { set: 'world-makers-v3', filename: 'Experimento(1).png' },
      { set: 'world-makers-v2', filename: 'gameplay-science.png' },
    ],
  },
  'gameplay-overview': {
    candidates: [{ set: 'world-makers-v2', filename: 'gameplay-overview.png' }],
  },
  'gameplay-science': {
    candidates: [{ set: 'world-makers-v2', filename: 'gameplay-science.png' }],
  },
  'gameplay-build': {
    candidates: [{ set: 'world-makers-v2', filename: 'gameplay-build.png' }],
  },
  universe: {
    candidates: [{ set: 'world-makers-v2', filename: 'universe-overview.png' }],
  },
  'visual-identity': {
    candidates: [{ set: 'world-makers-v2', filename: 'visual-identity-guide.png' }],
  },
  'forms-style': {
    candidates: [{ set: 'world-makers-v2', filename: 'forms-style-policy.png' }],
  },
  'character-01': {
    candidates: [{ set: 'world-makers-v2', filename: 'character-01-curious-explorer.png' }],
  },
  'character-02': {
    candidates: [{ set: 'world-makers-v2', filename: 'character-02-scientist-inventor.png' }],
  },
  'character-03': {
    candidates: [{ set: 'world-makers-v2', filename: 'character-03-nature-guardian.png' }],
  },
  'character-04': {
    candidates: [{ set: 'world-makers-v2', filename: 'character-04-luna-explorer.png' }],
  },
};

const CONTENT_TYPES: Record<string, string> = {
  png: 'image/png',
  webp: 'image/webp',
};

const RAW_ROOT =
  'https://raw.githubusercontent.com/VladPhil92/World-Makers-Game/main/docs/visual-reference';

function candidateUrl(candidate: AssetCandidate) {
  return `${RAW_ROOT}/${candidate.set}/${encodeURIComponent(candidate.filename)}`;
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ asset: string }> },
) {
  const { asset } = await context.params;
  const route = ASSETS[asset];

  if (!route) {
    return NextResponse.json({ error: 'Visual asset not found' }, { status: 404 });
  }

  for (const candidate of route.candidates) {
    const upstream = await fetch(candidateUrl(candidate), {
      next: { revalidate: candidate.set === 'world-makers-v3' ? 60 : 3600 },
    });

    if (!upstream.ok) {
      continue;
    }

    const extension = candidate.filename.split('.').pop() ?? '';
    const contentType =
      upstream.headers.get('content-type') ?? CONTENT_TYPES[extension] ?? 'application/octet-stream';

    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control':
          candidate.set === 'world-makers-v3'
            ? 'public, max-age=60, s-maxage=300, stale-while-revalidate=3600'
            : 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
        'X-WorldMakers-Asset-Set': candidate.set,
        'X-WorldMakers-Asset-File': encodeURIComponent(candidate.filename),
      },
    });
  }

  return NextResponse.json(
    { error: 'Visual asset unavailable upstream' },
    { status: 404 },
  );
}
