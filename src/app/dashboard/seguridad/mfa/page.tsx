'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, KeyRound, LockKeyhole, QrCode, ShieldCheck } from 'lucide-react';
import { AccountSurface } from '@/components/dashboard/AccountSurface';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { safeRedirectPath } from '@/lib/security/safe-redirect';

const MFA_PATH = '/dashboard/seguridad/mfa';

type EnrollmentState = {
  factorId: string;
  qrCode: string;
  secret: string;
};

type Assurance = {
  currentLevel: 'aal1' | 'aal2';
  nextLevel: 'aal1' | 'aal2';
};

function normalizedQrSource(value: string) {
  const trimmed = value.trim();
  return trimmed.startsWith('<svg')
    ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(trimmed)}`
    : trimmed;
}

export default function MfaSecurityPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading } = useAuth();
  const nextPath = safeRedirectPath(searchParams.get('next'), '/dashboard');

  const [assurance, setAssurance] = useState<Assurance | null>(null);
  const [verifiedFactorId, setVerifiedFactorId] = useState<string | null>(null);
  const [enrollment, setEnrollment] = useState<EnrollmentState | null>(null);
  const [code, setCode] = useState('');
  const [loadingState, setLoadingState] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshState = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setError('La autenticación segura no está disponible en este momento.');
      setLoadingState(false);
      return;
    }

    const supabase = createClient();
    const [aalResult, factorsResult] = await Promise.all([
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
      supabase.auth.mfa.listFactors(),
    ]);

    if (aalResult.error || factorsResult.error || !aalResult.data) {
      setError('No fue posible verificar el estado de autenticación multifactor.');
      setLoadingState(false);
      return;
    }

    setAssurance({
      currentLevel: aalResult.data.currentLevel === 'aal2' ? 'aal2' : 'aal1',
      nextLevel: aalResult.data.nextLevel === 'aal2' ? 'aal2' : 'aal1',
    });
    const verifiedTotp = factorsResult.data.totp.find((factor) => factor.status === 'verified') ?? null;
    setVerifiedFactorId(verifiedTotp?.id ?? null);
    setError(null);
    setLoadingState(false);
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      const returnTo = `${MFA_PATH}?next=${encodeURIComponent(nextPath)}`;
      router.replace(`/iniciar-sesion?next=${encodeURIComponent(returnTo)}`);
      return;
    }
    void refreshState();
  }, [isAuthenticated, isLoading, nextPath, refreshState, router]);

  const startEnrollment = async () => {
    if (!isSupabaseConfigured || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'CTG One Finance',
      });
      if (enrollError) throw enrollError;
      setEnrollment({
        factorId: data.id,
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
      });
      setCode('');
    } catch {
      setError('No fue posible iniciar la configuración MFA. Intenta nuevamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const verify = async () => {
    if (!isSupabaseConfigured || submitting) return;
    const normalizedCode = code.replace(/\D/g, '').slice(0, 6);
    if (!/^\d{6}$/.test(normalizedCode)) {
      setError('Ingresa el código de 6 dígitos de tu aplicación autenticadora.');
      return;
    }

    const factorId = enrollment?.factorId ?? verifiedFactorId;
    if (!factorId) {
      setError('No existe un factor MFA listo para verificar.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code: normalizedCode,
      });
      if (verifyError) throw verifyError;

      const { data: aalData, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aalError || aalData?.currentLevel !== 'aal2') {
        throw new Error('AAL2_NOT_CONFIRMED');
      }

      setAssurance({ currentLevel: 'aal2', nextLevel: 'aal2' });
      setEnrollment(null);
      setCode('');
      router.replace(nextPath);
      router.refresh();
    } catch {
      setError('El código no pudo verificarse. Usa el código actual de tu autenticador e inténtalo otra vez.');
    } finally {
      setSubmitting(false);
    }
  };

  const qrSource = useMemo(
    () => enrollment?.qrCode ? normalizedQrSource(enrollment.qrCode) : null,
    [enrollment],
  );
  const aal2 = assurance?.currentLevel === 'aal2';
  const needsChallenge = !aal2 && !!verifiedFactorId;

  return (
    <AccountSurface
      code="SEC-05C"
      eyebrow="Identity Assurance"
      title="Autenticación multifactor"
      description="Protege las operaciones financieras críticas de CTG One con un segundo factor TOTP y una sesión AAL2 verificada por Supabase Auth."
      icon={<ShieldCheck size={22} />}
    >
      <section className="accountPanel">
        <div className="accountPanelHeader">
          <div>
            <p className="accountMicro">Finance OS · Step-up</p>
            <h2>Estado de seguridad</h2>
            <p>Las operaciones financieras mantienen fresh-auth y, cuando existe un factor enrolado, exigen AAL2.</p>
          </div>
          <div className="accountNode"><LockKeyhole size={18} /></div>
        </div>

        {loadingState || isLoading ? (
          <p className="text-sm text-text-dim">Verificando nivel de autenticación...</p>
        ) : error ? (
          <div className="accountNotice error" role="alert">
            <LockKeyhole size={17} />
            <div><strong>Verificación incompleta</strong><p>{error}</p></div>
          </div>
        ) : aal2 ? (
          <div className="accountNotice success">
            <CheckCircle2 size={17} />
            <div><strong>Sesión AAL2 verificada</strong><p>Tu sesión actual ya confirmó contraseña y segundo factor. Puedes continuar con la operación protegida.</p></div>
          </div>
        ) : needsChallenge ? (
          <div className="accountNotice warning">
            <KeyRound size={17} />
            <div><strong>Segundo factor requerido</strong><p>Abre tu aplicación autenticadora e ingresa el código TOTP actual para elevar esta sesión a AAL2.</p></div>
          </div>
        ) : (
          <div className="accountNotice warning">
            <ShieldCheck size={17} />
            <div><strong>MFA aún no configurado</strong><p>Configura un autenticador TOTP para que Finance OS exija un segundo factor en tus próximas operaciones críticas.</p></div>
          </div>
        )}

        {!loadingState && !aal2 && !needsChallenge && !enrollment && (
          <Button onClick={() => void startEnrollment()} loading={submitting} variant="primary" size="md">
            <QrCode size={15} /> Configurar autenticador
          </Button>
        )}

        {enrollment && (
          <div className="mt-5 grid gap-5 lg:grid-cols-[260px_1fr]">
            <div className="rounded-2xl bg-white p-3 w-fit">
              {qrSource ? <Image src={qrSource} alt="Código QR para configurar MFA" width={232} height={232} unoptimized /> : null}
            </div>
            <div>
              <p className="accountMicro">Configuración TOTP</p>
              <h3 className="mt-2 text-lg font-semibold text-white">Escanea el QR con tu autenticador</h3>
              <p className="mt-2 text-sm leading-relaxed text-text-muted">Si no puedes escanearlo, introduce manualmente esta clave. No la compartas ni la guardes en capturas públicas.</p>
              <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-3 font-mono text-xs text-white/70 break-all" aria-label="Clave secreta TOTP">
                {enrollment.secret}
              </div>
            </div>
          </div>
        )}

        {!loadingState && !aal2 && (needsChallenge || enrollment) && (
          <div className="mt-5 max-w-md">
            <label className="accountField">
              <span className="accountFieldLabel">Código de 6 dígitos</span>
              <input
                className="accountInput"
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="000000"
              />
            </label>
            <Button onClick={() => void verify()} loading={submitting} variant="primary" size="md">
              <KeyRound size={15} /> Verificar segundo factor
            </Button>
          </div>
        )}

        {aal2 && (
          <Button onClick={() => router.replace(nextPath)} variant="primary" size="md">
            Continuar
          </Button>
        )}
      </section>
    </AccountSurface>
  );
}
