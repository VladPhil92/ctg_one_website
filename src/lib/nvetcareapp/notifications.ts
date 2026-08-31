import 'server-only';

import { getNvetAuthorizationHeaders } from './request';
import { getNvetApiUrl } from './session';

export type NvetNotificationCategory = 'APPOINTMENT' | 'PREVENTIVE';

export interface NvetNotification {
  id: string;
  type: string;
  category: NvetNotificationCategory;
  title: string;
  message: string;
  actionPath?: string | null;
  metadata?: Record<string, unknown> | null;
  occurredAt: string;
  readAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NvetNotificationInbox {
  generatedAt: string;
  summary: {
    total: number;
    unread: number;
  };
  items: NvetNotification[];
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

export async function fetchNvetNotifications(
  accessToken: string,
  limit = 50,
): Promise<NvetResult<NvetNotificationInbox>> {
  try {
    const response = await fetch(
      `${getNvetApiUrl()}/api/notifications?limit=${encodeURIComponent(String(limit))}`,
      {
        headers: await getNvetAuthorizationHeaders(accessToken),
        cache: 'no-store',
      },
    );
    const data = await parseJsonSafe(response);
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        message: backendMessage(data, 'No se pudieron obtener las notificaciones'),
      };
    }
    if (
      !data ||
      typeof data !== 'object' ||
      !Array.isArray((data as NvetNotificationInbox).items) ||
      !(data as NvetNotificationInbox).summary
    ) {
      return { ok: false, status: 502, message: 'El servicio de notificaciones devolvió una respuesta inválida' };
    }
    return { ok: true, data: data as NvetNotificationInbox };
  } catch {
    return { ok: false, status: 502, message: 'No se pudo contactar el servicio de notificaciones' };
  }
}

export async function fetchNvetUnreadNotificationCount(
  accessToken: string,
): Promise<NvetResult<{ unread: number }>> {
  try {
    const response = await fetch(`${getNvetApiUrl()}/api/notifications/unread-count`, {
      headers: await getNvetAuthorizationHeaders(accessToken),
      cache: 'no-store',
    });
    const data = await parseJsonSafe(response);
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        message: backendMessage(data, 'No se pudo obtener el contador de notificaciones'),
      };
    }
    const unread = data && typeof data === 'object' ? (data as { unread?: unknown }).unread : null;
    if (typeof unread !== 'number' || !Number.isInteger(unread) || unread < 0) {
      return { ok: false, status: 502, message: 'El contador de notificaciones es inválido' };
    }
    return { ok: true, data: { unread } };
  } catch {
    return { ok: false, status: 502, message: 'No se pudo contactar el servicio de notificaciones' };
  }
}

export async function markNvetNotificationRead(
  accessToken: string,
  notificationId: string,
): Promise<NvetResult<NvetNotification>> {
  try {
    const response = await fetch(
      `${getNvetApiUrl()}/api/notifications/${encodeURIComponent(notificationId)}/read`,
      {
        method: 'PATCH',
        headers: await getNvetAuthorizationHeaders(accessToken),
        cache: 'no-store',
      },
    );
    const data = await parseJsonSafe(response);
    if (!response.ok) {
      return { ok: false, status: response.status, message: backendMessage(data, 'No se pudo marcar la notificación') };
    }
    return { ok: true, data: data as NvetNotification };
  } catch {
    return { ok: false, status: 502, message: 'No se pudo contactar el servicio de notificaciones' };
  }
}

export async function markAllNvetNotificationsRead(
  accessToken: string,
): Promise<NvetResult<{ updated: number; readAt: string }>> {
  try {
    const response = await fetch(`${getNvetApiUrl()}/api/notifications/read-all`, {
      method: 'PATCH',
      headers: await getNvetAuthorizationHeaders(accessToken),
      cache: 'no-store',
    });
    const data = await parseJsonSafe(response);
    if (!response.ok) {
      return { ok: false, status: response.status, message: backendMessage(data, 'No se pudieron actualizar las notificaciones') };
    }
    return { ok: true, data: data as { updated: number; readAt: string } };
  } catch {
    return { ok: false, status: 502, message: 'No se pudo contactar el servicio de notificaciones' };
  }
}
