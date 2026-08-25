'use client';

import { useEffect, useRef, useState } from 'react';
import type { NvetChatMessage } from '@/lib/nvetcareapp/chat';
import { nvetFetchWithRefresh } from './nvet-fetch';

const POLL_INTERVAL_MS = 4000;

function formatTime(value: string): string {
  return new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}

// Text messages only for this slice — REST + polling, not the WebSocket
// gateway (which authenticates with the same long-lived access token, not
// a separately-scoped one; ROADMAP.md Phase 5). Share-price, report, and
// delete are separate, not-yet-built capabilities.
export function ChatPanel({ appointmentId, currentUserId }: { appointmentId: string; currentUserId: string }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<NvetChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function loadMessages() {
    try {
      const res = await nvetFetchWithRefresh(`/api/nvetcareapp/chat/${appointmentId}/messages`);
      if (!res.ok) {
        setError('No se pudieron cargar los mensajes.');
        return;
      }
      setMessages(await res.json());
      setError(null);
    } catch {
      setError('No se pudo contactar el servicio.');
    }
  }

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    loadMessages().finally(() => setLoading(false));
    const interval = setInterval(loadMessages, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, appointmentId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  async function handleSend() {
    const content = input.trim();
    if (content.length < 1) return;
    setSending(true);
    setError(null);
    try {
      const res = await nvetFetchWithRefresh(`/api/nvetcareapp/chat/${appointmentId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.message ?? 'No se pudo enviar el mensaje.');
        return;
      }
      setInput('');
      await loadMessages();
    } catch {
      setError('No se pudo contactar el servicio.');
    } finally {
      setSending(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-[#0D1B2A]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5B6670] transition hover:bg-[#0D1B2A]/[0.03]"
      >
        Chat
      </button>
    );
  }

  return (
    <div className="mt-3 flex w-full flex-col rounded-lg border border-[#0D1B2A]/10 bg-[#F2F4F7]">
      <div className="flex items-center justify-between border-b border-[#0D1B2A]/10 px-3 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5B6670]">Chat</span>
        <button type="button" onClick={() => setOpen(false)} className="text-[11px] text-[#5B6670] hover:text-[#0D1B2A]">
          Cerrar
        </button>
      </div>
      <div ref={scrollRef} className="flex max-h-64 flex-col gap-2 overflow-y-auto px-3 py-2">
        {loading ? (
          <p className="text-xs text-[#5B6670]">Cargando...</p>
        ) : messages.length === 0 ? (
          <p className="text-xs text-[#5B6670]">Todavía no hay mensajes.</p>
        ) : (
          messages.map((msg) => {
            const mine = msg.senderId === currentUserId;
            return (
              <div key={msg.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-1.5 text-xs ${
                    mine ? 'bg-[#34B27A]/[0.12] text-[#0D1B2A]' : 'bg-white text-[#0D1B2A]'
                  }`}
                >
                  {msg.content}
                </div>
                <span className="mt-0.5 text-[10px] text-[#5B6670]">
                  {mine ? '' : `${msg.sender.firstName} · `}
                  {formatTime(msg.createdAt)}
                </span>
              </div>
            );
          })
        )}
      </div>
      <div className="flex items-center gap-2 border-t border-[#0D1B2A]/10 px-3 py-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !sending) handleSend();
          }}
          maxLength={2000}
          placeholder="Escribe un mensaje..."
          className="flex-1 rounded-lg border border-[#0D1B2A]/10 bg-white px-2 py-1 text-xs text-[#0D1B2A] placeholder:text-[#5B6670]"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={sending || input.trim().length < 1}
          className="rounded-full border border-[#34B27A]/25 bg-[#34B27A]/[0.06] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#34B27A] transition hover:bg-[#34B27A]/[0.12] disabled:opacity-60"
        >
          {sending ? '...' : 'Enviar'}
        </button>
      </div>
      {error && <span className="px-3 pb-2 text-[11px] text-[#B91C1C]">{error}</span>}
    </div>
  );
}
