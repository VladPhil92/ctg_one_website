import { getNvetApiUrl } from './session';

// Mirrors the shape returned by GET /chat/:appointmentId/messages
// (chat.service.ts::getMessages()). Text messages only for this slice —
// `sharePrice` (type: PRICE, priceData) is a separate, not-yet-built
// capability (chat.controller.ts::sharePrice, VET-only).
export interface NvetChatMessage {
  id: string;
  appointmentId: string;
  senderId: string;
  content: string;
  type: 'TEXT' | 'PRICE';
  createdAt: string;
  sender: { id: string; firstName: string; lastName: string; role: string };
}

async function getJson<T>(path: string, accessToken: string): Promise<{ ok: true; data: T } | { ok: false; status: number }> {
  let res: Response;
  try {
    res = await fetch(`${getNvetApiUrl()}${path}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });
  } catch {
    return { ok: false, status: 502 };
  }
  if (!res.ok) return { ok: false, status: res.status };
  try {
    return { ok: true, data: (await res.json()) as T };
  } catch {
    return { ok: false, status: 502 };
  }
}

async function postJson<T>(
  path: string,
  accessToken: string,
  body: unknown,
): Promise<{ ok: true; data: T } | { ok: false; status: number; message?: string }> {
  let res: Response;
  try {
    res = await fetch(`${getNvetApiUrl()}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, status: 502 };
  }
  if (!res.ok) {
    const message = await res.json().then((data) => data?.message).catch(() => undefined);
    return { ok: false, status: res.status, message };
  }
  try {
    return { ok: true, data: (await res.json()) as T };
  } catch {
    return { ok: false, status: 502 };
  }
}

/**
 * GET /chat/:appointmentId/messages — the backend's own ChatMembershipGuard
 * (participant-only, ADMIN always allowed) is the authoritative check; this
 * never re-implements it.
 */
export function fetchNvetChatMessages(accessToken: string, appointmentId: string) {
  return getJson<NvetChatMessage[]>(`/api/chat/${appointmentId}/messages`, accessToken);
}

/**
 * POST /chat/:appointmentId/messages — the backend's own EmailVerifiedGuard
 * + ChatMembershipGuard are authoritative; this never re-implements either.
 */
export function sendNvetChatMessage(accessToken: string, appointmentId: string, content: string) {
  return postJson<NvetChatMessage>(`/api/chat/${appointmentId}/messages`, accessToken, { content });
}
