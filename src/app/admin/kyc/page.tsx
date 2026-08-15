import React from 'react';
import { redirect } from 'next/navigation';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { KycReviewQueue } from '@/components/admin/KycReviewQueue';

export default async function AdminKycPage() {
  // See admin/page.tsx — each admin page re-checks this independently
  // since layout/page rendering can race.
  if (!isSupabaseConfigured) {
    redirect('/');
  }

  const supabase = await createClient();

  const { data: submissions } = await supabase
    .from('kyc_submissions')
    .select('id, user_id, status, created_at, profiles(email, full_name), kyc_documents(id, document_type, storage_path)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  const withSignedUrls = await Promise.all(
    (submissions ?? []).map(async (submission) => {
      const documents = await Promise.all(
        (submission.kyc_documents ?? []).map(async (doc: { id: string; document_type: string; storage_path: string }) => {
          const { data: signed } = await supabase.storage
            .from('kyc-documents')
            .createSignedUrl(doc.storage_path, 300);
          return { ...doc, signedUrl: signed?.signedUrl ?? null };
        })
      );
      return { ...submission, kyc_documents: documents };
    })
  );

  return (
    <div>
      <h1 className="text-3xl font-outfit font-bold text-white mb-8">Revisión de KYC</h1>
      <KycReviewQueue submissions={withSignedUrls as unknown as React.ComponentProps<typeof KycReviewQueue>['submissions']} />
    </div>
  );
}
