import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
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

const ideas = [ideas00, ideas01, ideas02, ideas03, ideas04].join('');
const philosophyTechnology = [
  philosophyTechnology00,
  philosophyTechnology01,
  philosophyTechnology02,
  philosophyTechnology03,
].join('');
const thoughtMap = [thoughtMap00, thoughtMap01, thoughtMap02].join('');

const INLINE_ASSETS = {
  'thought-map': thoughtMap,
  'philosophy-money': ideas,
  'philosophy-technology': philosophyTechnology,
  'ideas-button': ideas,
} as const;

const CONFERENCE_SOURCE = [
  'assets/jpvalderrama-hd/conference.00.b64',
  'assets/jpvalderrama-hd/conference.01.b64',
  'assets/jpvalderrama-hd/conference.02.b64',
  'assets/jpvalderrama-hd/conference.03.b64',
  'assets/jpvalderrama-hd/conference.04.b64',
  'assets/jpvalderrama-hd/conference.05.b64',
] as const;

const BASE64_FILE_ASSETS = {
  'conference-hero': CONFERENCE_SOURCE,
  'conference-poster': CONFERENCE_SOURCE,
} as const;

const FILE_ASSETS = {
  'books-desk': 'books.webp',
  waveform: 'talks.webp',
  'jp-icon': 'brand.webp',
  'projects-button': 'projects.webp',
} as const;

type InlineAssetName = keyof typeof INLINE_ASSETS;
type Base64FileAssetName = keyof typeof BASE64_FILE_ASSETS;
type FileAssetName = keyof typeof FILE_ASSETS;
type AssetName = InlineAssetName | Base64FileAssetName | FileAssetName;

function hasOwn<T extends object>(record: T, value: PropertyKey): value is keyof T {
  return Object.prototype.hasOwnProperty.call(record, value);
}

function isAssetName(value: string): value is AssetName {
  return hasOwn(INLINE_ASSETS, value)
    || hasOwn(BASE64_FILE_ASSETS, value)
    || hasOwn(FILE_ASSETS, value);
}

async function readBase64Files(paths: readonly string[]) {
  const chunks = await Promise.all(
    paths.map((path) => readFile(join(process.cwd(), path), 'utf8')),
  );
  return Buffer.from(chunks.join(''), 'base64');
}

function normalizeRiffPadding(bytes: Buffer) {
  if (bytes.length < 8) return bytes;
  const declaredLength = bytes.readUInt32LE(4) + 8;
  const missingBytes = declaredLength - bytes.length;

  // Legacy text-chunk transport dropped up to two terminal RIFF pad bytes.
  // RIFF pad bytes carry no image payload, so restoring them to zero is lossless.
  if (missingBytes > 0 && missingBytes <= 2) {
    return Buffer.concat([bytes, Buffer.alloc(missingBytes)]);
  }

  return bytes;
}

async function loadAsset(asset: AssetName) {
  let bytes: Buffer;
  if (hasOwn(INLINE_ASSETS, asset)) {
    bytes = Buffer.from(INLINE_ASSETS[asset], 'base64');
  } else if (hasOwn(BASE64_FILE_ASSETS, asset)) {
    bytes = await readBase64Files(BASE64_FILE_ASSETS[asset]);
  } else {
    bytes = await readFile(join(process.cwd(), 'public', 'jpvalderrama', FILE_ASSETS[asset]));
  }

  return normalizeRiffPadding(bytes);
}

function assertWebp(bytes: Buffer) {
  const hasSignature = bytes.length >= 12
    && bytes.subarray(0, 4).toString('ascii') === 'RIFF'
    && bytes.subarray(8, 12).toString('ascii') === 'WEBP';
  const declaredLength = bytes.length >= 8 ? bytes.readUInt32LE(4) + 8 : 0;

  if (!hasSignature || bytes.length < 512 || declaredLength !== bytes.length) {
    throw new Error(`Invalid JP Valderrama WebP asset: actual=${bytes.length}, declared=${declaredLength}`);
  }
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