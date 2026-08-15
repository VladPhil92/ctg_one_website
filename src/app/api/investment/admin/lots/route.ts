import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/client';

// Real authorization lives in create_production_lot() itself
// (is_investment_operator(), re-checked server-side against
// investment_participant_profiles) — this handler only validates the
// request shape before calling it, per docs/investment/API_CONVENTIONS.md.
const createLotSchema = z.object({
  code: z.string().trim().min(3).max(64),
  beerStyle: z.string().trim().min(2).max(120),
  destination: z.string().trim().min(2).max(120),
  totalCases: z.number().int().positive(),
  caseSizeUnits: z.number().int().positive().default(24),
});

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: 'not available' }, { status: 503 });
  }

  const parsed = createLotSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'invalid request' }, { status: 422 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('create_production_lot', {
    p_code: parsed.data.code,
    p_beer_style: parsed.data.beerStyle,
    p_destination: parsed.data.destination,
    p_total_cases: parsed.data.totalCases,
    p_case_size_units: parsed.data.caseSizeUnits,
  });

  if (error) {
    const status = error.message.includes('not authorized') ? 403 : 409;
    return NextResponse.json({ error: error.message }, { status });
  }

  return NextResponse.json({ lotId: data });
}
