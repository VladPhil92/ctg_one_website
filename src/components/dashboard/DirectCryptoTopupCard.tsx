'use client';

import React, { useEffect, useMemo, useState } from 'react';
import encodeQR from 'qr';
import { Check, Coins, Copy, RefreshCw, ShieldCheck, UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { WALLET_CRYPTO_DESTINATIONS, type WalletCryptoAsset } from '@/lib/wallet-crypto-topups';

const MAX_FILE_BYTES = 8 * 1024 * 1024;

type Quote = {
  quoteId: string;
  asset: WalletCryptoAsset;
  network: string;
  destinationAddress: string;
  amountCop: number;
  amountUsd: number;
  cryptoAmount: number;
  priceCop: number;
  priceUsd: number;
  displayCurrency: 'COP' | 'USD';
  marketFetchedAt: string;
  expiresAt: string;
};

type Submission = {
  claimId?: string;
  state?: string;
  confirmations?: number;
  warning?: string;
  reason?: string;
  error?: string;
};

export function DirectCryptoTopupCard({ kycVerified }: { kycVerified: boolean }) {
  const first = WALLET_CRYPTO_DESTINATIONS[0];
  const [asset, setAsset] = useState<WalletCryptoAsset>(first?.asset ?? 'BTC');
  const [amountCop, setAmountCop] = useState('');
  const [displayCurrency, setDisplayCurrency] = useState<'COP' | 'USD'>('COP');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [txHash, setTxHash] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const destination = WALLET_CRYPTO_DESTINATIONS.find((item) => item.asset === asset) ?? first;
  const autoSettlementSupported = destination?.settlementBinding === 'claimant-specific-address';
  const qrDataUrl = useMemo(() => {
    if (!destination?.address) return '';
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(encodeQR(destination.address, 'svg'))}`;
  }, [destination]);

  useEffect(() => {
    setQuote(null);
    setSubmission(null);
  }, [asset, amountCop, displayCurrency]);

  useEffect(() => {
    const claimId = submission?.claimId;
    if (!claimId || !['submitted', 'confirming'].includes(submission?.state ?? '')) return;
    const timer = window.setInterval(async () => {
      try {
        const response = await fetch(`/api/wallet/crypto-topups/${claimId}`, { cache: 'no-store' });
        const payload = await response.json() as Submission;
        if (response.ok || response.status === 202) setSubmission((current) => ({ ...current, ...payload, claimId }));
      } catch { /* next interval retries */ }
    }, 15_000);
    return () => window.clearInterval(timer);
  }, [submission?.claimId, submission?.state]);

  const requestQuote = async () => {
    setError(null); setSubmission(null);
    const numericAmount = Number(amountCop);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) { setError('Ingresa un monto válido en COP.'); return; }
    setBusy(true);
    try {
      const response = await fetch('/api/wallet/crypto-quotes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asset, amountCop: numericAmount, displayCurrency }),
      });
      const payload = await response.json() as Quote & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? 'No se pudo obtener la cotización');
      setQuote(payload);
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo obtener la cotización'); }
    finally { setBusy(false); }
  };

  const submitPayment = async () => {
    setError(null);
    if (!quote) { setError('Genera una cotización antes de registrar el pago.'); return; }
    if (new Date(quote.expiresAt).getTime() <= Date.now()) { setError('La cotización expiró. Genera una nueva antes de pagar.'); return; }
    if (txHash.trim().length < 16) { setError('Ingresa el hash de la transacción.'); return; }
    if (!proofFile) { setError('Sube la captura o comprobante de la transacción.'); return; }
    if (proofFile.size > MAX_FILE_BYTES) { setError('El comprobante debe pesar menos de 8 MB.'); return; }
    if (!['image/jpeg','image/png','image/webp','application/pdf'].includes(proofFile.type)) { setError('El comprobante debe ser JPG, PNG, WebP o PDF.'); return; }
    setBusy(true);
    try {
      const response = await fetch('/api/wallet/crypto-topups', {
        method: 'POST',
        headers: {
          'Content-Type': proofFile.type,
          'X-File-Name': encodeURIComponent(proofFile.name),
          'X-Wallet-Crypto-Quote-Id': quote.quoteId,
          'X-Crypto-Tx-Hash': txHash.trim(),
        },
        body: proofFile,
      });
      const payload = await response.json() as Submission;
      if (!response.ok && response.status !== 202) throw new Error(payload.error ?? 'No se pudo registrar el pago');
      setSubmission(payload);
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo registrar el pago'); }
    finally { setBusy(false); }
  };

  if (!destination) return null;
  if (!kycVerified) return (
    <section className="accountPanel">
      <div className="accountNotice warning"><ShieldCheck size={17} /><div><strong>Pago directo en cripto</strong><p>Completa KYC para habilitar BTC, ETH, BNB y stablecoins como vía de recarga sin CTG Wallet.</p></div></div>
    </section>
  );

  const copyAddress = async () => {
    try { await navigator.clipboard.writeText(destination.address); setCopied(true); window.setTimeout(() => setCopied(false), 1600); } catch { setCopied(false); }
  };
  const confirmed = submission?.state === 'confirmed';

  return (
    <section className="accountPanel">
      <div className="accountPanelHeader">
        <div><p className="accountMicro">Pagos sin CTG Wallet</p><h2>Recargar con criptomonedas</h2><p>Compra Saldo CTG indicando primero el valor en COP. CTG One fija el equivalente cripto con una cotización de mercado y valida la transferencia on-chain antes de acreditar.</p></div>
        <div className="accountNode"><Coins size={17} /></div>
      </div>

      <div className="accountNotice"><ShieldCheck size={17} /><div><strong>La captura no acredita saldo</strong><p>{autoSettlementSupported ? 'El hash, activo, red, dirección, monto y confirmaciones deben coincidir con la operación real. El saldo se acredita automáticamente solo cuando la validación on-chain finaliza.' : 'El hash, activo, red, dirección, monto y confirmaciones deben coincidir con la operación real. Como la dirección de recepción actual es compartida, una operación validada on-chain pasa a conciliación antes de acreditar saldo.'}</p></div></div>

      <div className="accountSegments" aria-label="Criptomoneda">
        {WALLET_CRYPTO_DESTINATIONS.map((item) => <button key={item.asset} type="button" onClick={() => setAsset(item.asset)} className={`accountSegment ${asset === item.asset ? 'active' : ''}`}>{item.asset}</button>)}
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <label className="accountField"><span className="accountFieldLabel">Monto que deseas comprar (COP)</span><input className="accountInput" type="number" min="1" inputMode="decimal" value={amountCop} onChange={(e) => setAmountCop(e.target.value)} placeholder="Ej. 500000" /></label>
        <label className="accountField"><span className="accountFieldLabel">Mostrar equivalencia</span><select className="accountInput" value={displayCurrency} onChange={(e) => setDisplayCurrency(e.target.value as 'COP'|'USD')}><option value="COP">COP</option><option value="USD">USD</option></select></label>
      </div>
      <Button type="button" variant="secondary" size="sm" loading={busy && !quote} onClick={() => void requestQuote()} icon={<RefreshCw size={15} />}>Calcular equivalente</Button>

      {quote && (
        <div className="mt-4 accountInstruction">
          <p className="accountMicro mb-2">Cotización temporal</p>
          <p className="instructionTitle">Envía exactamente {quote.cryptoAmount} {quote.asset}</p>
          <p>Valor solicitado: <strong>{quote.amountCop.toLocaleString('es-CO')} COP</strong>{displayCurrency === 'USD' ? ` · ≈ USD ${quote.amountUsd.toFixed(2)}` : ''}</p>
          <p>Red obligatoria: <strong>{quote.network}</strong></p>
          <p>Cotización de mercado actualizada: {new Date(quote.marketFetchedAt).toLocaleString('es-CO')}</p>
          <p>Esta orden vence: {new Date(quote.expiresAt).toLocaleTimeString('es-CO')}</p>
          <div className="mt-4 grid gap-4 md:grid-cols-[180px_1fr] md:items-center">
            <div className="rounded-xl bg-white p-3">{qrDataUrl ? <img src={qrDataUrl} alt={`QR para recibir ${asset}`} className="block w-full" /> : null}</div>
            <div><p className="accountFieldLabel">Dirección de recepción</p><div className="flex items-start gap-2"><p className="mono break-all">{destination.address}</p><button type="button" onClick={copyAddress} className="shrink-0 rounded-lg border border-white/10 p-2" aria-label="Copiar dirección">{copied ? <Check size={14}/> : <Copy size={14}/>}</button></div><p className="mt-2 text-xs">{destination.exchange} · {destination.network}</p></div>
          </div>

          {!confirmed && <div className="mt-4 grid gap-3">
            <label className="accountField"><span className="accountFieldLabel">Hash de la transacción</span><input className="accountInput" value={txHash} onChange={(e) => setTxHash(e.target.value)} autoComplete="off" placeholder="TxID / 0x…" /></label>
            <label className="accountField"><span className="accountFieldLabel">Captura o comprobante</span><input className="accountFile" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => setProofFile(e.target.files?.[0] ?? null)} /></label>
            <Button type="button" variant="primary" size="md" loading={busy} onClick={() => void submitPayment()} icon={<UploadCloud size={16} />}>Registrar pago y validar</Button>
          </div>}
        </div>
      )}

      {submission && <div className={`accountNotice mt-4 ${confirmed ? 'success' : submission.state === 'rejected' ? 'warning' : ''}`}><Coins size={17}/><div><strong>{confirmed ? 'Recarga confirmada y saldo acreditado' : submission.state === 'confirming' ? 'Transferencia detectada, esperando confirmaciones' : submission.state === 'manual_review' ? 'Transferencia validada; pendiente de conciliación' : submission.state === 'rejected' ? 'La operación no pasó la validación' : 'Pago registrado'}</strong><p>{confirmed ? 'El crédito ya fue publicado en tu ledger COP.' : submission.reason ?? submission.warning ?? (submission.confirmations != null ? `Confirmaciones observadas: ${submission.confirmations}. CTG One volverá a consultar automáticamente mientras mantengas esta pantalla abierta.` : 'CTG One está verificando la operación on-chain.')}</p></div></div>}
      {error && <p className="accountError mt-3" role="alert">{error}</p>}
    </section>
  );
}
