import 'server-only';

import { getNvetAuthorizationHeaders } from './request';
import { getNvetApiUrl } from './session';
import type { NvetUserRole } from './user';

export type NvetNotificationCategory = 'APPOINTMENT' | 'PAYMENT' | 'PREVENTIVE' | string;

export interface NvetNotification {
  id: string;
  type: string;
  category: NvetNotificationCategory;
  title: string;
  message: string;
  actionPath?: string | null;
  safeHref: string | null;
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

const PET_HEALTH_ROUTE = /^\/nvetcareapp\/dashboard\/mascotas\/[0-9a-f-]{36}\/salud$/i;

function safeNotificationHref(actionPath: unknown, role: NvetUserRole): string | null {
  if (typeof actionPath !== 'string') return null;

  if (role === 'CLIENT') {
    if (
      actionPath === '/nvetcareapp/dashboard/citas' ||
      actionPath === '/nvetcareapp/dashboard/historial' ||
      PET_HEALTH_ROUTE.test(actionPath)
    ) {
      return actionPath;
    }
    return null;
  }

  if (role === 'VET') {
    if (
      actionPath === '/nvetcareapp/dashboard/veterinario' ||
      actionPath === '/nvetcareapp/dashboard/servicios'
    ) {
      return actionPath;
    }
  }

  return null;
}

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

function parseInbox(value: unknown, role: NvetUserRole): NvetNotificationInbox | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const rawSummary = raw.summary;
  if (!rawSummary || typeof rawSummary !== 'object' || !Array.isArray(raw.items)) return null;
  const summary = rawSummary as Record<string, unknown>;
  if (
    typeof summary.total !== 'number' ||
    typeof summary.unread !== 'number' ||
    !Number.isInteger(summary.total) ||
    !Number.isInteger(summary.unread) ||
    summary.total < 0 ||
    summary.unread < 0
  ) {
    return null;
  }

  const items: NvetNotification[] = [];
  for (const candidate of raw.items) {
    if (!candidate || typeof candidate !== 'object') continue;
    const item = candidate as Record<string, unknown>;
    if (
      typeof item.id !== 'string' ||
      typeof item.type !== 'string' ||
      typeof item.category !== 'string' ||
      typeof item.title !== 'string' ||
      typeof item.message !== 'string' ||
      typeof item.occurredAt !== 'string' ||
      typeof item.createdAt !== 'string' ||
      typeof item.updatedAt !== 'string'
    ) {
      continue;
    }

    const actionPath = typeof item.actionPath === 'string' ? item.actionPath : null;
    items.push({
      id: item.id,
      type: item.type,
      category: item.category,
      title: item.title,
      message: item.message,
      actionPath,
      safeHref: safeNotificationHref(actionPath, role),
      metadata: item.metadata && typeof item.metadata === 'object'
        ? item.metadata as Record<string, unknown>
        : null,
      occurredAt: item.occurredAt,
      readAt: typeof item.readAt === 'string' ? item.readAt : null,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    });
  }

  return {
    generatedAt: typeof raw.generatedAt === 'string' ? raw.generatedAt : new Date().toISOString(),
    summary: { total: summary.total, unread: summary.unread },
    items,
  };
}

export async function fetchNvetNotifications(
  accessToken: string,
  role: NvetUserRole,
  limit = 50,
): Promise<NvetResult<NvetNotificationInbox>> {
  const boundedLimit = Number.isInteger(limit) ? Math.min(100, Math.max(1, limit)) : 50;
  try {
    const response = await fetch(
      `${getNvetApiUrl()}/api/notifications?limit=${encodeURIComponent(String(boundedLimit))}`,
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
    const inbox = parseInbox(data, role);
    if (!inbox) {
      return { ok: false, status: 502, message: 'El servicio de notificaciones devolvió una respuesta inválida' };
    }
    return { ok: true, data: inbox };
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
