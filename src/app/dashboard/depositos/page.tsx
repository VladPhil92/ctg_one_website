'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  CircleDollarSign,
  Landmark,
  QrCode,
  ShieldCheck,
  UploadCloud,
  WalletCards,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { AccountSurface } from '@/components/dashboard/AccountSurface';
import { useAuth } from '@/contexts/AuthContext';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import {
  BANK_TRANSFER_CONFIGURED,
  BANK_TRANSFER_INSTRUCTIONS,
  BRE_B_CONFIGURED,
  BRE_B_INSTRUCTIONS,
  WALLET_MANUAL_COP_TOPUP_CONFIGURED,
} from '@/lib/payment-instructions';
import type { TransactionMethod } from '@/types/domain';

const MAX_FILE_BYTES = 8 * 1024 * 1024;

const METHODS: Array<{ value: TransactionMethod; label: string }> = [
  ...(BANK_TRANSFER_CONFIGURED
    ? [{ value: 'bank_transfer' as TransactionMethod, label: 'Transferencia' }]
    : []),
  ...(BRE_B_CONFIGURED
    ? [{ value: 'bre_b_qr' as TransactionMethod, label: 'QR / Bre-B' }]
    : []),
];

const DEFAULT_METHOD: TransactionMethod = BANK_TRANSFER_CONFIGURED
  ? 'bank_transfer'
  : 'bre_b_qr';

export default function DepositosPage() {
  const { userId, profile, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();

  const [method, setMethod] = useState<TransactionMethod>(DEFAULT_METHOD);
  const [amount, setAmount] = useState('');
  const [externalReference, setExternalReference] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.replace('/iniciar-sesion?next=/dashboard/depositos');
    }
  }, [isAuthenticated, isAuthLoading, router]);

  const handleSubmit = async () => {
    setError(null);

    if (!WALLET_MANUAL_COP_TOPUP_CONFIGURED) {
      setError('Las recargas COP están temporalmente deshabilitadas mientras configuramos Bancolombia/Bre-B.');
      return;
    }

    if (!isSupabaseConfigured || !userId) {
      setError('Los depósitos no están disponibles todavía.');
      return;
    }

    if (method !== 'bank_transfer' && method !== 'bre_b_qr') {
      setError('Selecciona un canal COP habilitado.');
      return;
    }

    const amountCop = Math.round(Number(amount) * 100);
    if (!Number.isSafeInteger(amountCop) || amountCop <= 0) {
      setError('Ingresa un monto válido.');
      return;
    }

    const reference = externalReference.trim();
    if (reference.length < 4) {
      setError('Ingresa la referencia de la transferencia para evitar acreditaciones duplicadas.');
      return;
    }

    if (!proofFile) {
      setError('Sube el comprobante de la transferencia.');
      return;
    }
    if (proofFile.size > MAX_FILE_BYTES) {
      setError('El comprobante debe pesar menos de 8MB.');
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(proofFile.type)) {
      setError('El comprobante debe ser JPG, PNG, WebP o PDF.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/wallet/deposits', {
        method: 'POST',
        headers: {
          'Content-Type': proofFile.type,
          'X-File-Name': encodeURIComponent(proofFile.name),
          'X-Payment-Rail': method,
          'X-Payment-Reference': reference,
          'X-Wallet-Topup-Amount-Cents': String(amountCop),
        },
        body: proofFile,
      });

      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? 'No se pudo registrar la solicitud de recarga');
      }

      setSubmitted(true);
      setProofFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar tu solicitud de recarga');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAuthLoading || !isAuthenticated) return null;

  if (!WALLET_MANUAL_COP_TOPUP_CONFIGURED) {
    return (
      <AccountSurface
        code="FIN-02"
        eyebrow="Cuenta & Capital"
        title="Recargar cuenta"
        description="Administra el ingreso de fondos desde una superficie protegida del Personal OS."
        icon={<WalletCards size={20} />}
      >
        <section className="accountPanel">
          <div className="accountPanelHeader">
            <div>
              <p className="accountMicro">COP payment rails</p>
              <h2>Bancolombia/Bre-B en configuración</h2>
              <p>No publicaremos instrucciones de pago hasta que al menos un canal COP haya sido verificado para producción.</p>
            </div>
            <div className="accountNode"><Landmark size={17} /></div>
          </div>
          <div className="accountNotice warning">
            <ShieldCheck size={17} />
            <div>
              <strong>Recargas temporalmente deshabilitadas</strong>
              <p>Los datos bancarios y la Llave Bre-B permanecen ocultos mientras termina la configuración operativa. PSE y cripto continúan fuera de este primer rail de recarga COP.</p>
            </div>
          </div>
          <Button href="/dashboard" variant="secondary" size="sm">Volver al panel</Button>
        </section>
      </AccountSurface>
    );
  }

  return (
    <AccountSurface
      code="FIN-02"
      eyebrow="Cuenta & Capital"
      title="Recargar cuenta"
      description="Registra una transferencia COP. La evidencia debe ser verificada y conciliada antes de que el saldo quede disponible."
      icon={<WalletCards size={20} />}
    >
      {profile && profile.kyc_status !== 'verified' && (
        <div className="accountNotice warning">
          <ShieldCheck size={17} />
          <div>
            <strong>Verificación de identidad requerida</strong>
            <p>Debes completar KYC antes de registrar una recarga en tu cuenta CTG One.</p>
            <Button href="/dashboard/kyc" variant="outline" size="sm" className="mt-3">Abrir Identity Layer</Button>
          </div>
        </div>
      )}

      {submitted && (
        <div className="accountNotice success" role="status" aria-live="polite">
          <CheckCircle2 size={17} />
          <div>
            <strong>Claim de recarga recibido</strong>
            <p>El comprobante quedó pendiente de verificación y conciliación independiente. Enviar la evidencia no acredita saldo por sí mismo.</p>
          </div>
        </div>
      )}

      {profile?.kyc_status === 'verified' && !submitted && (
        <section className="accountPanel">
          <div className="accountPanelHeader">
            <div>
              <p className="accountMicro">COP top-up claim</p>
              <h2>Registrar ingreso de fondos</h2>
              <p>Selecciona Bancolombia o Bre-B y adjunta la evidencia que Finanzas conciliará antes de acreditar el saldo.</p>
            </div>
            <div className="accountNode"><CircleDollarSign size={17} /></div>
          </div>

          <form onSubmit={(event) => { event.preventDefault(); void handleSubmit(); }}>
            <div className="accountSegments" aria-label="Método de depósito">
              {METHODS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setMethod(item.value)}
                  className={`accountSegment ${method === item.value ? 'active' : ''}`}
                  aria-pressed={method === item.value}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <MethodInstructions method={method} />

            <label className="accountField">
              <span className="accountFieldLabel">Monto (COP)</span>
              <input
                type="number"
                min="1"
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className="accountInput"
                placeholder="Ej. 500000"
                required
              />
            </label>

            <label className="accountField">
              <span className="accountFieldLabel">Referencia de la transferencia</span>
              <input
                type="text"
                value={externalReference}
                onChange={(event) => setExternalReference(event.target.value)}
                className="accountInput"
                autoComplete="off"
                minLength={4}
                maxLength={180}
                required
              />
            </label>

            <label className="accountField">
              <span className="accountFieldLabel">Comprobante</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={(event) => setProofFile(event.target.files?.[0] ?? null)}
                className="accountFile"
                required
              />
            </label>

            {error && <p className="accountError" role="alert">{error}</p>}

            <Button
              type="submit"
              loading={isSubmitting}
              variant="primary"
              size="md"
              icon={<UploadCloud size={16} />}
              iconPosition="left"
            >
              Enviar claim de recarga
            </Button>
          </form>
        </section>
      )}
    </AccountSurface>
  );
}

function MethodInstructions({ method }: { method: TransactionMethod }) {
  if (method === 'bank_transfer') {
    return (
      <div className="accountInstruction">
        <p className="accountMicro mb-2"><Landmark size={11} /> Transferencia bancaria</p>
        <p className="instructionTitle">{BANK_TRANSFER_INSTRUCTIONS.bankName} — {BANK_TRANSFER_INSTRUCTIONS.accountType}</p>
        <p>Cuenta: <span className="mono">{BANK_TRANSFER_INSTRUCTIONS.accountNumber}</span></p>
        <p>Titular: {BANK_TRANSFER_INSTRUCTIONS.accountHolder} — NIT {BANK_TRANSFER_INSTRUCTIONS.nit}</p>
      </div>
    );
  }

  return (
    <div className="accountInstruction">
      <p className="accountMicro mb-2"><QrCode size={11} /> Llave Bre-B</p>
      <p>Llave: <span className="mono">{BRE_B_INSTRUCTIONS.key}</span></p>
    </div>
  );
}
