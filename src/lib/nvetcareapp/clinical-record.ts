import 'server-only';

import type { NvetPetHealthProfile } from './client-booking';
import { getNvetAuthorizationHeaders } from './request';
import { getNvetApiUrl } from './session';

export interface NvetClinicalRecordPet {
  id: string;
  name: string;
  species: string;
  breed?: string | null;
  weight?: number | null;
  birthDate?: string | null;
  photo?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NvetVetAuthoredClinicalRecord {
  appointmentId: string;
  source: 'VET_AUTHORED';
  serviceType: string;
  date: string;
  time: string;
  completedAt?: string | null;
  lastUpdatedAt: string;
  veterinarian: { name: string };
  diagnosis?: string | null;
  treatment?: string | null;
  hasClinicalNote: boolean;
}

export interface NvetClinicalRecordV3 {
  schemaVersion: 3;
  generatedAt: string;
  pet: NvetClinicalRecordPet;
  ownerReported: {
    source: 'OWNER_REPORTED';
    schemaVersion: number;
    updatedAt?: string | null;
    available: boolean;
    data: NvetPetHealthProfile | null;
  };
  vetAuthored: {
    source: 'VET_AUTHORED';
    records: NvetVetAuthoredClinicalRecord[];
  };
  summary: {
    completedAttendances: number;
    documentedAttendances: number;
    ownerReportedProfileAvailable: boolean;
  };
  provenance: {
    ownerReported: string;
    vetAuthored: string;
  };
}

export type NvetClinicalRecordResult =
  | { ok: true; data: NvetClinicalRecordV3 }
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

export async function fetchNvetClinicalRecord(
  accessToken: string,
  petId: string,
): Promise<NvetClinicalRecordResult> {
  try {
    const response = await fetch(
      `${getNvetApiUrl()}/api/pets/${encodeURIComponent(petId)}/clinical-record`,
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
        message: backendMessage(data, 'No se pudo obtener el expediente clínico'),
      };
    }

    if (
      !data ||
      typeof data !== 'object' ||
      (data as { schemaVersion?: unknown }).schemaVersion !== 3 ||
      typeof (data as { pet?: { id?: unknown } }).pet?.id !== 'string'
    ) {
      return {
        ok: false,
        status: 502,
        message: 'El servicio clínico devolvió una respuesta inválida',
      };
    }

    return { ok: true, data: data as NvetClinicalRecordV3 };
  } catch {
    return {
      ok: false,
      status: 502,
      message: 'No se pudo contactar el servicio clínico de Nvet Care',
    };
  }
}
