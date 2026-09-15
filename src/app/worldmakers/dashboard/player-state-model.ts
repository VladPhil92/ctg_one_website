export type PlayerStateKind = 'saves' | 'missions' | 'discoveries' | 'achievements';

export type PlayerStatePayload = {
  schemaVersion?: number;
  profile?: {
    exists?: boolean;
    revision?: number;
    updatedAt?: string | null;
  };
  synchronization?: {
    identity?: string;
    gameRuntime?: string;
    cloudSave?: string;
  };
  saves?: unknown[];
  missions?: unknown[];
  discoveries?: unknown[];
  achievements?: unknown[];
};

export type PlayerStateViewItem = {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  meta: string[];
  timestamp: string | null;
  progress: number | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function stringValue(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim().slice(0, 180);
  }
  return null;
}

function numberValue(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return null;
}

function timestampValue(record: Record<string, unknown>) {
  return stringValue(record, ['lastPlayedAt', 'updatedAt', 'completedAt', 'discoveredAt', 'unlockedAt', 'createdAt']);
}

function progressValue(record: Record<string, unknown>) {
  const raw = numberValue(record, ['progressPercent', 'progress', 'completionPercent']);
  if (raw === null) return null;
  const normalized = raw <= 1 ? raw * 100 : raw;
  return Math.max(0, Math.min(100, Math.round(normalized)));
}

const KIND_COPY: Record<PlayerStateKind, { title: string; fallback: string }> = {
  saves: { title: 'Partida sincronizada', fallback: 'Guardado recibido desde el runtime.' },
  missions: { title: 'Misión sincronizada', fallback: 'Objetivo recibido desde el runtime.' },
  discoveries: { title: 'Descubrimiento sincronizado', fallback: 'Hallazgo recibido desde el runtime.' },
  achievements: { title: 'Logro sincronizado', fallback: 'Hito recibido desde el runtime.' },
};

export function normalizePlayerStateItem(kind: PlayerStateKind, value: unknown, index: number): PlayerStateViewItem {
  const record = asRecord(value);
  if (!record) {
    return {
      id: `${kind}-${index}`,
      title: `${KIND_COPY[kind].title} ${index + 1}`,
      subtitle: null,
      description: KIND_COPY[kind].fallback,
      meta: [],
      timestamp: null,
      progress: null,
    };
  }

  const id = stringValue(record, ['slotId', 'missionId', 'discoveryId', 'achievementId', 'id', 'key']) ?? `${kind}-${index}`;
  const title = stringValue(record, ['title', 'name', 'label', 'missionName', 'achievementName']) ?? `${KIND_COPY[kind].title} ${index + 1}`;
  const subtitle = stringValue(record, ['world', 'adventure', 'location', 'category', 'status']);
  const description = stringValue(record, ['description', 'objective', 'summary', 'details']) ?? KIND_COPY[kind].fallback;
  const meta = [
    stringValue(record, ['status']),
    stringValue(record, ['world', 'adventure']),
    stringValue(record, ['location', 'category']),
  ].filter((item): item is string => Boolean(item));

  return {
    id,
    title,
    subtitle,
    description,
    meta: Array.from(new Set(meta)).slice(0, 3),
    timestamp: timestampValue(record),
    progress: progressValue(record),
  };
}

export function collectionFor(state: PlayerStatePayload | null, kind: PlayerStateKind) {
  const collection = state?.[kind];
  return Array.isArray(collection) ? collection : [];
}

export function formatPlayerTimestamp(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}
