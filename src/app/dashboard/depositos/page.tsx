'use client';

import Image from 'next/image';
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
  ...(BRE_B_CONFIGURED
    ? [{ value: 'bre_b_qr' as TransactionMethod, label: 'QR / Bre-B' }]
    : []),
  ...(BANK_TRANSFER_CONFIGURED
    ? [{ value: 'bank_transfer' as TransactionMethod, label: 'Transferencia' }]
    : []),
];

const DEFAULT_METHOD: TransactionMethod = BRE_B_CONFIGURED
  ? 'bre_b_qr'
  : 'bank_transfer';

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
      setError('Las recargas de Saldo CTG están temporalmente deshabilitadas.');
      return;
    }

    if (!isSupabaseConfigured || !userId) {
      setError('Las recargas no están disponibles todavía.');
      return;
    }

    if (method !== 'bank_transfer' && method !== 'bre_b_qr') {
      setError('Selecciona un canal COP habilitado.');
      return;
    }

    const amountCents = Math.round(Number(amount) * 100);
    if (!Number.isSafeInteger(amountCents) || amountCents <= 0) {
      setError('Ingresa un monto válido.');
      return;
    }

    const reference = externalReference.trim();
    if (reference.length < 4) {
      setError('Ingresa la referencia que aparece en el comprobante para evitar acreditaciones duplicadas.');
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
          'X-Wallet-Topup-Amount-Cents': String(amountCents),
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
        title="Recargar Saldo CTG"
        description="Registra un ingreso COP desde una superficie protegida del Personal OS."
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
              <p>Los datos bancarios permanecen ocultos mientras termina la configuración operativa. PSE y cripto continúan fuera de este primer rail de recarga COP.</p>
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
      title="Recargar Saldo CTG"
      description="Paga por Bre-B o transferencia y adjunta el comprobante. El saldo solo se acredita después de validar la operación bancaria."
      icon={<WalletCards size={20} />}
    >
      <div className="accountNotice">
        <ShieldCheck size={17} />
        <div>
          <strong>Saldo interno, conciliado contra pagos reales</strong>
          <p>El dinero se recibe en la cuenta bancaria indicada. CTG One registra un Saldo CTG asociado a tu usuario únicamente después de que Finanzas comprueba y concilia el pago. Subir un comprobante no acredita saldo por sí mismo.</p>
        </div>
      </div>

      {profile && profile.kyc_status !== 'verified' && (
        <div className="accountNotice warning">
          <ShieldCheck size={17} />
          <div>
            <strong>Verificación de identidad requerida</strong>
            <p>Debes completar KYC antes de registrar una recarga de Saldo CTG.</p>
            <Button href="/dashboard/kyc" variant="outline" size="sm" className="mt-3">Abrir Identity Layer</Button>
          </div>
        </div>
      )}

      {submitted && (
        <div className="accountNotice success" role="status" aria-live="polite">
          <CheckCircle2 size={17} />
          <div>
            <strong>Solicitud de recarga recibida</strong>
            <p>El comprobante quedó asociado a tu usuario y pendiente de validación bancaria. Cuando la operación sea verificada y conciliada, el Saldo CTG se actualizará en el dashboard y en Wallet V2.</p>
          </div>
        </div>
      )}

      {profile?.kyc_status === 'verified' && !submitted && (
        <section className="accountPanel">
          <div className="accountPanelHeader">
            <div>
              <p className="accountMicro">Manual COP top-up</p>
              <h2>Registrar una recarga</h2>
              <p>Realiza el pago, conserva la referencia bancaria y adjunta el comprobante desde esta misma sesión.</p>
            </div>
            <div className="accountNode"><CircleDollarSign size={17} /></div>
          </div>

          <form onSubmit={(event) => { event.preventDefault(); void handleSubmit(); }}>
            <div className="accountSegments" aria-label="Método de recarga">
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
              <span className="accountFieldLabel">Monto pagado (COP)</span>
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
                placeholder="Número o referencia que muestra tu banco"
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
              Enviar comprobante de recarga
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
      <p className="accountMicro mb-2"><QrCode size={11} /> Bancolombia / Bre-B</p>
      <p className="instructionTitle">Escanea el QR desde la app de tu banco</p>
      <div style={{ display: 'flex', justifyContent: 'center', margin: '16px 0' }}>
        <Image
          src={BRE_B_INSTRUCTIONS.qrImageUrl}
          alt="QR Bancolombia Bre-B para recargar Saldo CTG"
          width={360}
          height={360}
          unoptimized
          priority
          style={{ width: 'min(100%, 360px)', height: 'auto', background: '#fff', padding: 12, borderRadius: 12 }}
        />
      </div>
      <p>Destinatario: <strong>{BRE_B_INSTRUCTIONS.recipientLabel}</strong></p>
      <p>Llave: <span className="mono">{BRE_B_INSTRUCTIONS.key}</span></p>
      <p className="mt-2">Después de pagar, copia la referencia que muestra tu banco y sube el comprobante en este formulario.</p>
    </div>
  );
}
