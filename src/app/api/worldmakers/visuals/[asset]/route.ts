import { NextRequest, NextResponse } from 'next/server';

const ASSETS: Record<string, string> = {
  logo: 'logo-primary.png',
  hero: 'hero-banner.png',
  'gameplay-overview': 'gameplay-overview.png',
  'gameplay-science': 'gameplay-science.png',
  'gameplay-build': 'gameplay-build.png',
  universe: 'universe-overview.png',
  'visual-identity': 'visual-identity-guide.png',
  'forms-style': 'forms-style-policy.png',
  'character-01': 'character-01-curious-explorer.png',
  'character-02': 'character-02-scientist-inventor.png',
  'character-03': 'character-03-nature-guardian.png',
  'character-04': 'character-04-luna-explorer.png',
};

const CONTENT_TYPES: Record<string, string> = {
  png: 'image/png',
  webp: 'image/webp',
};

const RAW_BASE =
  'https://raw.githubusercontent.com/VladPhil92/World-Makers-Game/main/docs/visual-reference/world-makers-v2';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ asset: string }> },
) {
  const { asset } = await context.params;
  const filename = ASSETS[asset];

  if (!filename) {
    return NextResponse.json({ error: 'Visual asset not found' }, { status: 404 });
  }

  const upstream = await fetch(`${RAW_BASE}/${filename}`, {
    next: { revalidate: 3600 },
  });

  if (!upstream.ok) {
    return NextResponse.json(
      { error: 'Visual asset unavailable upstream' },
      { status: upstream.status },
    );
  }

  const extension = filename.split('.').pop() ?? '';
  const contentType = upstream.headers.get('content-type') ?? CONTENT_TYPES[extension] ?? 'application/octet-stream';

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
    },
  });
}
