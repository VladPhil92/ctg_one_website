import { getNvetApiUrl } from './session';
import { getNvetAuthorizationHeaders } from './request';

export type NvetVetTier = 'FREE' | 'PRO' | 'ELITE';
export type NvetVetVerificationStatus = 'NONE' | 'PENDING' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'EXPIRED';

export interface NvetVetPrice {
  id: string;
  serviceName: string;
  priceCop: number;
  priceCtg?: number | null;
  isActive: boolean;
}

export interface NvetVetSchedule {
  id: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  slotDuration: number;
  isActive: boolean;
}

export interface NvetVerificationDocument {
  id: string;
  documentType?: string;
  type?: string;
  fileName?: string;
  status: string;
  uploadedAt: string;
  expiryDate?: string | null;
}

export interface NvetVetProfile {
  id: string;
  userId: string;
  licenseNumber: string;
  specialties: string[];
  tier: NvetVetTier;
  ctgBalance: number;
  bio?: string | null;
  yearsExperience?: number | null;
  rating?: number | null;
  reviewCount: number;
  isVerified: boolean;
  isActive: boolean;
  verificationStatus: NvetVetVerificationStatus;
  city?: string | null;
  department?: string | null;
  serviceRadius: number;
  isAvailableNow: boolean;
  timezone: string;
  user: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    email: string;
    phone?: string | null;
    avatar?: string | null;
  };
  prices: NvetVetPrice[];
  schedules: NvetVetSchedule[];
  verificationDocuments: NvetVerificationDocument[];
}

export interface NvetVetEarnings {
  totalEarnings: number;
  totalCommissions: number;
  netEarnings: number;
  totalCtg: number;
  pendingBalance: number;
  availableBalance: number;
  transactionCount: number;
  ctgBalance: number;
  byTier: {
    tier: NvetVetTier;
    commissionPct: number;
    commissionAmount: number;
    earnings: number;
  };
  byMonth: Array<{
    month: string;
    count: number;
    earnings: number;
    commissions: number;
    netEarnings: number;
  }>;
}

export interface NvetScheduleException {
  id: string;
  date: string;
  isAvailable: boolean;
  reason?: string | null;
  startTime?: string | null;
  endTime?: string | null;
}

export type NvetDomainResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; message: string };

function backendMessage(value: unknown, fallback: string): string {
  if (!value || typeof value !== 'object') return fallback;
  const message = (value as { message?: unknown }).message;
  if (typeof message === 'string' && message.trim()) return message;
  if (Array.isArray(message)) {
    const joined = message.filter((item): item is string => typeof item === 'string').join('. ');
    if (joined) return joined;
  }
  return fallback;
}

async function parseJsonSafe(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function nvetRequest<T>(
  accessToken: string,
  path: string,
  init: RequestInit = {},
  fallback = 'No se pudo completar la operación veterinaria',
): Promise<NvetDomainResult<T>> {
  try {
    const headers = new Headers(await getNvetAuthorizationHeaders(accessToken));
    if (init.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }
    const response = await fetch(`${getNvetApiUrl()}/api${path}`, {
      ...init,
      headers,
      cache: 'no-store',
    });
    const data = response.status === 204 ? null : await parseJsonSafe(response);
    if (!response.ok) {
      return { ok: false, status: response.status, message: backendMessage(data, fallback) };
    }
    return { ok: true, data: data as T };
  } catch {
    return { ok: false, status: 502, message: 'No se pudo contactar el servicio veterinario' };
  }
}

export function fetchNvetVetProfile(accessToken: string): Promise<NvetDomainResult<NvetVetProfile>> {
  return nvetRequest(accessToken, '/vets/me', {}, 'No se pudo consultar el perfil veterinario');
}

export function fetchNvetVetEarnings(accessToken: string): Promise<NvetDomainResult<NvetVetEarnings>> {
  return nvetRequest(accessToken, '/vets/me/earnings', {}, 'No se pudo consultar el resumen de ingresos');
}

export function fetchNvetVetPrices(accessToken: string): Promise<NvetDomainResult<NvetVetPrice[]>> {
  return nvetRequest(accessToken, '/vets/me/prices', {}, 'No se pudo consultar el tarifario');
}

export function fetchNvetScheduleExceptions(
  accessToken: string,
  startDate: string,
  endDate: string,
): Promise<NvetDomainResult<NvetScheduleException[]>> {
  const params = new URLSearchParams({ startDate, endDate });
  return nvetRequest(
    accessToken,
    `/vets/me/schedule/exceptions?${params.toString()}`,
    {},
    'No se pudieron consultar las excepciones de agenda',
  );
}

export function toggleNvetVetAvailability(accessToken: string): Promise<NvetDomainResult<NvetVetProfile>> {
  return nvetRequest(
    accessToken,
    '/vets/me/availability/toggle',
    { method: 'POST' },
    'No se pudo actualizar la disponibilidad',
  );
}

export function createNvetVetPrice(
  accessToken: string,
  input: { serviceName: string; priceCop: number; priceCtg?: number },
): Promise<NvetDomainResult<NvetVetPrice>> {
  return nvetRequest(
    accessToken,
    '/vets/me/prices',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
    'No se pudo crear el servicio',
  );
}

export function updateNvetVetPrice(
  accessToken: string,
  priceId: string,
  input: Partial<Pick<NvetVetPrice, 'serviceName' | 'priceCop' | 'priceCtg' | 'isActive'>>,
): Promise<NvetDomainResult<NvetVetPrice>> {
  return nvetRequest(
    accessToken,
    `/vets/me/prices/${encodeURIComponent(priceId)}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
    'No se pudo actualizar el servicio',
  );
}

export async function deleteNvetVetPrice(accessToken: string, priceId: string): Promise<NvetDomainResult<null>> {
  return nvetRequest(
    accessToken,
    `/vets/me/prices/${encodeURIComponent(priceId)}`,
    { method: 'DELETE' },
    'No se pudo ocultar el servicio',
  );
}

export function upsertNvetScheduleException(
  accessToken: string,
  date: string,
  input: { isAvailable?: boolean; reason?: string; startTime?: string; endTime?: string },
): Promise<NvetDomainResult<NvetScheduleException>> {
  return nvetRequest(
    accessToken,
    `/vets/me/schedule/exceptions/${encodeURIComponent(date)}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
    'No se pudo actualizar la excepción de agenda',
  );
}

export function deleteNvetScheduleException(
  accessToken: string,
  date: string,
): Promise<NvetDomainResult<null>> {
  return nvetRequest(
    accessToken,
    `/vets/me/schedule/exceptions/${encodeURIComponent(date)}`,
    { method: 'DELETE' },
    'No se pudo eliminar la excepción de agenda',
  );
}
