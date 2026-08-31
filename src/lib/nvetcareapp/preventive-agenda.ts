import 'server-only';

import { getNvetAuthorizationHeaders } from './request';
import { getNvetApiUrl } from './session';

export type NvetPreventiveAgendaStatus = 'OVERDUE' | 'DUE_SOON' | 'UPCOMING';
export type NvetPreventiveAgendaSource = 'VACCINATION' | 'DEWORMING' | 'PREVENTIVE_CARE';

export interface NvetPreventiveAgendaItem {
  id: string;
  petId: string;
  petName: string;
  species: string;
  source: NvetPreventiveAgendaSource;
  kind: string;
  title: string;
  dueAt: string;
  status: NvetPreventiveAgendaStatus;
  daysUntilDue: number;
}

export interface NvetPreventiveAgenda {
  generatedAt: string;
  windowDays: number;
  summary: {
    total: number;
    overdue: number;
    dueSoon: number;
    upcoming: number;
  };
  items: NvetPreventiveAgendaItem[];
}

type NvetPreventiveAgendaResult =
  | { ok: true; data: NvetPreventiveAgenda }
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

export async function fetchNvetPreventiveAgenda(
  accessToken: string,
  windowDays = 60,
): Promise<NvetPreventiveAgendaResult> {
  try {
    const response = await fetch(
      `${getNvetApiUrl()}/api/pets/preventive/agenda?windowDays=${encodeURIComponent(String(windowDays))}`,
      {
        headers: await getNvetAuthorizationHeaders(accessToken),
        cache: 'no-store',
      },
    );
    const data = await response.json().catch(() => null) as unknown;
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        message: backendMessage(data, 'No se pudo obtener la agenda preventiva'),
      };
    }
    if (
      !data ||
      typeof data !== 'object' ||
      !Array.isArray((data as NvetPreventiveAgenda).items) ||
      !(data as NvetPreventiveAgenda).summary
    ) {
      return { ok: false, status: 502, message: 'El servicio preventivo devolvió una respuesta inválida' };
    }
    return { ok: true, data: data as NvetPreventiveAgenda };
  } catch {
    return { ok: false, status: 502, message: 'No se pudo contactar el servicio preventivo' };
  }
}
