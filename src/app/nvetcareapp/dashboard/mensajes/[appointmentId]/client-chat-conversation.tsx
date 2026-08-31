'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, Send, ShieldCheck } from 'lucide-react';
import type { NvetChatMessage } from '@/lib/nvetcareapp/chat';
import { nvetFetchWithRefresh } from '../../nvet-fetch';

function formatMoment(value: string) {
  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/Bogota',
  }).format(new Date(value));
}

async function readError(response: Response, fallback: string) {
  try {
    const data = await response.json() as { message?: unknown };
    return typeof data.message === 'string' ? data.message : fallback;
  } catch {
    return fallback;
  }
}

export function ClientChatConversation({
  appointmentId,
  currentUserId,
  initialMessages,
  initialWritable,
}: {
  appointmentId: string;
  currentUserId: string;
  initialMessages: NvetChatMessage[];
  initialWritable: boolean;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [content, setContent] = useState('');
  const [writable, setWritable] = useState(initialWritable);
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unreadIds = useMemo(
    () => messages.filter((message) => message.senderId !== currentUserId && !message.readAt).map((message) => message.id),
    [currentUserId, messages],
  );

  const acknowledge = useCallback(async (messageIds: string[]) => {
    if (messageIds.length === 0) return;
    const response = await nvetFetchWithRefresh(`/api/nvetcareapp/client/chat/${appointmentId}/read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageIds: messageIds.slice(0, 100) }),
    });
    if (response.ok) {
      const readAt = new Date().toISOString();
      const acknowledged = new Set(messageIds);
      setMessages((current) => current.map((message) => acknowledged.has(message.id) ? { ...message, readAt } : message));
    }
  }, [appointmentId]);

  useEffect(() => {
    void acknowledge(unreadIds);
  }, [acknowledge, unreadIds]);

  async function refreshMessages() {
    setRefreshing(true);
    setError(null);
    try {
      const response = await nvetFetchWithRefresh(`/api/nvetcareapp/client/chat/${appointmentId}/messages`, { cache: 'no-store' });
      if (!response.ok) {
        setError(await readError(response, 'No se pudo actualizar la conversación.'));
        return;
      }
      const data = await response.json() as NvetChatMessage[];
      if (Array.isArray(data)) setMessages(data);
    } catch {
      setError('No se pudo actualizar la conversación.');
    } finally {
      setRefreshing(false);
    }
  }

  async function sendMessage() {
    const trimmed = content.trim();
    if (!trimmed || trimmed.length > 2000 || sending || !writable) return;
    setSending(true);
    setError(null);
    try {
      const response = await nvetFetchWithRefresh(`/api/nvetcareapp/client/chat/${appointmentId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: trimmed }),
      });
      if (!response.ok) {
        const message = await readError(response, 'No se pudo enviar el mensaje.');
        setError(message);
        if (response.status === 400 && message.toLowerCase().includes('confirmada')) setWritable(false);
        return;
      }
      const message = await response.json() as NvetChatMessage;
      setMessages((current) => [...current, message]);
      setContent('');
    } catch {
      setError('No se pudo confirmar si el mensaje llegó al servidor. Actualiza la conversación antes de reintentar.');
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-[#0D1B2A]/10 bg-white shadow-[0_1px_4px_rgba(13,27,42,0.05)]">
      <div className="flex items-center justify-between gap-3 border-b border-[#0D1B2A]/10 px-5 py-4">
        <div className="flex items-center gap-2 text-xs text-[#5B6670]">
          <ShieldCheck className="h-4 w-4 text-[#237754]" aria-hidden="true" />
          Conversación vinculada a la cita y disponible para soporte/arbitraje.
        </div>
        <button
          type="button"
          onClick={refreshMessages}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-lg border border-[#0D1B2A]/10 px-3 py-2 text-xs font-semibold text-[#0D1B2A] disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
          Actualizar
        </button>
      </div>

      <div className="max-h-[58vh] min-h-[320px] space-y-3 overflow-y-auto bg-[#F8F9FA] p-4 sm:p-5" aria-live="polite">
        {messages.length === 0 ? (
          <div className="flex min-h-[280px] items-center justify-center text-center text-sm text-[#5B6670]">
            Aún no hay mensajes. Puedes iniciar la conversación sobre esta cita.
          </div>
        ) : messages.map((message) => {
          const mine = message.senderId === currentUserId;
          return (
            <article key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[86%] rounded-2xl px-4 py-3 sm:max-w-[72%] ${mine ? 'bg-[#0D1B2A] text-white' : 'border border-[#0D1B2A]/10 bg-white text-[#0D1B2A]'}`}>
                {!mine && (
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#237754]">
                    {[message.sender.firstName, message.sender.lastName].filter(Boolean).join(' ') || 'Veterinario'}
                  </p>
                )}
                <p className="whitespace-pre-wrap break-words text-sm leading-6">{message.content}</p>
                <p className={`mt-1.5 text-[10px] ${mine ? 'text-white/60' : 'text-[#5B6670]'}`}>{formatMoment(message.createdAt)}</p>
              </div>
            </article>
          );
        })}
      </div>

      <div className="border-t border-[#0D1B2A]/10 p-4 sm:p-5">
        {error && <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700" role="alert">{error}</div>}
        {writable ? (
          <div className="flex items-end gap-3">
            <div className="min-w-0 flex-1">
              <label htmlFor="nvet-chat-message" className="sr-only">Mensaje</label>
              <textarea
                id="nvet-chat-message"
                value={content}
                onChange={(event) => setContent(event.target.value.slice(0, 2000))}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    void sendMessage();
                  }
                }}
                maxLength={2000}
                rows={2}
                placeholder="Escribe un mensaje sobre esta cita…"
                className="w-full resize-none rounded-xl border border-[#0D1B2A]/15 bg-white px-4 py-3 text-sm text-[#0D1B2A] outline-none focus:border-[#34B27A]"
              />
              <p className="mt-1 text-right text-[10px] text-[#5B6670]">{content.length}/2000</p>
            </div>
            <button
              type="button"
              onClick={sendMessage}
              disabled={sending || !content.trim()}
              className="mb-4 inline-flex h-11 items-center gap-2 rounded-xl bg-[#34B27A] px-4 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              {sending ? 'Enviando…' : 'Enviar'}
            </button>
          </div>
        ) : (
          <div className="rounded-xl border border-[#0D1B2A]/10 bg-[#F8F9FA] px-4 py-3 text-sm text-[#5B6670]">
            Esta conversación quedó en modo lectura porque la cita ya no está confirmada ni en curso.
          </div>
        )}
      </div>
    </section>
  );
}
