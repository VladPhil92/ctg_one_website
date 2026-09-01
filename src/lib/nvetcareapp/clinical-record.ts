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

type UnknownObject = Record<string, unknown>;

function isObject(value: unknown): value is UnknownObject {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isOptionalNullableString(value: unknown): boolean {
  return value === undefined || value === null || typeof value === 'string';
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function isPet(value: unknown): value is NvetClinicalRecordPet {
  if (!isObject(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.species === 'string' &&
    isOptionalNullableString(value.breed) &&
    (value.weight === undefined || value.weight === null || (typeof value.weight === 'number' && Number.isFinite(value.weight))) &&
    isOptionalNullableString(value.birthDate) &&
    isOptionalNullableString(value.photo) &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string'
  );
}

function isOwnerReportedHealthProfile(value: unknown): value is NvetPetHealthProfile {
  if (!isObject(value)) return false;
  return (
    value.schemaVersion === 1 &&
    value.source === 'OWNER_REPORTED' &&
    Array.isArray(value.allergies) &&
    Array.isArray(value.medications) &&
    Array.isArray(value.conditions) &&
    Array.isArray(value.vaccinations) &&
    Array.isArray(value.deworming) &&
    Array.isArray(value.preventiveCare)
  );
}

function isVetAuthoredRecord(value: unknown): value is NvetVetAuthoredClinicalRecord {
  if (!isObject(value) || !isObject(value.veterinarian)) return false;
  return (
    typeof value.appointmentId === 'string' &&
    value.source === 'VET_AUTHORED' &&
    typeof value.serviceType === 'string' &&
    typeof value.date === 'string' &&
    typeof value.time === 'string' &&
    isOptionalNullableString(value.completedAt) &&
    typeof value.lastUpdatedAt === 'string' &&
    typeof value.veterinarian.name === 'string' &&
    isOptionalNullableString(value.diagnosis) &&
    isOptionalNullableString(value.treatment) &&
    typeof value.hasClinicalNote === 'boolean'
  );
}

function isClinicalRecordV3(value: unknown): value is NvetClinicalRecordV3 {
  if (!isObject(value) || value.schemaVersion !== 3 || typeof value.generatedAt !== 'string') return false;
  if (!isPet(value.pet)) return false;

  const ownerReported = value.ownerReported;
  if (!isObject(ownerReported)) return false;
  if (
    ownerReported.source !== 'OWNER_REPORTED' ||
    !isNonNegativeInteger(ownerReported.schemaVersion) ||
    !isOptionalNullableString(ownerReported.updatedAt) ||
    typeof ownerReported.available !== 'boolean'
  ) {
    return false;
  }
  if (
    (ownerReported.available && !isOwnerReportedHealthProfile(ownerReported.data)) ||
    (!ownerReported.available && ownerReported.data !== null)
  ) {
    return false;
  }

  const vetAuthored = value.vetAuthored;
  if (
    !isObject(vetAuthored) ||
    vetAuthored.source !== 'VET_AUTHORED' ||
    !Array.isArray(vetAuthored.records) ||
    !vetAuthored.records.every(isVetAuthoredRecord)
  ) {
    return false;
  }

  const summary = value.summary;
  if (
    !isObject(summary) ||
    !isNonNegativeInteger(summary.completedAttendances) ||
    !isNonNegativeInteger(summary.documentedAttendances) ||
    typeof summary.ownerReportedProfileAvailable !== 'boolean'
  ) {
    return false;
  }
  if (
    summary.documentedAttendances > summary.completedAttendances ||
    summary.completedAttendances !== vetAuthored.records.length ||
    summary.documentedAttendances !== vetAuthored.records.filter((record) => record.hasClinicalNote).length ||
    summary.ownerReportedProfileAvailable !== ownerReported.available
  ) {
    return false;
  }

  const provenance = value.provenance;
  return (
    isObject(provenance) &&
    typeof provenance.ownerReported === 'string' &&
    typeof provenance.vetAuthored === 'string'
  );
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
    const data = (await response.json().catch(() => null)) as unknown;

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        message: backendMessage(data, 'No se pudo obtener el expediente clínico'),
      };
    }

    if (!isClinicalRecordV3(data)) {
      return {
        ok: false,
        status: 502,
        message: 'El servicio clínico devolvió una respuesta inválida',
      };
    }

    return { ok: true, data };
  } catch {
    return {
      ok: false,
      status: 502,
      message: 'No se pudo contactar el servicio clínico de Nvet Care',
    };
  }
}
