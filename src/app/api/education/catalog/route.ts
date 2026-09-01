import { NextResponse } from 'next/server';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function json(body: Record<string, unknown>, status = 200) {
  const response = NextResponse.json(body, { status });
  response.headers.set('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
  return response;
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

  return json({ ok: true, offerings: data ?? [] });
}
