'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  FileCheck2,
  Fingerprint,
  ScanFace,
  ShieldAlert,
  ShieldCheck,
  UploadCloud,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { AccountSurface } from '@/components/dashboard/AccountSurface';
import { useAuth } from '@/contexts/AuthContext';
import { useLatestKycSubmission } from '@/hooks/useLatestKycSubmission';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const REQUIRED_DOCUMENTS = ['cedula_front', 'cedula_back'] as const;
type RequiredDocument = (typeof REQUIRED_DOCUMENTS)[number];

function isAlreadyUploadedError(error: { message?: string; statusCode?: string } | null) {
  if (!error) return false;
  return error.statusCode === '409' || /already exists|duplicate/i.test(error.message ?? '');
}

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
      router.replace('/iniciar-sesion?next=/dashboard/kyc');
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
      const { data: submissionId, error: beginError } = await supabase.rpc('begin_kyc_submission');
      if (beginError) throw beginError;
      if (typeof submissionId !== 'string' || !submissionId) {
        throw new Error('No se pudo iniciar la presentación KYC.');
      }

      const uploads: Array<{ documentType: RequiredDocument; file: File }> = [
        { documentType: 'cedula_front', file: frontFile },
        { documentType: 'cedula_back', file: backFile },
      ];

      for (const { documentType, file } of uploads) {
        const path = `${userId}/${submissionId}/${documentType}`;
        const { error: uploadError } = await supabase.storage
          .from('kyc-documents')
          .upload(path, file, {
            cacheControl: '3600',
            contentType: file.type || undefined,
            upsert: false,
          });

        // A retry after a browser/network interruption may encounter an object
        // that was durably uploaded during the previous attempt. The path is
        // deterministic, so that object is the intended retry target.
        if (uploadError && !isAlreadyUploadedError(uploadError)) throw uploadError;

        const { error: registerError } = await supabase.rpc('register_kyc_document', {
          p_submission_id: submissionId,
          p_document_type: documentType,
          p_storage_path: path,
        });
        if (registerError) throw registerError;
      }

      const { error: finalizeError } = await supabase.rpc('finalize_kyc_submission', {
        p_submission_id: submissionId,
      });
      if (finalizeError) throw finalizeError;

      await Promise.all([refreshProfile(), refreshSubmission()]);
      setJustSubmitted(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? `${err.message}. Puedes volver a intentar: la presentación incompleta se reanudará sin duplicarse.`
          : 'No se pudo enviar tu verificación. Puedes volver a intentar sin crear una solicitud duplicada.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAuthLoading || !isAuthenticated) return null;

  const kycStatus = profile?.kyc_status ?? 'not_submitted';
  const showForm = !justSubmitted && (kycStatus === 'not_submitted' || kycStatus === 'rejected');

  return (
    <AccountSurface
      code="ID-04"
      eyebrow="Identity Layer"
      title="Verificación de identidad"
      description="Protege las capacidades financieras de tu cuenta mediante una validación documental vinculada a tu identidad CTG One."
      icon={<Fingerprint size={20} />}
    >
      {kycStatus === 'verified' && (
        <StatusNotice tone="success" icon={<CheckCircle2 size={17} />} title="Identidad verificada">
          Tu Identity Layer está validado. Ya puedes acceder a los flujos que requieren KYC.
        </StatusNotice>
      )}

      {(kycStatus === 'pending' || justSubmitted) && (
        <StatusNotice tone="warning" icon={<ShieldCheck size={17} />} title="Verificación en revisión">
          Recibimos tu documentación. Un administrador debe completar la revisión antes de habilitar las capacidades protegidas.
        </StatusNotice>
      )}

      {!isSubmissionLoading && kycStatus === 'rejected' && submission?.rejection_reason && (
        <StatusNotice tone="error" icon={<ShieldAlert size={17} />} title="Verificación requiere atención">
          {submission.rejection_reason}
        </StatusNotice>
      )}

      {showForm && (
        <section className="accountPanel">
          <div className="accountPanelHeader">
            <div>
              <p className="accountMicro">Document capture</p>
              <h2>Registrar documento</h2>
              <p>Adjunta ambas caras de tu cédula. Cada archivo debe ser una imagen o PDF de máximo 8 MB.</p>
            </div>
            <div className="accountNode"><ScanFace size={17} /></div>
          </div>

          <form onSubmit={(event) => { event.preventDefault(); void handleSubmit(); }}>
            <FileField
              label="Cédula — lado frontal"
              hint="Frente del documento, legible y completo"
              onChange={setFrontFile}
            />
            <FileField
              label="Cédula — lado posterior"
              hint="Reverso del documento, legible y completo"
              onChange={setBackFile}
            />

            {error && <p className="accountError" role="alert">{error}</p>}

            <div className="accountNotice mb-5">
              <FileCheck2 size={17} />
              <div>
                <strong>Documentos protegidos y reanudables</strong>
                <p>Los archivos usan rutas privadas determinísticas. Si la conexión se interrumpe, el siguiente intento reanuda la misma presentación y no crea duplicados.</p>
              </div>
            </div>

            <Button
              type="submit"
              loading={isSubmitting}
              variant="primary"
              size="md"
              icon={<UploadCloud size={16} />}
              iconPosition="left"
            >
              Enviar para revisión
            </Button>
          </form>
        </section>
      )}
    </AccountSurface>
  );
}

function StatusNotice({
  title,
  tone,
  icon,
  children,
}: {
  title: string;
  tone: 'success' | 'warning' | 'error';
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className={`accountNotice ${tone}`} aria-live="polite">
      {icon}
      <div>
        <strong>{title}</strong>
        <p>{children}</p>
      </div>
    </div>
  );
}

function FileField({
  label,
  hint,
  onChange,
}: {
  label: string;
  hint: string;
  onChange: (file: File | null) => void;
}) {
  return (
    <label className="accountField">
      <span className="accountFieldLabel">{label}</span>
      <input
        type="file"
        accept="image/*,application/pdf"
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
        className="accountFile"
        required
      />
      <span className="block mt-2 text-[10px] text-white/30">{hint}</span>
    </label>
  );
}
