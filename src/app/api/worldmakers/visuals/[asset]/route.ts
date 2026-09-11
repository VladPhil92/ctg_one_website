import { NextRequest, NextResponse } from 'next/server';

const ASSETS: Record<string, string> = {
  'gameplay-overview': 'gameplay-visual-direction-overview.webp',
  'character-01': 'character-01-curious-explorer.webp',
  'character-02': 'character-02-scientist-inventor.webp',
  'character-03': 'character-03-nature-guardian.webp',
  'character-04': 'character-04-luna-explorer.webp',
};

const RAW_BASE =
  'https://raw.githubusercontent.com/VladPhil92/World-Makers-Game/main/docs/visual-reference/world-makers-v1';

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

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': upstream.headers.get('content-type') ?? 'image/webp',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
    },
  });
}
