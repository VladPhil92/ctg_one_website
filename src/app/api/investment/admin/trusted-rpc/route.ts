import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import {
  createAuthenticatedRequestContext,
  isSupabaseConfigured,
} from '@/lib/supabase/server';

const payloadSchema = z.record(z.string(), z.unknown()).default({});

const requestSchema = z.discriminatedUnion('operation', [
  z.object({ operation: z.literal('production.createLotFromStyle'), payload: payloadSchema }),
  z.object({ operation: z.literal('production.updateStyleEconomics'), payload: payloadSchema }),
  z.object({ operation: z.literal('inventory.reconcile'), payload: payloadSchema }),
  z.object({ operation: z.literal('finance.providerHealth'), payload: payloadSchema }),
  z.object({ operation: z.literal('sales.reconcileReturn'), payload: payloadSchema }),
]);

type TrustedOperation = z.infer<typeof requestSchema>['operation'];

const RPC_BY_OPERATION: Record<TrustedOperation, string> = {
  'production.createLotFromStyle': 'create_production_lot_from_style',
  'production.updateStyleEconomics': 'update_investment_beer_style_economics',
  'inventory.reconcile': 'get_inventory_reconciliation',
  'finance.providerHealth': 'get_investment_provider_reconciliation_health',
  'sales.reconcileReturn': 'get_sales_return_reconciliation',
};

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: 'not available' }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'invalid request' }, { status: 422 });
  }

  const context = await createAuthenticatedRequestContext(request);
  if (!context) {
    return NextResponse.json({ error: 'authentication required' }, { status: 401 });
  }

  const rpc = RPC_BY_OPERATION[parsed.data.operation];
  const { data, error } = await context.supabase.rpc(rpc, parsed.data.payload);

  if (error) {
    const normalized = error.message.toLowerCase();
    const status = normalized.includes('not authorized') || normalized.includes('permission denied') ? 403 : 409;
    return NextResponse.json({ error: error.message }, { status });
  }

  return NextResponse.json({ data });
}
