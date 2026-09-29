'use client';

import Image from 'next/image';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, CircleDollarSign, Landmark, QrCode, ShieldCheck, UploadCloud, WalletCards } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { AccountSurface } from '@/components/dashboard/AccountSurface';
import { WalletAccountContext } from '@/components/dashboard/WalletAccountContext';
import { DirectCryptoTopupCard } from '@/components/dashboard/DirectCryptoTopupCard';
import { useAuth } from '@/contexts/AuthContext';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import {
  BANK_TRANSFER_CONFIGURED, BANK_TRANSFER_INSTRUCTIONS,
  BRE_B_CONFIGURED, BRE_B_INSTRUCTIONS, WALLET_MANUAL_COP_TOPUP_CONFIGURED,
} from '@/lib/payment-instructions';
import type { TransactionMethod } from '@/types/domain';

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const METHODS: Array<{ value: TransactionMethod; label: string }> = [
  ...(BRE_B_CONFIGURED ? [{ value: 'bre_b_qr' as TransactionMethod, label: 'QR / Bre-B' }] : []),
  ...(BANK_TRANSFER_CONFIGURED ? [{ value: 'bank_transfer' as TransactionMethod, label: 'Transferencia' }] : []),
];
const DEFAULT_METHOD: TransactionMethod = BRE_B_CONFIGURED ? 'bre_b_qr' : 'bank_transfer';

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
    if (!isAuthLoading && !isAuthenticated) router.replace('/iniciar-sesion?next=/dashboard/depositos');
  }, [isAuthenticated, isAuthLoading, router]);

  const handleSubmit = async () => {
    setError(null);
    if (!WALLET_MANUAL_COP_TOPUP_CONFIGURED) { setError('Las recargas bancarias están temporalmente deshabilitadas.'); return; }
    if (!isSupabaseConfigured || !userId) { setError('Las recargas no están disponibles todavía.'); return; }
    if (method !== 'bank_transfer' && method !== 'bre_b_qr') { setError('Selecciona un canal COP habilitado.'); return; }
    const amountCents = Math.round(Number(amount) * 100);
    if (!Number.isSafeInteger(amountCents) || amountCents <= 0) { setError('Ingresa un monto válido.'); return; }
    const reference = externalReference.trim();
    if (reference.length < 4) { setError('Ingresa la referencia que aparece en el comprobante.'); return; }
    if (!proofFile) { setError('Sube el comprobante de la transferencia.'); return; }
    if (proofFile.size > MAX_FILE_BYTES) { setError('El comprobante debe pesar menos de 8MB.'); return; }
    if (!['image/jpeg','image/png','image/webp','application/pdf'].includes(proofFile.type)) { setError('El comprobante debe ser JPG, PNG, WebP o PDF.'); return; }

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
      if (!response.ok) throw new Error(payload?.error ?? 'No se pudo registrar la solicitud de recarga');
      setSubmitted(true); setProofFile(null);
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo enviar tu solicitud de recarga'); }
    finally { setIsSubmitting(false); }
  };

  if (isAuthLoading || !isAuthenticated) return null;
  const kycVerified = profile?.kyc_status === 'verified';

  return (
    <AccountSurface code="FIN-02" eyebrow="CTG One Wallet" title="Recargar Saldo CTG" description="Añade saldo por transferencia/Bre-B o paga directamente con criptomonedas sin utilizar CTG Wallet. Toda acreditación termina en el mismo ledger COP de tu cuenta." icon={<WalletCards size={20} />}>
      <WalletAccountContext />

      <div className="accountNotice">
        <ShieldCheck size={17} />
        <div><strong>Una sola fuente de saldo</strong><p>PSE, transferencias y criptomonedas no crean saldos paralelos. El Saldo CTG solo cambia cuando el ingreso correspondiente supera su validación y se publica en el ledger canónico.</p></div>
      </div>

      {profile && !kycVerified && (
        <div className="accountNotice warning"><ShieldCheck size={17} /><div><strong>Verificación de identidad requerida</strong><p>Debes completar KYC antes de registrar una recarga.</p><Button href="/dashboard/kyc" variant="outline" size="sm" className="mt-3">Abrir Identity Layer</Button></div></div>
      )}

      <DirectCryptoTopupCard kycVerified={kycVerified} />

      {WALLET_MANUAL_COP_TOPUP_CONFIGURED ? (
        <section className="accountPanel">
          <div className="accountPanelHeader">
            <div><p className="accountMicro">COP funding rail</p><h2>Transferencia / Bre-B</h2><p>La vía bancaria continúa disponible y conserva su proceso independiente de verificación y conciliación.</p></div>
            <div className="accountNode"><Landmark size={17} /></div>
          </div>

          {submitted && <div className="accountNotice success" role="status" aria-live="polite"><CheckCircle2 size={17}/><div><strong>Solicitud de recarga recibida</strong><p>El comprobante quedó asociado a tu usuario. Finanzas deberá verificar y conciliar el ingreso antes de acreditar el saldo.</p></div></div>}

          {kycVerified && !submitted && (
            <form onSubmit={(event) => { event.preventDefault(); void handleSubmit(); }}>
              <div className="accountSegments" aria-label="Método de recarga">
                {METHODS.map((item) => <button key={item.value} type="button" onClick={() => setMethod(item.value)} className={`accountSegment ${method === item.value ? 'active' : ''}`} aria-pressed={method === item.value}>{item.label}</button>)}
              </div>
              <MethodInstructions method={method} />
              <label className="accountField"><span className="accountFieldLabel">Monto pagado (COP)</span><input type="number" min="1" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className="accountInput" placeholder="Ej. 500000" required /></label>
              <label className="accountField"><span className="accountFieldLabel">Referencia de la transferencia</span><input type="text" value={externalReference} onChange={(e) => setExternalReference(e.target.value)} className="accountInput" autoComplete="off" minLength={4} maxLength={180} placeholder="Número o referencia que muestra tu banco" required /></label>
              <label className="accountField"><span className="accountFieldLabel">Comprobante</span><input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => setProofFile(e.target.files?.[0] ?? null)} className="accountFile" required /></label>
              {error && <p className="accountError" role="alert">{error}</p>}
              <Button type="submit" loading={isSubmitting} variant="primary" size="md" icon={<UploadCloud size={16} />} iconPosition="left">Enviar comprobante de recarga</Button>
            </form>
          )}
        </section>
      ) : (
        <section className="accountPanel">
          <div className="accountNotice warning"><Landmark size={17}/><div><strong>Canal bancario temporalmente cerrado</strong><p>Esta condición no bloquea la nueva opción “Pagos sin CTG Wallet”: las recargas cripto usan su propio trust boundary.</p></div></div>
        </section>
      )}
    </AccountSurface>
  );
}

function MethodInstructions({ method }: { method: TransactionMethod }) {
  if (method === 'bank_transfer') return <div className="accountInstruction"><p className="accountMicro mb-2"><Landmark size={11}/> Transferencia bancaria</p><p className="instructionTitle">{BANK_TRANSFER_INSTRUCTIONS.bankName} — {BANK_TRANSFER_INSTRUCTIONS.accountType}</p><p>Cuenta: <span className="mono">{BANK_TRANSFER_INSTRUCTIONS.accountNumber}</span></p><p>Titular: {BANK_TRANSFER_INSTRUCTIONS.accountHolder} — NIT {BANK_TRANSFER_INSTRUCTIONS.nit}</p></div>;
  return <div className="accountInstruction"><p className="accountMicro mb-2"><QrCode size={11}/> Bancolombia / Bre-B</p><p className="instructionTitle">Escanea el QR desde la app de tu banco</p><div className="my-4 flex justify-center"><Image src={BRE_B_INSTRUCTIONS.qrImageUrl} alt="QR Bancolombia Bre-B para recargar Saldo CTG" width={360} height={360} unoptimized priority className="h-auto w-full max-w-[360px] rounded-xl bg-white p-3" /></div><p>Destinatario: <strong>{BRE_B_INSTRUCTIONS.recipientLabel}</strong></p><p>Llave: <span className="mono">{BRE_B_INSTRUCTIONS.key}</span></p><p className="mt-2">Después de pagar, copia la referencia que muestra tu banco y sube el comprobante.</p></div>;
}
