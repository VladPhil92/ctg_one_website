import { getNvetApiUrl } from './session';

export type NvetVetTier = 'FREE' | 'PRO' | 'ELITE';
export type NvetVerificationStatus = 'NONE' | 'PENDING' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'EXPIRED';

// Canonical per-tier commission rate. Mirrors backend/src/payments/service.ts's
// TIER_COMMISSIONS — that's the real source of truth (used to calculate
// actual payouts) and isn't exposed by any endpoint, so this must be kept
// in sync by hand if it ever changes there.
export const NVET_TIER_COMMISSION_PCT: Record<NvetVetTier, number> = {
  FREE: 10,
  PRO: 8,
  ELITE: 3,
};

// Mirrors the shape returned by GET /admin/veterinarians
// (admin.service.ts::getVeterinarians()).
export interface NvetVet {
  id: string;
  tier: NvetVetTier;
  isVerified: boolean;
  verificationStatus: NvetVerificationStatus;
  rating: number | null;
  reviewCount: number;
  user: { id: string; email: string; firstName: string; lastName: string };
  _count: { appointments: number; reviews: number };
}

export interface NvetVetsPage {
  results: NvetVet[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export type NvetVetsResult =
  | { ok: true; page: NvetVetsPage }
  | { ok: false; status: number };

const PAGE_SIZE = 20;

export async function fetchNvetVets(accessToken: string, offset = 0): Promise<NvetVetsResult> {
  let res: Response;
  try {
    res = await fetch(`${getNvetApiUrl()}/api/admin/veterinarians?limit=${PAGE_SIZE}&offset=${offset}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });
  } catch {
    return { ok: false, status: 502 };
  }

  if (!res.ok) {
    return { ok: false, status: res.status };
  }

  try {
    const page = (await res.json()) as NvetVetsPage;
    return { ok: true, page };
  } catch {
    return { ok: false, status: 502 };
  }
}

export type NvetUpdateVetTierResult =
  | { ok: true; vet: NvetVet }
  | { ok: false; status: number };

/**
 * PATCH /admin/veterinarians/:id/tier — the backend's own guard restricts
 * this to ADMIN (RolesGuard(ADMIN)) and audit-logs the change
 * (VET_TIER_CHANGED, before/after tier); this never re-implements either.
 */
export async function updateNvetVetTier(
  accessToken: string,
  vetId: string,
  tier: NvetVetTier,
  reason?: string,
): Promise<NvetUpdateVetTierResult> {
  let res: Response;
  try {
    res = await fetch(`${getNvetApiUrl()}/api/admin/veterinarians/${vetId}/tier`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ tier, reason }),
    });
  } catch {
    return { ok: false, status: 502 };
  }

  if (!res.ok) {
    return { ok: false, status: res.status };
  }

  try {
    const vet = (await res.json()) as NvetVet;
    return { ok: true, vet };
  } catch {
    return { ok: false, status: 502 };
  }
}
