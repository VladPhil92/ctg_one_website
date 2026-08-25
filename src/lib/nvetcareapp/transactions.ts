import { getNvetApiUrl } from './session';

export type NvetTransactionStatus = 'PENDING' | 'VERIFYING' | 'CONFIRMED' | 'LIQUIDATED' | 'DISPUTED' | 'FAILED';
export type NvetDisputeResolution = 'CONFIRM' | 'REFUND' | 'CANCEL';

// Mirrors the shape returned by GET /admin/transfer-tracking and
// GET /admin/transactions (admin.service.ts). `waitingMinutes` is only
// present on the transfer-tracking response.
export interface NvetTransaction {
  id: string;
  amountCop: number;
  commissionAmount: number;
  paymentMethod: 'CTG' | 'PSE' | 'TRANSFER';
  status: NvetTransactionStatus;
  transferCode: string | null;
  createdAt: string;
  waitingMinutes?: number;
  appointment: {
    serviceType: string;
    client: { firstName: string; lastName: string };
    vet: { user: { firstName: string; lastName: string } };
  };
}

async function getJson<T>(path: string, accessToken: string): Promise<{ ok: true; data: T } | { ok: false; status: number }> {
  let res: Response;
  try {
    res = await fetch(`${getNvetApiUrl()}${path}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });
  } catch {
    return { ok: false, status: 502 };
  }
  if (!res.ok) return { ok: false, status: res.status };
  try {
    return { ok: true, data: (await res.json()) as T };
  } catch {
    return { ok: false, status: 502 };
  }
}

async function postJson<T>(
  path: string,
  accessToken: string,
  body?: unknown,
): Promise<{ ok: true; data: T } | { ok: false; status: number; message?: string }> {
  let res: Response;
  try {
    res = await fetch(`${getNvetApiUrl()}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    return { ok: false, status: 502 };
  }
  if (!res.ok) {
    const message = await res.json().then((data) => data?.message).catch(() => undefined);
    return { ok: false, status: res.status, message };
  }
  try {
    return { ok: true, data: (await res.json()) as T };
  } catch {
    return { ok: false, status: 502 };
  }
}

/** GET /admin/transfer-tracking — pending TRANSFER-method transactions, oldest first. */
export function fetchNvetPendingTransfers(accessToken: string) {
  return getJson<NvetTransaction[]>('/api/admin/transfer-tracking', accessToken);
}

/**
 * GET /admin/transactions?status=DISPUTED — the DISPUTED filter is fixed
 * here, not client-supplied, so there's nothing to validate against an
 * allow-list before forwarding.
 */
export function fetchNvetDisputedTransactions(accessToken: string) {
  return getJson<{ results: NvetTransaction[]; total: number }>('/api/admin/transactions?status=DISPUTED', accessToken);
}

/** POST /payments/admin/transactions/:id/confirm-transfer — no body. */
export function confirmNvetTransfer(accessToken: string, transactionId: string) {
  return postJson<NvetTransaction>(`/api/payments/admin/transactions/${transactionId}/confirm-transfer`, accessToken);
}

/** POST /payments/admin/transactions/:id/reject-transfer — backend requires reason.length >= 10. */
export function rejectNvetTransfer(accessToken: string, transactionId: string, reason: string) {
  return postJson<NvetTransaction>(`/api/payments/admin/transactions/${transactionId}/reject-transfer`, accessToken, { reason });
}

/** POST /admin/transactions/:id/resolve-dispute — backend requires notes.length in [10, 1000]. */
export function resolveNvetDispute(
  accessToken: string,
  transactionId: string,
  resolution: NvetDisputeResolution,
  notes: string,
) {
  return postJson<NvetTransaction>(`/api/admin/transactions/${transactionId}/resolve-dispute`, accessToken, { resolution, notes });
}
