import { getNvetApiUrl } from './session';

// Mirrors the shape returned by Nvet-Care-App's admin.service.ts::getMetrics()
// (backend/src/admin/admin.service.ts). Keep in sync with that source of truth
// — this repo has no shared types package with the backend.
export interface NvetAdminMetrics {
  users: {
    total: number;
    vets: { total: number; verified: number };
  };
  appointments: {
    total: number;
    completed: number;
    completionRate: number;
  };
  revenue: {
    gross: number;
    commissions: number;
    transactionCount: number;
  };
  alerts: {
    pendingTransfers: number;
    disputedTransactions: number;
  };
  tierDistribution: Record<string, number>;
}

export type NvetAdminMetricsResult =
  | { ok: true; metrics: NvetAdminMetrics }
  | { ok: false; status: number };

/**
 * Calls NestJS GET /api/admin/metrics server-to-server with the caller's
 * bearer token. The backend's own JwtAuthGuard + RolesGuard(ADMIN) is the
 * authoritative authorization check (ADR-003) — this just forwards its
 * outcome, it does not re-implement the role check.
 */
export async function fetchNvetAdminMetrics(accessToken: string): Promise<NvetAdminMetricsResult> {
  let res: Response;
  try {
    res = await fetch(`${getNvetApiUrl()}/api/admin/metrics`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });
  } catch {
    // Network failure, DNS, timeout, connection reset — fetch() rejects
    // rather than resolving with a non-OK Response, so this must be
    // caught explicitly or callers get an unhandled 500 instead of the
    // graceful "couldn't reach the backend" state.
    return { ok: false, status: 502 };
  }

  if (!res.ok) {
    return { ok: false, status: res.status };
  }

  try {
    const metrics = (await res.json()) as NvetAdminMetrics;
    return { ok: true, metrics };
  } catch {
    return { ok: false, status: 502 };
  }
}
