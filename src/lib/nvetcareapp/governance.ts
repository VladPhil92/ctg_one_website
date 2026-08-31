import { getNvetApiUrl } from './session';

export interface NvetGovernanceOverview {
  users: {
    total: number;
    active: number;
    inactive: number;
    byRole: Record<string, number>;
  };
  veterinarians: {
    pendingReview: number;
    approved: number;
    rejected: number;
    byVerification: Record<string, number>;
  };
  appointments: {
    active: number;
    disputed: number;
    byStatus: Record<string, number>;
  };
  finance: {
    pending: number;
    disputed: number;
    failed: number;
    byStatus: Record<string, number>;
  };
  security: {
    criticalAudit24h: number;
    activeSessions: number;
  };
  moderation: {
    openMessageReports: number;
  };
  generatedAt: string;
}

export interface NvetGovernanceUser {
  id: string;
  email: string;
  role: 'SUPERADMIN' | 'ADMIN' | 'VET' | 'CLIENT';
  firstName: string | null;
  lastName: string | null;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  isActive: boolean;
  deactivatedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  ctgLinked: boolean;
}

export interface NvetGovernanceAuditEntry {
  id: string;
  actorId: string | null;
  actorRole: string | null;
  action: string;
  severity: 'INFO' | 'WARN' | 'CRITICAL';
  targetType: string | null;
  targetId: string | null;
  reason: string | null;
  createdAt: string;
}

export interface NvetGovernanceAppointment {
  id: string;
  serviceType: string;
  date: string;
  time: string;
  status: 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'DISPUTED';
  amount: number;
  paymentMethod: 'CTG' | 'PSE' | 'TRANSFER';
  client: { id: string; firstName: string | null; lastName: string | null; email: string };
  vet: { user: { id: string; firstName: string | null; lastName: string | null } };
  pet: { id: string; name: string; species: string };
  transaction: { id: string; status: string; paymentMethod: string } | null;
}

export interface NvetGovernanceTransaction {
  id: string;
  status: string;
  paymentMethod: string;
  amountCop: number;
  commissionAmount: number;
  createdAt: string;
  transferCode?: string | null;
  appointment: {
    id: string;
    serviceType: string;
    client: { id: string; firstName: string | null; lastName: string | null; email: string };
    vet: { user: { id: string; firstName: string | null; lastName: string | null } };
  };
}

export interface NvetGovernancePage<T> {
  results: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export type NvetGovernanceResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number };

async function fetchGovernance<T>(accessToken: string, path: string): Promise<NvetGovernanceResult<T>> {
  let response: Response;
  try {
    response = await fetch(`${getNvetApiUrl()}${path}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });
  } catch {
    return { ok: false, status: 502 };
  }

  if (!response.ok) return { ok: false, status: response.status };

  try {
    return { ok: true, data: (await response.json()) as T };
  } catch {
    return { ok: false, status: 502 };
  }
}

async function mutateGovernance<T>(
  accessToken: string,
  path: string,
  body: Record<string, unknown>,
): Promise<NvetGovernanceResult<T>> {
  let response: Response;
  try {
    response = await fetch(`${getNvetApiUrl()}${path}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
  } catch {
    return { ok: false, status: 502 };
  }

  if (!response.ok) return { ok: false, status: response.status };

  try {
    return { ok: true, data: (await response.json()) as T };
  } catch {
    return { ok: false, status: 502 };
  }
}

export function fetchNvetGovernanceOverview(accessToken: string) {
  return fetchGovernance<NvetGovernanceOverview>(accessToken, '/api/admin/governance/overview');
}

export function fetchNvetGovernanceUsers(accessToken: string, offset = 0, search?: string) {
  const params = new URLSearchParams({ limit: '25', offset: String(offset) });
  if (search && search.trim().length >= 2) params.set('search', search.trim());
  return fetchGovernance<NvetGovernancePage<NvetGovernanceUser>>(
    accessToken,
    `/api/admin/governance/users?${params.toString()}`,
  );
}

export function fetchNvetGovernanceAudit(accessToken: string, offset = 0, severity?: string) {
  const params = new URLSearchParams({ limit: '50', offset: String(offset) });
  if (severity) params.set('severity', severity);
  return fetchGovernance<NvetGovernancePage<NvetGovernanceAuditEntry>>(
    accessToken,
    `/api/admin/governance/audit-log?${params.toString()}`,
  );
}

export function fetchNvetGovernanceAppointments(accessToken: string, offset = 0, status?: string) {
  const params = new URLSearchParams({ limit: '25', offset: String(offset) });
  if (status) params.set('status', status);
  return fetchGovernance<NvetGovernancePage<NvetGovernanceAppointment>>(
    accessToken,
    `/api/admin/appointments?${params.toString()}`,
  );
}

export function fetchNvetGovernanceTransactions(accessToken: string, offset = 0, status?: string) {
  const params = new URLSearchParams({ limit: '25', offset: String(offset) });
  if (status) params.set('status', status);
  return fetchGovernance<NvetGovernancePage<NvetGovernanceTransaction>>(
    accessToken,
    `/api/admin/transactions?${params.toString()}`,
  );
}

export function fetchNvetPaymentStats(accessToken: string) {
  return fetchGovernance<Record<string, { total: number; amount: number; byStatus: Record<string, number> }>>(
    accessToken,
    '/api/admin/payment-stats',
  );
}

export function updateNvetGovernanceUserStatus(
  accessToken: string,
  userId: string,
  isActive: boolean,
  reason: string,
) {
  return mutateGovernance<Pick<NvetGovernanceUser, 'id' | 'email' | 'role' | 'isActive' | 'deactivatedAt'>>(
    accessToken,
    `/api/admin/governance/users/${userId}/status`,
    { isActive, reason },
  );
}

export function reviewNvetGovernanceVet(
  accessToken: string,
  vetId: string,
  decision: 'APPROVE' | 'REJECT' | 'IN_REVIEW',
  reason: string,
) {
  return mutateGovernance<Record<string, unknown>>(
    accessToken,
    `/api/admin/governance/veterinarians/${vetId}/verification`,
    { decision, reason },
  );
}

export function updateNvetGovernanceVetStatus(
  accessToken: string,
  vetId: string,
  isActive: boolean,
  reason: string,
) {
  return mutateGovernance<Record<string, unknown>>(
    accessToken,
    `/api/admin/governance/veterinarians/${vetId}/status`,
    { isActive, reason },
  );
}
