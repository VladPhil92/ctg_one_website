import React from 'react';
import { redirect } from 'next/navigation';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { UsersTable } from '@/components/admin/UsersTable';
import { ServerPagination } from '@/components/admin/ServerPagination';
import { ADMIN_PAGE_SIZE, pageCount, pageRange, parsePageParam } from '@/lib/pagination';

type SearchParams = Promise<{ page?: string | string[] }>;

export default async function AdminUsersPage({ searchParams }: { searchParams: SearchParams }) {
  // See admin/page.tsx — each admin page re-checks this independently
  // since layout/page rendering can race.
  if (!isSupabaseConfigured) redirect('/');

  const { page: rawPage } = await searchParams;
  const page = parsePageParam(rawPage);
  const { from, to } = pageRange(page, ADMIN_PAGE_SIZE);
  const supabase = await createClient();

  const { data: profiles, count, error } = await supabase
    .from('profiles')
    .select(
      'id, email, full_name, role, kyc_status, created_at, wallets(balance_cents, currency)',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(from, to);

  if (error) {
    return (
      <div>
        <h1 className="mb-8 text-3xl font-outfit font-bold text-white">Usuarios</h1>
        <div className="rounded-xl border border-red-500/30 bg-red-500/[.06] p-4 text-sm text-red-300">
          No se pudo cargar el registro de usuarios. Código: {error.code ?? 'unknown'}.
        </div>
      </div>
    );
  }

  const totalCount = count ?? 0;
  const totalPages = pageCount(totalCount, ADMIN_PAGE_SIZE);
  if (totalCount > 0 && page > totalPages) {
    redirect(totalPages === 1 ? '/admin/usuarios' : `/admin/usuarios?page=${totalPages}`);
  }

  return (
    <div>
      <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-outfit font-bold text-white">Usuarios</h1>
          <p className="mt-2 text-xs text-text-dim">Consulta paginada · {totalCount} registros</p>
        </div>
      </div>
      <UsersTable users={profiles ?? []} />
      <ServerPagination
        basePath="/admin/usuarios"
        page={page}
        pageSize={ADMIN_PAGE_SIZE}
        totalCount={totalCount}
      />
    </div>
  );
}
