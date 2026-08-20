import React from 'react';
import { redirect } from 'next/navigation';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { KycReviewQueue } from '@/components/admin/KycReviewQueue';
import { ServerPagination } from '@/components/admin/ServerPagination';
import { ADMIN_PAGE_SIZE, pageCount, pageRange, parsePageParam } from '@/lib/pagination';

type SearchParams = Promise<{ page?: string | string[] }>;

export default async function AdminKycPage({ searchParams }: { searchParams: SearchParams }) {
  if (!isSupabaseConfigured) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/iniciar-sesion?next=%2Fadmin%2Fkyc');

  const { page: rawPage } = await searchParams;
  const page = parsePageParam(rawPage);
  const { from, to } = pageRange(page, ADMIN_PAGE_SIZE);

  const { data: submissions, count, error: submissionsError } = await supabase
    .from('kyc_submissions')
    .select('id,user_id,status,created_at', { count: 'exact' })
    .eq('status', 'pending')
    .eq('intake_state', 'submitted')
    .order('created_at', { ascending: true })
    .order('id', { ascending: true })
    .range(from, to);

  if (submissionsError) {
    return (
      <div>
        <h1 className="mb-8 text-3xl font-outfit font-bold text-white">Revisión de KYC</h1>
        <div className="rounded-xl border border-red-500/30 bg-red-500/[.06] p-4 text-sm text-red-300">
          No se pudo cargar la cola KYC. Código: {submissionsError.code ?? 'unknown'}.
        </div>
      </div>
    );
  }

  const totalCount = count ?? 0;
  const totalPages = pageCount(totalCount, ADMIN_PAGE_SIZE);
  if (totalCount > 0 && page > totalPages) {
    redirect(totalPages === 1 ? '/admin/kyc' : `/admin/kyc?page=${totalPages}`);
  }

  const rows = submissions ?? [];
  const userIds = [...new Set(rows.map((row) => row.user_id))];
  const submissionIds = rows.map((row) => row.id);

  const [{ data: profiles, error: profilesError }, { data: documents, error: documentsError }] = await Promise.all([
    userIds.length
      ? supabase.from('profiles').select('id,email,full_name').in('id', userIds)
      : Promise.resolve({ data: [], error: null }),
    submissionIds.length
      ? supabase
          .from('kyc_documents')
          .select('id,submission_id,document_type,storage_path')
          .in('submission_id', submissionIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (profilesError || documentsError) {
    const code = profilesError?.code ?? documentsError?.code ?? 'unknown';
    return (
      <div>
        <h1 className="mb-8 text-3xl font-outfit font-bold text-white">Revisión de KYC</h1>
        <div className="rounded-xl border border-red-500/30 bg-red-500/[.06] p-4 text-sm text-red-300">
          Las solicitudes existen, pero no se pudieron cargar sus datos relacionados. Código: {code}.
        </div>
      </div>
    );
  }

  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const docsBySubmission = new Map<string, Array<{ id: string; document_type: string; storage_path: string }>>();
  for (const doc of documents ?? []) {
    const bucket = docsBySubmission.get(doc.submission_id) ?? [];
    bucket.push({ id: doc.id, document_type: doc.document_type, storage_path: doc.storage_path });
    docsBySubmission.set(doc.submission_id, bucket);
  }

  const withSignedUrls = await Promise.all(
    rows.map(async (submission) => {
      const signedDocuments = await Promise.all(
        (docsBySubmission.get(submission.id) ?? []).map(async (doc) => {
          const { data: signed, error: signedError } = await supabase.storage
            .from('kyc-documents')
            .createSignedUrl(doc.storage_path, 300);
          return { ...doc, signedUrl: signedError ? null : (signed?.signedUrl ?? null) };
        }),
      );

      const profile = profileById.get(submission.user_id) ?? null;
      return {
        ...submission,
        profiles: profile ? { email: profile.email, full_name: profile.full_name } : null,
        kyc_documents: signedDocuments,
      };
    }),
  );

  return (
    <div>
      <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-outfit font-bold text-white">Revisión de KYC</h1>
          <p className="mt-2 text-xs text-text-dim">Cola pendiente paginada · {totalCount} solicitudes finalizadas</p>
        </div>
      </div>
      <KycReviewQueue submissions={withSignedUrls as React.ComponentProps<typeof KycReviewQueue>['submissions']} />
      <ServerPagination
        basePath="/admin/kyc"
        page={page}
        pageSize={ADMIN_PAGE_SIZE}
        totalCount={totalCount}
      />
    </div>
  );
}
