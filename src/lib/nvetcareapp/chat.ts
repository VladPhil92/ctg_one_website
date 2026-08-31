import 'server-only';

import { getNvetAuthorizationHeaders } from './request';
import { getNvetApiUrl } from './session';

export type NvetChatAppointmentStatus = 'CONFIRMED' | 'IN_PROGRESS';

export interface NvetChatParticipant {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  avatar?: string | null;
  role: 'CLIENT' | 'VET';
}

export interface NvetChatMessage {
  id: string;
  appointmentId: string;
  senderId: string;
  content: string;
  type: string;
  priceData?: Record<string, unknown> | null;
  readAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  sender: NvetChatParticipant;
}

export interface NvetChatAppointmentContext {
  status: NvetChatAppointmentStatus;
  serviceType: string;
  date: string;
  time: string;
  pet: { id: string; name: string };
  chatWritable: boolean;
}

export interface NvetActiveChat {
  appointmentId: string;
  appointment: NvetChatAppointmentContext;
  participants: NvetChatParticipant[];
  isMonitored: boolean;
  lastMessage: NvetChatMessage | null;
  unreadCount: number;
}

export interface NvetChatMetadata extends NvetActiveChat {}

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

async function getJson<T>(path: string, accessToken: string, fallback: string): Promise<NvetResult<T>> {
  try {
    const response = await fetch(`${getNvetApiUrl()}${path}`, {
      headers: await getNvetAuthorizationHeaders(accessToken),
      cache: 'no-store',
    });
    const data = await parseJsonSafe(response);
    if (!response.ok) {
      return { ok: false, status: response.status, message: backendMessage(data, fallback) };
    }
    return { ok: true, data: data as T };
  } catch {
    return { ok: false, status: 502, message: 'No se pudo contactar el servicio de chat' };
  }
}

export async function fetchNvetActiveChats(accessToken: string): Promise<NvetResult<NvetActiveChat[]>> {
  const result = await getJson<unknown>('/api/chat/active', accessToken, 'No se pudieron obtener tus conversaciones');
  if (!result.ok) return result;
  if (!Array.isArray(result.data)) {
    return { ok: false, status: 502, message: 'El servicio de chat devolvió una respuesta inválida' };
  }
  return { ok: true, data: result.data as NvetActiveChat[] };
}

export async function fetchNvetChatMessages(
  accessToken: string,
  appointmentId: string,
): Promise<NvetResult<NvetChatMessage[]>> {
  const result = await getJson<unknown>(
    `/api/chat/${encodeURIComponent(appointmentId)}/messages`,
    accessToken,
    'No se pudieron obtener los mensajes',
  );
  if (!result.ok) return result;
  if (!Array.isArray(result.data)) {
    return { ok: false, status: 502, message: 'El servicio de chat devolvió mensajes inválidos' };
  }
  return { ok: true, data: result.data as NvetChatMessage[] };
}

export async function fetchNvetChatMetadata(
  accessToken: string,
  appointmentId: string,
): Promise<NvetResult<NvetChatMetadata>> {
  const result = await getJson<unknown>(
    `/api/chat/${encodeURIComponent(appointmentId)}/metadata`,
    accessToken,
    'No se pudo obtener la conversación',
  );
  if (!result.ok) return result;
  if (!result.data || typeof result.data !== 'object') {
    return { ok: false, status: 502, message: 'El servicio de chat devolvió metadata inválida' };
  }
  return { ok: true, data: result.data as NvetChatMetadata };
}
