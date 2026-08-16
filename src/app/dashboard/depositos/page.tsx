'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { Container } from '@/components/ui';
import { Button } from '@/components/ui/Button';
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
  { value: 'bank_transfer', label: 'Transferencia bancaria' },
  { value: 'pse', label: 'PSE' },
  { value: 'bre_b_qr', label: 'QR / Llave Bre-B' },
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
      router.push('/iniciar-sesion');
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
      <div style={{ backgroundColor: 'var(--bg-primary)' }}>
        <Navbar />
        <div className="min-h-screen pt-24 pb-16">
          <Container size="small">
            <h1 className="text-3xl font-outfit font-bold text-white mb-2">Recargar cuenta</h1>
            <div
              className="p-6 rounded-lg mt-8"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <p className="text-sm font-semibold text-white mb-2">Canales de pago en configuración</p>
              <p className="text-sm text-text-muted leading-relaxed mb-5">
                Las recargas están temporalmente deshabilitadas. No mostraremos datos bancarios,
                PSE, Llave Bre-B o direcciones de wallet hasta que hayan sido configurados y
                verificados para producción.
              </p>
              <Button href="/dashboard" variant="secondary" size="sm">Volver al panel</Button>
            </div>
          </Container>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: 'var(--bg-primary)' }}>
      <Navbar />
      <div className="min-h-screen pt-24 pb-16">
        <Container size="small">
          <h1 className="text-3xl font-outfit font-bold text-white mb-2">Recargar cuenta</h1>
          <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>
            Envía tu comprobante y un administrador revisará tu recarga.
          </p>

          {profile && profile.kyc_status !== 'verified' && (
            <div
              className="p-6 rounded-lg mb-6"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--accent)' }}
            >
              <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
                Necesitas verificar tu identidad antes de poder recargar tu cuenta.
              </p>
              <Button href="/dashboard/kyc" variant="primary" size="sm">Verificar identidad</Button>
            </div>
          )}

          {submitted && (
            <div className="p-6 rounded-lg mb-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--success)' }}>
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--success)' }}>Solicitud enviada</p>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Un administrador revisará tu recarga y se reflejará en tu saldo una vez aprobada.
              </p>
            </div>
          )}

          {profile?.kyc_status === 'verified' && !submitted && (
            <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
              <div className="flex flex-wrap gap-2 mb-6">
                {METHODS.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setMethod(m.value)}
                    className="px-4 py-2 rounded-lg text-xs uppercase tracking-[0.1em] transition-colors duration-300"
                    style={{
                      backgroundColor: method === m.value ? 'var(--accent)' : 'var(--bg-card)',
                      color: method === m.value ? '#050505' : 'var(--text-muted)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              <MethodInstructions method={method} />

              <label className="block mb-4">
                <span className="block text-[11px] uppercase tracking-[0.15em] text-text-dim mb-2">Monto (COP)</span>
                <input
                  type="number"
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg text-sm text-white outline-none"
                  style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
                />
              </label>

              {method === 'crypto' ? (
                <label className="block mb-4">
                  <span className="block text-[11px] uppercase tracking-[0.15em] text-text-dim mb-2">Hash de la transacción</span>
                  <input
                    type="text"
                    value={cryptoTxHash}
                    onChange={(e) => setCryptoTxHash(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg text-sm text-white outline-none font-mono"
                    style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
                  />
                </label>
              ) : (
                <>
                  <label className="block mb-4">
                    <span className="block text-[11px] uppercase tracking-[0.15em] text-text-dim mb-2">
                      Referencia de la transferencia (opcional)
                    </span>
                    <input
                      type="text"
                      value={externalReference}
                      onChange={(e) => setExternalReference(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg text-sm text-white outline-none"
                      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
                    />
                  </label>
                  <label className="block mb-4">
                    <span className="block text-[11px] uppercase tracking-[0.15em] text-text-dim mb-2">Comprobante</span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
                      className="w-full text-sm text-white"
                    />
                  </label>
                </>
              )}

              {error && <p className="text-sm mb-4" style={{ color: 'var(--error)' }}>{error}</p>}

              <Button onClick={handleSubmit} loading={isSubmitting} variant="primary" size="md">
                Enviar solicitud
              </Button>
            </form>
          )}
        </Container>
      </div>
    </div>
  );
}

function MethodInstructions({ method }: { method: TransactionMethod }) {
  const box = (children: React.ReactNode) => (
    <div className="p-4 rounded-lg mb-6 text-sm" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
      {children}
    </div>
  );

  if (method === 'bank_transfer') {
    return box(
      <>
        <p className="text-white mb-1">{BANK_TRANSFER_INSTRUCTIONS.bankName} — {BANK_TRANSFER_INSTRUCTIONS.accountType}</p>
        <p>Cuenta: {BANK_TRANSFER_INSTRUCTIONS.accountNumber}</p>
        <p>Titular: {BANK_TRANSFER_INSTRUCTIONS.accountHolder} — NIT {BANK_TRANSFER_INSTRUCTIONS.nit}</p>
      </>
    );
  }
  if (method === 'pse') {
    return box(<p>{BANK_TRANSFER_INSTRUCTIONS.bankName}. NIT {BANK_TRANSFER_INSTRUCTIONS.nit}.</p>);
  }
  if (method === 'bre_b_qr') {
    return box(<p>Llave Bre-B: {BRE_B_INSTRUCTIONS.key}</p>);
  }
  return box(
    <>
      {CRYPTO_DEPOSIT_ADDRESSES.map((c) => (
        <p key={c.network} className="font-mono">{c.asset} ({c.network}): {c.address}</p>
      ))}
    </>
  );
}
