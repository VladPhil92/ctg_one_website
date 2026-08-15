'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { Container } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { useLatestKycSubmission } from '@/hooks/useLatestKycSubmission';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';

const MAX_FILE_BYTES = 8 * 1024 * 1024;

export default function KycUploadPage() {
  const { userId, profile, isAuthenticated, isLoading: isAuthLoading, refreshProfile } = useAuth();
  const { submission, isLoading: isSubmissionLoading, refresh: refreshSubmission } = useLatestKycSubmission();
  const router = useRouter();
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.push('/iniciar-sesion');
    }
  }, [isAuthenticated, isAuthLoading, router]);

  const handleSubmit = async () => {
    setError(null);

    if (!isSupabaseConfigured || !userId) {
      setError('La verificación de identidad no está disponible todavía.');
      return;
    }
    if (!frontFile || !backFile) {
      setError('Sube ambas caras de tu cédula.');
      return;
    }
    if (frontFile.size > MAX_FILE_BYTES || backFile.size > MAX_FILE_BYTES) {
      setError('Cada archivo debe pesar menos de 8MB.');
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = createClient();

      const { data: newSubmission, error: submissionError } = await supabase
        .from('kyc_submissions')
        .insert({ user_id: userId })
        .select()
        .single();
      if (submissionError) throw submissionError;

      const uploads: Array<{ documentType: string; file: File }> = [
        { documentType: 'cedula_front', file: frontFile },
        { documentType: 'cedula_back', file: backFile },
      ];

      for (const { documentType, file } of uploads) {
        const path = `${userId}/${newSubmission.id}-${documentType}-${file.name}`;
        const { error: uploadError } = await supabase.storage.from('kyc-documents').upload(path, file);
        if (uploadError) throw uploadError;

        const { error: docError } = await supabase
          .from('kyc_documents')
          .insert({ submission_id: newSubmission.id, document_type: documentType, storage_path: path });
        if (docError) throw docError;
      }

      await Promise.all([refreshProfile(), refreshSubmission()]);
      setJustSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar tu verificación');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAuthLoading) return null;
  if (!isAuthenticated) return null;

  const kycStatus = profile?.kyc_status ?? 'not_submitted';
  const showForm = !justSubmitted && (kycStatus === 'not_submitted' || kycStatus === 'rejected');

  return (
    <div style={{ backgroundColor: 'var(--bg-primary)' }}>
      <Navbar />
      <div className="min-h-screen pt-24 pb-16">
        <Container size="small">
          <h1 className="text-3xl font-outfit font-bold text-white mb-2">Verificación de identidad</h1>
          <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>
            Necesitamos verificar tu identidad antes de que puedas recargar tu cuenta.
          </p>

          {kycStatus === 'verified' && (
            <StatusCard color="var(--success)" title="✓ Verificado">
              Tu identidad ya fue verificada. Puedes recargar tu cuenta cuando quieras.
            </StatusCard>
          )}

          {(kycStatus === 'pending' || justSubmitted) && (
            <StatusCard color="var(--accent)" title="En revisión">
              Ya recibimos tu documento. Un administrador lo revisará pronto.
            </StatusCard>
          )}

          {!isSubmissionLoading && kycStatus === 'rejected' && submission?.rejection_reason && (
            <div
              className="p-4 rounded-lg mb-6 text-sm"
              style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--error)', color: 'var(--error)' }}
            >
              Tu verificación anterior fue rechazada: {submission.rejection_reason}
            </div>
          )}

          {showForm && (
            <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
              <FileField label="Cédula — lado frontal" onChange={setFrontFile} />
              <FileField label="Cédula — lado posterior" onChange={setBackFile} />

              {error && <p className="text-sm mb-4" style={{ color: 'var(--error)' }}>{error}</p>}

              <Button onClick={handleSubmit} loading={isSubmitting} variant="primary" size="md">
                Enviar para revisión
              </Button>
            </form>
          )}
        </Container>
      </div>
    </div>
  );
}

function StatusCard({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div className="p-6 rounded-lg mb-6" style={{ backgroundColor: 'var(--bg-card)', border: `1px solid ${color}` }}>
      <p className="text-sm font-semibold mb-1" style={{ color }}>{title}</p>
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{children}</p>
    </div>
  );
}

function FileField({ label, onChange }: { label: string; onChange: (file: File | null) => void }) {
  return (
    <label className="block mb-5">
      <span className="block text-[11px] uppercase tracking-[0.15em] text-text-dim mb-2">{label}</span>
      <input
        type="file"
        accept="image/*,application/pdf"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        className="w-full text-sm text-white"
      />
    </label>
  );
}
