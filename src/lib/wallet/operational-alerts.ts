import 'server-only';

import type { createAdminClient } from '@/lib/supabase/server';

const CORRELATION_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALERTABLE_STATUSES = new Set(['submitted', 'pending_external', 'confirmed_external']);

export type WalletOperationalAlertKind =
  | 'submission_stuck'
  | 'reconciliation_stuck'
  | 'confirmation_stuck';

type AdminClient = ReturnType<typeof createAdminClient>;

export class WalletOperationalAlertError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = 'WalletOperationalAlertError';
  }
}

export function normalizeOperationalCorrelationId(value: unknown): string | null {
  return typeof value === 'string' && CORRELATION_ID_RE.test(value) ? value.toLowerCase() : null;
}

export function alertKindForLifecycleStatus(status: string): WalletOperationalAlertKind | null {
  if (status === 'submitted') return 'submission_stuck';
  if (status === 'pending_external') return 'reconciliation_stuck';
  if (status === 'confirmed_external') return 'confirmation_stuck';
  return null;
}

export async function upsertWalletOperationalAlertV1(
  admin: AdminClient,
  input: {
    intentId: string;
    correlationId: string;
    alertKind: WalletOperationalAlertKind;
    lifecycleStatus: string;
    submittedAgeSeconds: number;
    confirmations: number | null;
  },
) {
  if (!ALERTABLE_STATUSES.has(input.lifecycleStatus)) {
    throw new WalletOperationalAlertError('WALLET_OPERATIONAL_ALERT_STATUS_INVALID');
  }

  const { error } = await admin
    .from('wallet_chain_operational_alerts_v1')
    .upsert({
      intent_id: input.intentId,
      operational_correlation_id: input.correlationId,
      alert_kind: input.alertKind,
      state: 'open',
      lifecycle_status: input.lifecycleStatus,
      submitted_age_seconds: input.submittedAgeSeconds,
      confirmations: input.confirmations,
      last_detected_at: new Date().toISOString(),
      resolved_at: null,
    }, { onConflict: 'intent_id,alert_kind' });

  if (error) throw new WalletOperationalAlertError('WALLET_OPERATIONAL_ALERT_WRITE_FAILED');
}

export async function resolveWalletOperationalAlertsV1(
  admin: AdminClient,
  intentId: string,
  lifecycleStatus: 'reconciled' | 'failed',
) {
  const resolvedAt = new Date().toISOString();
  const { error } = await admin
    .from('wallet_chain_operational_alerts_v1')
    .update({
      state: 'resolved',
      lifecycle_status: lifecycleStatus,
      resolved_at: resolvedAt,
      last_detected_at: resolvedAt,
    })
    .eq('intent_id', intentId)
    .eq('state', 'open');

  if (error) throw new WalletOperationalAlertError('WALLET_OPERATIONAL_ALERT_RESOLVE_FAILED');
}
