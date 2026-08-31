import 'server-only';

import { getNvetAuthorizationHeaders } from './request';
import { getNvetApiUrl } from './session';

export interface NvetClientProfile {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  avatar?: string | null;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  identitySource: 'CTG_ONE' | 'NVET_LOCAL';
}

export interface UpdateNvetClientProfileInput {
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export interface NvetUserSession {
  id: string;
  userAgent?: string | null;
  ipAddress?: string | null;
  deviceLabel?: string | null;
  lastUsedAt: string;
  createdAt: string;
  expiresAt: string;
}

type NvetResult<T> =
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

function isProfile(value: unknown): value is NvetClientProfile {
  if (!value || typeof value !== 'object') return false;
  const profile = value as Partial<NvetClientProfile>;
  return (
    typeof profile.id === 'string' &&
    typeof profile.email === 'string' &&
    typeof profile.emailVerified === 'boolean' &&
    typeof profile.twoFactorEnabled === 'boolean' &&
    (profile.identitySource === 'CTG_ONE' || profile.identitySource === 'NVET_LOCAL')
  );
}

export async function fetchNvetClientProfile(accessToken: string): Promise<NvetResult<NvetClientProfile>> {
  try {
    const response = await fetch(`${getNvetApiUrl()}/api/profile`, {
      headers: await getNvetAuthorizationHeaders(accessToken),
      cache: 'no-store',
    });
    const data = await parseJsonSafe(response);
    if (!response.ok) {
      return { ok: false, status: response.status, message: backendMessage(data, 'No se pudo obtener el perfil') };
    }
    if (!isProfile(data)) {
      return { ok: false, status: 502, message: 'El servicio de perfil devolvió una respuesta inválida' };
    }
    return { ok: true, data };
  } catch {
    return { ok: false, status: 502, message: 'No se pudo contactar el servicio de perfil' };
  }
}

export async function updateNvetClientProfile(
  accessToken: string,
  input: UpdateNvetClientProfileInput,
): Promise<NvetResult<NvetClientProfile>> {
  try {
    const response = await fetch(`${getNvetApiUrl()}/api/profile`, {
      method: 'PATCH',
      headers: await getNvetAuthorizationHeaders(accessToken, { 'Content-Type': 'application/json' }),
      body: JSON.stringify(input),
      cache: 'no-store',
    });
    const data = await parseJsonSafe(response);
    if (!response.ok) {
      return { ok: false, status: response.status, message: backendMessage(data, 'No se pudo actualizar el perfil') };
    }
    if (!isProfile(data)) {
      return { ok: false, status: 502, message: 'El servicio de perfil devolvió una respuesta inválida' };
    }
    return { ok: true, data };
  } catch {
    return { ok: false, status: 502, message: 'No se pudo contactar el servicio de perfil' };
  }
}

export async function fetchNvetUserSessions(accessToken: string): Promise<NvetResult<NvetUserSession[]>> {
  try {
    const response = await fetch(`${getNvetApiUrl()}/api/auth/sessions`, {
      headers: await getNvetAuthorizationHeaders(accessToken),
      cache: 'no-store',
    });
    const data = await parseJsonSafe(response);
    if (!response.ok) {
      return { ok: false, status: response.status, message: backendMessage(data, 'No se pudieron obtener las sesiones') };
    }
    if (!Array.isArray(data)) {
      return { ok: false, status: 502, message: 'El servicio de sesiones devolvió una respuesta inválida' };
    }
    return { ok: true, data: data as NvetUserSession[] };
  } catch {
    return { ok: false, status: 502, message: 'No se pudo contactar el servicio de sesiones' };
  }
}

export async function revokeNvetUserSession(
  accessToken: string,
  sessionId: string,
): Promise<NvetResult<{ revoked: true }>> {
  try {
    const response = await fetch(`${getNvetApiUrl()}/api/auth/sessions/${encodeURIComponent(sessionId)}`, {
      method: 'DELETE',
      headers: await getNvetAuthorizationHeaders(accessToken),
      cache: 'no-store',
    });
    if (!response.ok) {
      const data = await parseJsonSafe(response);
      return { ok: false, status: response.status, message: backendMessage(data, 'No se pudo revocar la sesión') };
    }
    return { ok: true, data: { revoked: true } };
  } catch {
    return { ok: false, status: 502, message: 'No se pudo contactar el servicio de sesiones' };
  }
}
