import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const runtime = 'nodejs';

const ASSETS = {
  'books-desk': { parts: 10, sha256: '80aebfe9fd27aaf0b4b6dd21a50a27267e01099642e250684dbad8aee5c2ae83' },
  'thought-map': { parts: 4, sha256: '783b90c8e753654f42419e07914c3379641039e6995e1983338060cecc5783b2' },
  'philosophy-money': { parts: 4, sha256: '5097f3df7f7691bf91c5cead4b56f219358219b156795c06ef6641e84b3586ed' },
  waveform: { parts: 1, sha256: '7b72e450d3f8055eb28968304bcc9d36d13b072a5f407bac856f25e676dd580a' },
  'conference-hero': { parts: 4, sha256: '9fc48832e54f594c6411c4ea49d98b9fbc488b8c546f32ae43ecb15c19bdda6f' },
  'philosophy-technology': { parts: 5, sha256: 'a0120de932db362a13111809e326fe170b1f6252f54183101c821625b0f2897e' },
  'conference-poster': { parts: 10, sha256: 'b1a37ac7589c3a125fb290b9e2a24961a9a212c4fda4a34cd568b93231fd6c6d' },
  'jp-icon': { parts: 2, sha256: '6f16fc5b98cbf9a73cd93c4b49a9d9566d5064f62aeea31564a2af57c5dee0ae' },
  'ideas-button': { parts: 3, sha256: 'c488cebaf7c45288a0b7c16979775bc70eb33906de0da1c4cba6225c00235315' },
} as const;

type AssetName = keyof typeof ASSETS;

function isAssetName(value: string): value is AssetName {
  return Object.prototype.hasOwnProperty.call(ASSETS, value);
}

export async function GET(_request: Request, { params }: { params: Promise<{ asset: string }> }) {
  const { asset } = await params;
  if (!isAssetName(asset)) return new Response(null, { status: 404 });

  const spec = ASSETS[asset];
  try {
    const directory = join(process.cwd(), 'assets', 'jpvalderrama-hd', asset);
    const chunks = await Promise.all(
      Array.from({ length: spec.parts }, (_, index) =>
        readFile(join(directory, `${String(index).padStart(3, '0')}.b64`), 'utf8'),
      ),
    );
    const bytes = Buffer.from(chunks.join(''), 'base64');
    const digest = createHash('sha256').update(bytes).digest('hex');
    if (digest !== spec.sha256) {
      return new Response('JP Valderrama asset integrity check failed', { status: 500 });
    }

    return new Response(bytes, {
      headers: {
        'Content-Type': 'image/webp',
        'Content-Length': String(bytes.length),
        'Cache-Control': 'public, max-age=31536000, immutable',
        ETag: `"${digest}"`,
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
