import React from 'react';
import { redirect } from 'next/navigation';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { KycReviewQueue } from '@/components/admin/KycReviewQueue';

export default async function AdminKycPage() {
  if (!isSupabaseConfigured) redirect('/');

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/iniciar-sesion?next=%2Fadmin%2Fkyc');

  const { data: submissions, error: submissionsError } = await supabase
    .from('kyc_submissions')
    .select('id,user_id,status,created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (submissionsError) {
    return (
      <div>
        <h1 className="text-3xl font-outfit font-bold text-white mb-8">Revisión de KYC</h1>
        <div className="rounded-xl border border-red-500/30 bg-red-500/[.06] p-4 text-sm text-red-300">
          No se pudo cargar la cola KYC. Código: {submissionsError.code ?? 'unknown'}.
        </div>
      </div>
    );
  }

  const rows = submissions ?? [];
  const userIds = [...new Set(rows.map((row) => row.user_id))];
  const submissionIds = rows.map((row) => row.id);

  const [{ data: profiles, error: profilesError }, { data: documents, error: documentsError }] = await Promise.all([
    userIds.length
      ? supabase.from('profiles').select('id,email,full_name').in('id', userIds)
      : Promise.resolve({ data: [], error: null }),
    submissionIds.length
      ? supabase.from('kyc_documents').select('id,submission_id,document_type,storage_path').in('submission_id', submissionIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (profilesError || documentsError) {
    const code = profilesError?.code ?? documentsError?.code ?? 'unknown';
    return (
      <div>
        <h1 className="text-3xl font-outfit font-bold text-white mb-8">Revisión de KYC</h1>
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
        })
      );

      const profile = profileById.get(submission.user_id) ?? null;
      return {
        ...submission,
        profiles: profile ? { email: profile.email, full_name: profile.full_name } : null,
        kyc_documents: signedDocuments,
      };
    })
  );

  return (
    <div>
      <h1 className="text-3xl font-outfit font-bold text-white mb-8">Revisión de KYC</h1>
      <KycReviewQueue submissions={withSignedUrls as React.ComponentProps<typeof KycReviewQueue>['submissions']} />
    </div>
  );
}
