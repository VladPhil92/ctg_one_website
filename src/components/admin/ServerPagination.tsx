import React from 'react';
import { pageCount } from '@/lib/pagination';

type QueryValue = string | number | undefined;

type ServerPaginationProps = {
  basePath: string;
  page: number;
  pageSize: number;
  totalCount: number;
  pageParam?: string;
  query?: Record<string, QueryValue>;
};

function hrefForPage(
  basePath: string,
  pageParam: string,
  targetPage: number,
  query: Record<string, QueryValue>,
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && String(value).length > 0) params.set(key, String(value));
  }
  if (targetPage > 1) params.set(pageParam, String(targetPage));
  else params.delete(pageParam);
  const suffix = params.toString();
  return suffix ? `${basePath}?${suffix}` : basePath;
}

export function ServerPagination({
  basePath,
  page,
  pageSize,
  totalCount,
  pageParam = 'page',
  query = {},
}: ServerPaginationProps) {
  const totalPages = pageCount(totalCount, pageSize);
  if (totalCount <= pageSize && page === 1) return null;

  const firstRecord = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastRecord = Math.min(page * pageSize, totalCount);

  return (
    <nav
      className="mt-5 flex flex-col gap-3 rounded-xl border border-white/[.07] bg-white/[.015] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
      aria-label="Paginación"
    >
      <p className="text-[11px] text-text-dim">
        {firstRecord}–{lastRecord} de {totalCount} · página {page} de {totalPages}
      </p>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <a
            href={hrefForPage(basePath, pageParam, page - 1, query)}
            rel="prev"
            className="rounded-lg border border-white/[.08] px-3 py-2 text-[10px] uppercase tracking-[.12em] text-text-muted transition hover:border-accent/25 hover:text-accent"
          >
            Anterior
          </a>
        ) : (
          <span className="rounded-lg border border-white/[.04] px-3 py-2 text-[10px] uppercase tracking-[.12em] text-text-dim opacity-50">
            Anterior
          </span>
        )}
        {page < totalPages ? (
          <a
            href={hrefForPage(basePath, pageParam, page + 1, query)}
            rel="next"
            className="rounded-lg border border-white/[.08] px-3 py-2 text-[10px] uppercase tracking-[.12em] text-text-muted transition hover:border-accent/25 hover:text-accent"
          >
            Siguiente
          </a>
        ) : (
          <span className="rounded-lg border border-white/[.04] px-3 py-2 text-[10px] uppercase tracking-[.12em] text-text-dim opacity-50">
            Siguiente
          </span>
        )}
      </div>
    </nav>
  );
}
