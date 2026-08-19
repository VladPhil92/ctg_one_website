'use client';

import React from 'react';
import { pageCount } from '@/lib/pagination';

type ClientPaginationProps = {
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
};

export function ClientPagination({
  page,
  pageSize,
  totalCount,
  onPageChange,
  disabled = false,
}: ClientPaginationProps) {
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
        <button
          type="button"
          disabled={disabled || page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="rounded-lg border border-white/[.08] px-3 py-2 text-[10px] uppercase tracking-[.12em] text-text-muted transition hover:border-accent/25 hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
        >
          Anterior
        </button>
        <button
          type="button"
          disabled={disabled || page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="rounded-lg border border-white/[.08] px-3 py-2 text-[10px] uppercase tracking-[.12em] text-text-muted transition hover:border-accent/25 hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
        >
          Siguiente
        </button>
      </div>
    </nav>
  );
}
