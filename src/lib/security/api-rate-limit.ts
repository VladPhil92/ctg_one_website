import type { SupabaseClient } from '@supabase/supabase-js';

export type ApiRateLimitScope =
  | 'knowledge.query'
  | 'investment.payment-proof'
  | 'wallet.identity-link';

export type ApiRateLimitDecision = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

type RpcRateLimitRow = {
  allowed: boolean;
  remaining: number;
  retry_after_seconds: number;
};

export async function consumeAuthenticatedRateLimit(
  supabase: SupabaseClient,
  scope: ApiRateLimitScope,
): Promise<ApiRateLimitDecision> {
  const { data, error } = await supabase.rpc('consume_api_rate_limit', { p_scope: scope });
  if (error) throw new Error(`Rate limit check failed: ${error.message}`);

  const row = (Array.isArray(data) ? data[0] : data) as RpcRateLimitRow | null;
  if (!row) throw new Error('Rate limit check returned no decision');

  return {
    allowed: row.allowed === true,
    remaining: Number(row.remaining ?? 0),
    retryAfterSeconds: Math.max(0, Number(row.retry_after_seconds ?? 0)),
  };
}
