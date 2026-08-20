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
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import {
  BANK_TRANSFER_INSTRUCTIONS,
  BRE_B_INSTRUCTIONS,
  CRYPTO_DEPOSIT_ADDRESSES,
  PAYMENT_INSTRUCTIONS_CONFIGURED,
} from '@/lib/payment-instructions';
import type { TransactionMethod } from '@/types/domain';

const MAX_FILE_BYTES = 8 * 1024 * 1024;

const METHODS: Array<{ value: TransactionMethod; label: string }> = [
  { value: 'bank_transfer', label: 'Transferencia' },
  { value: 'pse', label: 'PSE' },
  { value: 'bre_b_qr', label: 'QR / Bre-B' },
  { value: 'crypto', label: 'Cripto' },
];

export default function DepositosPage() {
  const { userId, profile, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();

  const [method, setMethod] = useState<TransactionMethod>('bank_transfer');
  const [amount, setAmount] = useState('');
  const [externalReference, setExternalReference] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [cryptoNetwork] = useState(CRYPTO_DEPOSIT_ADDRESSES[0]?.network ?? '');
  const [cryptoAsset] = useState(CRYPTO_DEPOSIT_ADDRESSES[0]?.asset ?? '');
  const [cryptoTxHash, setCryptoTxHash] = useState('');
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

    if (!PAYMENT_INSTRUCTIONS_CONFIGURED) {
      setError('Las recargas están temporalmente deshabilitadas mientras configuramos los canales de pago.');
      return;
    }

    if (!isSupabaseConfigured || !userId) {
      setError('Los depósitos no están disponibles todavía.');
      return;
    }

    const amountCop = Math.round(Number(amount) * 100);
    if (!amountCop || amountCop <= 0) {
      setError('Ingresa un monto válido.');
      return;
    }

    if (method === 'crypto') {
      if (!cryptoTxHash.trim()) {
        setError('Ingresa el hash de la transacción.');
        return;
      }
    } else {
      if (!proofFile) {
        setError('Sube el comprobante de la transferencia.');
        return;
      }
      if (proofFile.size > MAX_FILE_BYTES) {
        setError('El comprobante debe pesar menos de 8MB.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const supabase = createClient();

      let proofStoragePath: string | null = null;
      if (proofFile) {
        const path = `${userId}/${Date.now()}-${proofFile.name}`;
        const { error: uploadError } = await supabase.storage.from('payment-proofs').upload(path, proofFile);
        if (uploadError) throw uploadError;
        proofStoragePath = path;
      }

      const { error: insertError } = await supabase.from('transactions').insert({
        user_id: userId,
        type: 'deposit',
        method,
        amount_cents: amountCop,
        proof_storage_path: proofStoragePath,
        external_reference: method === 'crypto' ? null : externalReference.trim() || null,
        crypto_network: method === 'crypto' ? cryptoNetwork : null,
        crypto_asset: method === 'crypto' ? cryptoAsset : null,
        crypto_tx_hash: method === 'crypto' ? cryptoTxHash.trim() : null,
      });
      if (insertError) throw insertError;

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar tu solicitud de recarga');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAuthLoading || !isAuthenticated) return null;

  if (!PAYMENT_INSTRUCTIONS_CONFIGURED) {
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
              <p className="accountMicro">Payment rails</p>
              <h2>Canales en configuración</h2>
              <p>No publicaremos instrucciones de pago hasta que cada canal haya sido verificado para producción.</p>
            </div>
            <div className="accountNode"><Landmark size={17} /></div>
          </div>
          <div className="accountNotice warning">
            <ShieldCheck size={17} />
            <div>
              <strong>Recargas temporalmente deshabilitadas</strong>
              <p>Los datos bancarios, PSE, Llave Bre-B y direcciones de wallet permanecen ocultos mientras termina la configuración operativa.</p>
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
      description="Registra una transferencia o depósito y sigue el proceso de validación antes de que el saldo quede disponible."
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
            <strong>Solicitud enviada</strong>
            <p>Finanzas revisará la evidencia. El saldo se reflejará únicamente después de la aprobación.</p>
          </div>
        </div>
      )}

      {profile?.kyc_status === 'verified' && !submitted && (
        <section className="accountPanel">
          <div className="accountPanelHeader">
            <div>
              <p className="accountMicro">Deposit command</p>
              <h2>Registrar ingreso de fondos</h2>
              <p>Selecciona el canal utilizado y adjunta la evidencia necesaria para conciliación.</p>
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

            {method === 'crypto' ? (
              <label className="accountField">
                <span className="accountFieldLabel">Hash de la transacción</span>
                <input
                  type="text"
                  value={cryptoTxHash}
                  onChange={(event) => setCryptoTxHash(event.target.value)}
                  className="accountInput font-mono"
                  autoComplete="off"
                  required
                />
              </label>
            ) : (
              <>
                <label className="accountField">
                  <span className="accountFieldLabel">Referencia de la transferencia (opcional)</span>
                  <input
                    type="text"
                    value={externalReference}
                    onChange={(event) => setExternalReference(event.target.value)}
                    className="accountInput"
                    autoComplete="off"
                  />
                </label>
                <label className="accountField">
                  <span className="accountFieldLabel">Comprobante</span>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(event) => setProofFile(event.target.files?.[0] ?? null)}
                    className="accountFile"
                    required
                  />
                </label>
              </>
            )}

            {error && <p className="accountError" role="alert">{error}</p>}

            <Button
              type="submit"
              loading={isSubmitting}
              variant="primary"
              size="md"
              icon={<UploadCloud size={16} />}
              iconPosition="left"
            >
              Enviar solicitud
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

  if (method === 'pse') {
    return (
      <div className="accountInstruction">
        <p className="accountMicro mb-2"><CircleDollarSign size={11} /> PSE</p>
        <p>{BANK_TRANSFER_INSTRUCTIONS.bankName}. NIT {BANK_TRANSFER_INSTRUCTIONS.nit}.</p>
      </div>
    );
  }

  if (method === 'bre_b_qr') {
    return (
      <div className="accountInstruction">
        <p className="accountMicro mb-2"><QrCode size={11} /> Llave Bre-B</p>
        <p>Llave: <span className="mono">{BRE_B_INSTRUCTIONS.key}</span></p>
      </div>
    );
  }

  return (
    <div className="accountInstruction">
      <p className="accountMicro mb-2"><WalletCards size={11} /> Cripto</p>
      {CRYPTO_DEPOSIT_ADDRESSES.map((item) => (
        <p key={item.network} className="mono">{item.asset} ({item.network}): {item.address}</p>
      ))}
    </div>
  );
}
