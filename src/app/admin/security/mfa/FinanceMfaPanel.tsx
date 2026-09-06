'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type TotpFactor = {
  id: string;
  friendly_name?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
};

type Enrollment = {
  factorId: string;
  qrCode: string;
  secret: string;
};

type Assurance = {
  currentLevel: string | null;
  nextLevel: string | null;
};

export function FinanceMfaPanel() {
  const supabase = useMemo(() => createClient(), []);
  const [factors, setFactors] = useState<TotpFactor[]>([]);
  const [assurance, setAssurance] = useState<Assurance>({ currentLevel: null, nextLevel: null });
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [factorResult, assuranceResult] = await Promise.all([
      supabase.auth.mfa.listFactors(),
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    ]);

    if (factorResult.error) throw factorResult.error;
    if (assuranceResult.error) throw assuranceResult.error;

    setFactors((factorResult.data?.totp ?? []) as TotpFactor[]);
    setAssurance({
      currentLevel: assuranceResult.data?.currentLevel ?? null,
      nextLevel: assuranceResult.data?.nextLevel ?? null,
    });
  }, [supabase]);

  useEffect(() => {
    void refresh().catch(() => setError('No fue posible consultar el estado MFA.'));
  }, [refresh]);

  const verifiedFactors = factors.filter((factor) => factor.status === 'verified');

  async function startEnrollment() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'CTG One Finance OS',
      });
      if (enrollError) throw enrollError;
      if (!data?.id || !data.totp?.qr_code || !data.totp.secret) {
        throw new Error('Incomplete TOTP enrollment response');
      }
      setEnrollment({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
      setCode('');
      setMessage('Escanea el QR y confirma un código de seis dígitos para terminar el enrolamiento.');
    } catch {
      setError('No fue posible iniciar el enrolamiento TOTP.');
    } finally {
      setBusy(false);
    }
  }

  async function verifyEnrollment() {
    if (!enrollment || !/^\d{6}$/.test(code)) {
      setError('Ingresa un código TOTP válido de seis dígitos.');
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
        factorId: enrollment.factorId,
        code,
      });
      if (verifyError) throw verifyError;
      setEnrollment(null);
      setCode('');
      await refresh();
      setMessage('MFA verificado. La sesión actual fue elevada a AAL2.');
    } catch {
      setError('El código no pudo verificarse. Genera un código nuevo e inténtalo otra vez.');
    } finally {
      setBusy(false);
    }
  }

  async function challengeFactor(factorId: string) {
    if (!/^\d{6}$/.test(code)) {
      setError('Ingresa el código actual de seis dígitos de tu autenticador.');
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const { error: challengeError } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
      if (challengeError) throw challengeError;
      setCode('');
      await refresh();
      setMessage('Desafío MFA superado. La sesión está en AAL2.');
    } catch {
      setError('No fue posible validar el desafío MFA.');
    } finally {
      setBusy(false);
    }
  }

  async function removeFactor(factorId: string) {
    if (assurance.currentLevel !== 'aal2') {
      setError('Debes elevar primero la sesión a AAL2 antes de retirar un factor verificado.');
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId });
      if (unenrollError) throw unenrollError;
      await refresh();
      setMessage('Factor MFA retirado.');
    } catch {
      setError('No fue posible retirar el factor MFA.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/[.08] bg-white/[.025] p-5">
          <p className="text-[9px] uppercase tracking-[.2em] text-text-dim">Nivel actual</p>
          <p className="mt-2 font-outfit text-2xl font-semibold text-white">{assurance.currentLevel ?? '—'}</p>
        </div>
        <div className="rounded-2xl border border-white/[.08] bg-white/[.025] p-5">
          <p className="text-[9px] uppercase tracking-[.2em] text-text-dim">Nivel disponible</p>
          <p className="mt-2 font-outfit text-2xl font-semibold text-white">{assurance.nextLevel ?? '—'}</p>
        </div>
      </div>

      {error && <div role="alert" className="rounded-2xl border border-red-400/20 bg-red-500/[.07] p-4 text-sm text-red-200">{error}</div>}
      {message && <div role="status" className="rounded-2xl border border-accent/20 bg-accent/[.06] p-4 text-sm text-white">{message}</div>}

      {enrollment ? (
        <div className="rounded-3xl border border-accent/20 bg-white/[.025] p-6 sm:p-8">
          <h2 className="font-outfit text-xl font-semibold text-white">Configura tu autenticador</h2>
          <p className="mt-2 text-sm text-text-dim">Escanea este QR con una app TOTP. Si no puedes escanearlo, usa la clave mostrada debajo.</p>
          <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-start">
            {/* Supabase returns a data-URI QR. Keeping it client-side avoids persisting the TOTP secret. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={enrollment.qrCode} alt="QR de enrolamiento TOTP" className="h-48 w-48 rounded-2xl bg-white p-3" />
            <div className="min-w-0 flex-1">
              <p className="text-[9px] uppercase tracking-[.18em] text-text-dim">Clave manual</p>
              <code className="mt-2 block break-all rounded-xl border border-white/[.08] bg-black/30 p-3 text-xs text-white">{enrollment.secret}</code>
              <label className="mt-5 block text-[9px] uppercase tracking-[.18em] text-text-dim" htmlFor="mfa-enrollment-code">Código de verificación</label>
              <input id="mfa-enrollment-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} className="mt-2 w-full rounded-xl border border-white/[.1] bg-black/30 px-4 py-3 text-white outline-none focus:border-accent/50" placeholder="000000" />
              <button type="button" disabled={busy} onClick={verifyEnrollment} className="mt-4 rounded-xl bg-accent px-4 py-3 text-xs font-semibold uppercase tracking-[.12em] text-black disabled:opacity-50">Verificar y activar MFA</button>
            </div>
          </div>
        </div>
      ) : verifiedFactors.length === 0 ? (
        <div className="rounded-3xl border border-white/[.08] bg-white/[.025] p-6 sm:p-8">
          <h2 className="font-outfit text-xl font-semibold text-white">Activa TOTP</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-text-dim">Al completar el enrolamiento, Finance OS exigirá una sesión AAL2 antes de ejecutar operaciones financieras privilegiadas.</p>
          <button type="button" disabled={busy} onClick={startEnrollment} className="mt-5 rounded-xl bg-accent px-4 py-3 text-xs font-semibold uppercase tracking-[.12em] text-black disabled:opacity-50">Configurar autenticador</button>
        </div>
      ) : (
        <div className="rounded-3xl border border-white/[.08] bg-white/[.025] p-6 sm:p-8">
          <h2 className="font-outfit text-xl font-semibold text-white">Factor TOTP verificado</h2>
          <p className="mt-2 text-sm text-text-dim">Si tu sesión está en AAL1, introduce el código actual para elevarla a AAL2 antes de operar en Finance OS.</p>
          <label className="mt-5 block text-[9px] uppercase tracking-[.18em] text-text-dim" htmlFor="mfa-challenge-code">Código actual</label>
          <input id="mfa-challenge-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} className="mt-2 w-full max-w-sm rounded-xl border border-white/[.1] bg-black/30 px-4 py-3 text-white outline-none focus:border-accent/50" placeholder="000000" />
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" disabled={busy || assurance.currentLevel === 'aal2'} onClick={() => challengeFactor(verifiedFactors[0].id)} className="rounded-xl bg-accent px-4 py-3 text-xs font-semibold uppercase tracking-[.12em] text-black disabled:opacity-50">Elevar a AAL2</button>
            <button type="button" disabled={busy} onClick={() => removeFactor(verifiedFactors[0].id)} className="rounded-xl border border-white/[.12] px-4 py-3 text-xs uppercase tracking-[.12em] text-text-dim transition hover:text-white disabled:opacity-50">Retirar factor</button>
          </div>
        </div>
      )}
    </div>
  );
}
