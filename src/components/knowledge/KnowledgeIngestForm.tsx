'use client';

import React, { FormEvent, useState } from 'react';
import { FilePlus2, ShieldCheck } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export function KnowledgeIngestForm() {
  const { locale } = useLanguage();
  const es = locale === 'es';
  const [title, setTitle] = useState('');
  const [sourceUri, setSourceUri] = useState('');
  const [businessUnit, setBusinessUnit] = useState('ctg_one');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<'draft' | 'published'>('published');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch('/api/knowledge/admin/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, sourceUri, businessUnit, content, status }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Ingestion failed');
      setMessage(es ? `Documento ingerido: ${payload.chunkCount} fragmentos.` : `Document ingested: ${payload.chunkCount} chunks.`);
      setTitle('');
      setSourceUri('');
      setContent('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Ingestion failed');
    } finally {
      setLoading(false);
    }
  }

  const inputClass = 'w-full rounded-xl border border-white/[0.07] bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-text-dim focus:border-accent/35';

  return (
    <form onSubmit={submit} className="rounded-2xl border border-white/[0.06] bg-white/[0.012] p-6 sm:p-8">
      <div className="mb-7 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3"><FilePlus2 size={19} className="text-accent" /><div><h2 className="font-outfit text-lg text-white">{es ? 'Ingestar documento' : 'Ingest document'}</h2><p className="mt-1 text-[11px] text-text-dim">{es ? 'v0.1 admite texto curado de bajo riesgo.' : 'v0.1 accepts curated low-risk text.'}</p></div></div>
        <span className="inline-flex items-center gap-2 rounded-full border border-accent/20 px-3 py-1 text-[8px] uppercase tracking-[0.14em] text-accent"><ShieldCheck size={11} /> ADMIN</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-xs text-text-muted">{es ? 'Título' : 'Title'}<input className={`${inputClass} mt-2`} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={240} required /></label>
        <label className="text-xs text-text-muted">{es ? 'Unidad' : 'Business unit'}<input className={`${inputClass} mt-2`} value={businessUnit} onChange={(e) => setBusinessUnit(e.target.value)} maxLength={80} required /></label>
      </div>
      <label className="mt-4 block text-xs text-text-muted">{es ? 'URL de fuente (opcional)' : 'Source URL (optional)'}<input type="url" className={`${inputClass} mt-2`} value={sourceUri} onChange={(e) => setSourceUri(e.target.value)} /></label>
      <label className="mt-4 block text-xs text-text-muted">{es ? 'Contenido' : 'Content'}<textarea className={`${inputClass} mt-2 min-h-[320px] resize-y`} value={content} onChange={(e) => setContent(e.target.value)} minLength={40} maxLength={120000} required /></label>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <label className="text-xs text-text-muted">{es ? 'Estado' : 'Status'}<select className={`${inputClass} mt-2 min-w-[180px]`} value={status} onChange={(e) => setStatus(e.target.value as 'draft' | 'published')}><option value="published">published</option><option value="draft">draft</option></select></label>
        <button disabled={loading} className="rounded-full bg-accent px-5 py-2.5 text-[10px] font-medium uppercase tracking-[0.14em] text-black disabled:opacity-40">{loading ? (es ? 'Procesando…' : 'Processing…') : (es ? 'Ingestar' : 'Ingest')}</button>
      </div>
      {message && <p className="mt-5 rounded-xl border border-emerald-300/15 bg-emerald-300/[0.02] p-4 text-xs text-emerald-100/80">{message}</p>}
      {error && <p className="mt-5 rounded-xl border border-red-300/15 bg-red-300/[0.02] p-4 text-xs text-red-100/80">{error}</p>}
    </form>
  );
}
