'use client';

import React, { FormEvent, useState } from 'react';
import { BookOpen, Search, ShieldCheck } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

type Source = {
  citation: number;
  documentId: string;
  title: string;
  sourceUri: string | null;
  businessUnit: string;
  chunkIndex: number;
  similarity: number;
};

type QueryResult = {
  answer: string;
  grounded: boolean;
  requestId: string;
  sources: Source[];
};

export function KnowledgeConsole() {
  const { locale } = useLanguage();
  const es = locale === 'es';
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);

    try {
      const response = await fetch('/api/knowledge/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Query failed');
      setResult(payload as QueryResult);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Query failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="rounded-2xl border border-white/[0.06] bg-white/[0.012] p-5 sm:p-7">
        <div className="mb-5 flex items-center gap-3">
          <Search size={18} className="text-accent" />
          <div>
            <p className="font-outfit text-base text-white">{es ? 'Pregunta sobre conocimiento autorizado' : 'Ask authorized knowledge'}</p>
            <p className="mt-1 text-[11px] text-text-dim">{es ? 'Las respuestas deben apoyarse en documentos publicados.' : 'Answers should be grounded in published documents.'}</p>
          </div>
        </div>
        <textarea
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          minLength={3}
          maxLength={1000}
          required
          rows={5}
          placeholder={es ? 'Ej.: ¿Cuál es la política vigente para...?' : 'Example: What is the current policy for...?'}
          className="w-full resize-y rounded-xl border border-white/[0.07] bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-text-dim focus:border-accent/35"
        />
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 text-[10px] text-text-dim"><ShieldCheck size={13} /> {es ? 'Solo usuarios autenticados' : 'Authenticated users only'}</span>
          <button disabled={loading || question.trim().length < 3} className="rounded-full bg-accent px-5 py-2.5 text-[10px] font-medium uppercase tracking-[0.14em] text-black disabled:opacity-40">
            {loading ? (es ? 'Consultando…' : 'Querying…') : (es ? 'Consultar' : 'Ask')}
          </button>
        </div>
      </form>

      {error && <div className="rounded-xl border border-red-300/15 bg-red-300/[0.02] p-5 text-sm text-red-100/80">{error}</div>}

      {result && (
        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-accent/15 bg-accent/[0.02] p-6 sm:p-8">
            <div className="mb-5 flex items-center gap-3"><BookOpen size={18} className="text-accent" /><span className="text-[9px] uppercase tracking-[0.18em] text-accent">CTG Knowledge</span></div>
            <div className="whitespace-pre-wrap text-sm leading-7 text-text-muted">{result.answer}</div>
            <p className="mt-6 border-t border-white/[0.05] pt-4 font-mono text-[9px] text-text-dim">request · {result.requestId}</p>
          </div>
          <aside className="rounded-2xl border border-white/[0.06] bg-white/[0.01] p-5 sm:p-6">
            <h2 className="mb-5 font-outfit text-base text-white">{es ? 'Fuentes recuperadas' : 'Retrieved sources'}</h2>
            {result.sources.length ? <div className="space-y-3">{result.sources.map((source) => (
              <div key={`${source.documentId}-${source.chunkIndex}`} className="rounded-xl border border-white/[0.05] bg-black/15 p-4">
                <div className="mb-2 flex items-start justify-between gap-3"><span className="font-mono text-[10px] text-accent">[{source.citation}]</span><span className="text-[8px] uppercase tracking-[0.12em] text-text-dim">{Math.round(source.similarity * 100)}%</span></div>
                <p className="text-xs text-white">{source.title}</p>
                <p className="mt-2 text-[10px] text-text-dim">{source.businessUnit} · chunk {source.chunkIndex}</p>
                {source.sourceUri && <a href={source.sourceUri} target="_blank" rel="noreferrer" className="mt-3 inline-block text-[10px] text-accent hover:text-white">{es ? 'Abrir fuente' : 'Open source'}</a>}
              </div>
            ))}</div> : <p className="text-xs leading-relaxed text-text-dim">{es ? 'No se encontró evidencia suficiente.' : 'No sufficient evidence was found.'}</p>}
          </aside>
        </div>
      )}
    </div>
  );
}
