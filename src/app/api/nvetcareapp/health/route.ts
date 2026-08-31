import { NextResponse } from 'next/server';
import { getNvetApiUrl } from '@/lib/nvetcareapp/session';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
};

/**
 * Public, credential-free readiness probe for the Nvet Care BFF -> backend
 * dependency. It intentionally returns only coarse health metadata: no
 * upstream URL, credentials, database details or provider error payloads.
 *
 * This exercises the same getNvetApiUrl() resolver used by login, refresh and
 * the authenticated dashboard, so a 200 here is meaningful evidence that the
 * production web service can actually reach the canonical Nvet backend.
 */
export async function GET() {
  const startedAt = Date.now();

  try {
    const upstream = await fetch(`${getNvetApiUrl()}/api/health/ready`, {
      method: 'GET',
      cache: 'no-store',
      signal: AbortSignal.timeout(8_000),
    });

    if (!upstream.ok) {
      return NextResponse.json(
        {
          status: 'down',
          dependency: 'nvet-backend',
          upstreamStatus: upstream.status,
          latencyMs: Date.now() - startedAt,
        },
        { status: 503, headers: NO_STORE_HEADERS },
      );
    }

    const payload = (await upstream.json().catch(() => null)) as { status?: string } | null;
    if (payload?.status === 'down') {
      return NextResponse.json(
        {
          status: 'down',
          dependency: 'nvet-backend',
          upstreamStatus: upstream.status,
          latencyMs: Date.now() - startedAt,
        },
        { status: 503, headers: NO_STORE_HEADERS },
      );
    }

    return NextResponse.json(
      {
        status: 'ok',
        dependency: 'nvet-backend',
        latencyMs: Date.now() - startedAt,
      },
      { status: 200, headers: NO_STORE_HEADERS },
    );
  } catch {
    return NextResponse.json(
      {
        status: 'down',
        dependency: 'nvet-backend',
        latencyMs: Date.now() - startedAt,
      },
      { status: 503, headers: NO_STORE_HEADERS },
    );
  }
}
