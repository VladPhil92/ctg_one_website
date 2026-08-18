import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/client';

const createLotSchema = z.object({
  code: z.string().trim().min(3).max(64),
  beerStyle: z.string().trim().min(2).max(120),
  destination: z.string().trim().min(2).max(120),
  totalCases: z.number().int().positive(),
  eligibleCases: z.number().int().positive(),
  caseSizeUnits: z.number().int().positive().default(24),
  productionCostUnit: z.number().nonnegative(),
  labelCostUnit: z.number().nonnegative(),
  transportCostUnit: z.number().nonnegative(),
  ownPointPriceUnit: z.number().positive(),
  b2bPriceUnit: z.number().positive(),
  incRate: z.number().min(0).max(1),
  advertisingRateOnPreInc: z.number().min(0).max(1),
}).superRefine((value, ctx) => {
  if (value.eligibleCases > value.totalCases) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['eligibleCases'],
      message: 'eligible cases cannot exceed total produced cases',
    });
  }
});

const toCents = (cop: number) => Math.round(cop * 100);

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
    p_total_eligible_units: parsed.data.eligibleCases,
    p_case_size_units: parsed.data.caseSizeUnits,
    p_production_cost_unit_cents: toCents(parsed.data.productionCostUnit),
    p_label_cost_unit_cents: toCents(parsed.data.labelCostUnit),
    p_transport_cost_unit_cents: toCents(parsed.data.transportCostUnit),
    p_own_point_price_unit_cents: toCents(parsed.data.ownPointPriceUnit),
    p_b2b_price_unit_cents: toCents(parsed.data.b2bPriceUnit),
    p_inc_rate: parsed.data.incRate,
    p_advertising_rate_on_pre_inc: parsed.data.advertisingRateOnPreInc,
  });

  if (error) {
    const status = error.message.includes('not authorized') ? 403 : 409;
    return NextResponse.json({ error: error.message }, { status });
  }

  return NextResponse.json({ lotId: data });
}
