import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const runtime = 'nodejs';

const ASSETS = {
  'books-desk': 'books.webp',
  'thought-map': 'projects.webp',
  'philosophy-money': 'ideas.webp',
  waveform: 'talks.webp',
  'conference-hero': 'conference.webp',
  'philosophy-technology': 'projects.webp',
  'conference-poster': 'conference.webp',
  'jp-icon': 'brand.webp',
  'ideas-button': 'ideas.webp',
} as const;

type AssetName = keyof typeof ASSETS;

function isAssetName(value: string): value is AssetName {
  return Object.prototype.hasOwnProperty.call(ASSETS, value);
}

const CACHE_CONTROL = 'public, max-age=0, must-revalidate';

export async function GET(request: Request, { params }: { params: Promise<{ asset: string }> }) {
  const { asset } = await params;
  if (!isAssetName(asset)) return new Response(null, { status: 404 });

  try {
    const bytes = await readFile(join(process.cwd(), 'public', 'jpvalderrama', ASSETS[asset]));
    const digest = createHash('sha256').update(bytes).digest('hex');
    const etag = `"${digest}"`;
    const headers = {
      'Content-Type': 'image/webp',
      'Cache-Control': CACHE_CONTROL,
      ETag: etag,
    };

    if (request.headers.get('if-none-match') === etag) {
      return new Response(null, { status: 304, headers });
    }

    return new Response(bytes, {
      headers: {
        ...headers,
        'Content-Length': String(bytes.length),
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
