import 'server-only';

import { getNvetApiUrl } from './session';
import type { NvetBetaOperationsSnapshot } from './beta-types';

type NvetBetaOperationsResult =
  | { ok: true; data: NvetBetaOperationsSnapshot }
  | { ok: false; status: number };

type ReadResult<T> = { ok: true; data: T } | { ok: false; status: number };

async function readBetaEndpoint<T>(accessToken: string, path: string): Promise<ReadResult<T>> {
  let response: Response;
  try {
    response = await fetch(`${getNvetApiUrl()}/api/beta/${path}`, {
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

export async function fetchNvetBetaOperations(accessToken: string): Promise<NvetBetaOperationsResult> {
  const [readiness, cohort, activation, evidenceSummary, evidenceHistory] = await Promise.all([
    readBetaEndpoint<NvetBetaOperationsSnapshot['readiness']>(accessToken, 'readiness'),
    readBetaEndpoint<NvetBetaOperationsSnapshot['cohort']>(accessToken, 'cohort'),
    readBetaEndpoint<NvetBetaOperationsSnapshot['activation']>(accessToken, 'activation'),
    readBetaEndpoint<NvetBetaOperationsSnapshot['evidenceSummary']>(accessToken, 'evidence/summary'),
    readBetaEndpoint<NvetBetaOperationsSnapshot['evidenceHistory']>(accessToken, 'evidence/history'),
  ]);

  const failed = [readiness, cohort, activation, evidenceSummary, evidenceHistory].find((result) => !result.ok);
  if (failed && !failed.ok) return { ok: false, status: failed.status };

  if (!readiness.ok || !cohort.ok || !activation.ok || !evidenceSummary.ok || !evidenceHistory.ok) {
    return { ok: false, status: 502 };
  }

  return {
    ok: true,
    data: {
      readiness: readiness.data,
      cohort: cohort.data,
      activation: activation.data,
      evidenceSummary: evidenceSummary.data,
      evidenceHistory: evidenceHistory.data,
    },
  };
}
