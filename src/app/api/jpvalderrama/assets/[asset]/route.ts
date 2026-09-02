import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import conference00 from '@/data/jpvalderrama-visuals/conference-00';
import conference01 from '@/data/jpvalderrama-visuals/conference-01';
import conference02 from '@/data/jpvalderrama-visuals/conference-02';
import ideas00 from '@/data/jpvalderrama-visuals/ideas-00';
import ideas01 from '@/data/jpvalderrama-visuals/ideas-01';
import ideas02 from '@/data/jpvalderrama-visuals/ideas-02';
import ideas03 from '@/data/jpvalderrama-visuals/ideas-03';
import ideas04 from '@/data/jpvalderrama-visuals/ideas-04';
import philosophyTechnology00 from '@/data/jpvalderrama-visuals/philosophy-technology-00';
import philosophyTechnology01 from '@/data/jpvalderrama-visuals/philosophy-technology-01';
import philosophyTechnology02 from '@/data/jpvalderrama-visuals/philosophy-technology-02';
import philosophyTechnology03 from '@/data/jpvalderrama-visuals/philosophy-technology-03';
import thoughtMap00 from '@/data/jpvalderrama-visuals/thought-map-00';
import thoughtMap01 from '@/data/jpvalderrama-visuals/thought-map-01';
import thoughtMap02 from '@/data/jpvalderrama-visuals/thought-map-02';

export const runtime = 'nodejs';

const conference = [conference00, conference01, conference02].join('');
const ideas = [ideas00, ideas01, ideas02, ideas03, ideas04].join('');
const philosophyTechnology = [
  philosophyTechnology00,
  philosophyTechnology01,
  philosophyTechnology02,
  philosophyTechnology03,
].join('');
const thoughtMap = [thoughtMap00, thoughtMap01, thoughtMap02].join('');

// These visuals are source-controlled as text chunks so the deploy cannot lose
// them through binary/public-folder drift. They are decoded only when requested.
const INLINE_ASSETS = {
  'thought-map': thoughtMap,
  'philosophy-money': ideas,
  'conference-hero': conference,
  'philosophy-technology': philosophyTechnology,
  'conference-poster': conference,
  'ideas-button': ideas,
} as const;

const FILE_ASSETS = {
  'books-desk': 'books.webp',
  waveform: 'talks.webp',
  'jp-icon': 'brand.webp',
  'projects-button': 'projects.webp',
} as const;

type InlineAssetName = keyof typeof INLINE_ASSETS;
type FileAssetName = keyof typeof FILE_ASSETS;
type AssetName = InlineAssetName | FileAssetName;

function isAssetName(value: string): value is AssetName {
  return Object.prototype.hasOwnProperty.call(INLINE_ASSETS, value)
    || Object.prototype.hasOwnProperty.call(FILE_ASSETS, value);
}

function isInlineAsset(value: AssetName): value is InlineAssetName {
  return Object.prototype.hasOwnProperty.call(INLINE_ASSETS, value);
}

async function loadAsset(asset: AssetName) {
  if (isInlineAsset(asset)) return Buffer.from(INLINE_ASSETS[asset], 'base64');
  return readFile(join(process.cwd(), 'public', 'jpvalderrama', FILE_ASSETS[asset]));
}

function assertWebp(bytes: Buffer) {
  const isWebp = bytes.length >= 12
    && bytes.subarray(0, 4).toString('ascii') === 'RIFF'
    && bytes.subarray(8, 12).toString('ascii') === 'WEBP';
  if (!isWebp || bytes.length < 512) throw new Error('Invalid JP Valderrama WebP asset');
}

const CACHE_CONTROL = 'public, max-age=0, must-revalidate';

export async function GET(request: Request, { params }: { params: Promise<{ asset: string }> }) {
  const { asset } = await params;
  if (!isAssetName(asset)) return new Response(null, { status: 404 });

  try {
    const bytes = await loadAsset(asset);
    assertWebp(bytes);
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
  } catch (error) {
    console.error('JP Valderrama asset delivery failed', { asset, error });
    return new Response(null, { status: 404 });
  }
}
