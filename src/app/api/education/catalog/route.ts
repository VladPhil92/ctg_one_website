import { NextResponse } from 'next/server';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function json(body: Record<string, unknown>, status = 200) {
  const response = NextResponse.json(body, { status });
  response.headers.set('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
  return response;
}

function resolveActionPath(offering: { slug: string; price_amount: number | null; access_path: string | null }) {
  if (typeof offering.price_amount === 'number' && offering.price_amount > 0) {
    return `/jpvalderrama/campus/checkout/${encodeURIComponent(offering.slug)}`;
  }
  return offering.access_path;
}

export async function GET() {
  if (!isSupabaseConfigured) {
    return json({ ok: false, offerings: [] }, 503);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('education_offerings')
    .select('id, slug, title, offering_type, summary, price_amount, currency, access_path, metadata, published_at')
    .eq('status', 'published')
    .order('published_at', { ascending: false });

  if (error) {
    return json({ ok: false, offerings: [] }, 503);
  }

  const offerings = (data ?? []).map((offering) => {
    const destinationPath = offering.access_path;
    const actionPath = resolveActionPath(offering);
    return {
      ...offering,
      // Backwards-compatible public CTA consumed by the existing Campus.
      access_path: actionPath,
      // Explicit fields stop axis pages and checkout from conflating purchase
      // entry with the post-entitlement destination.
      action_path: actionPath,
      destination_path: destinationPath,
      commerce_mode: typeof offering.price_amount !== 'number'
        ? 'inquiry'
        : offering.price_amount > 0
          ? 'paid'
          : 'free',
    };
  });

  return json({ ok: true, offerings });
}
