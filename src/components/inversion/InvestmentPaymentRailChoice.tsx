'use client';

import React, { useMemo, useState } from 'react';
import encodeQR from 'qr';
import {
  INVESTMENT_CRYPTO_CONFIGURED,
  INVESTMENT_CRYPTO_DESTINATIONS,
  INVESTMENT_PSE_ENABLED,
  type InvestmentCryptoAsset,
} from '@/lib/payment-instructions';
import { Check, Coins, Copy, CreditCard, QrCode } from 'lucide-react';

export type InvestmentPaymentRail = 'bank_transfer' | 'crypto';

/**
 * Investment checkout keeps the backend trust boundary intentionally small:
 * PISAO QR maps to the existing manual bank-transfer rail, crypto maps to the
 * existing manual on-chain verification rail, and PSE remains visible but
 * disabled until a dedicated server-side provider integration exists.
 */
export function InvestmentPaymentRailChoice({
  rail,
  onChange,
  disabled = false,
}: {
  rail: InvestmentPaymentRail;
  onChange: (next: InvestmentPaymentRail) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset className="m-0 grid min-w-0 grid-cols-1 gap-2 p-0 mb-5 sm:grid-cols-3" aria-label="Medio de pago">
      <RailButton
        active={rail === 'bank_transfer'}
        disabled={disabled}
        onClick={() => onChange('bank_transfer')}
        icon={<QrCode size={15} />}
        label="QR PISAO"
        detail="Bancolombia"
        badge="Disponible"
      />
      <RailButton
        active={false}
        disabled={disabled || !INVESTMENT_PSE_ENABLED}
        icon={<CreditCard size={15} />}
        label="PSE"
        detail="Pago en línea"
        badge="Próximamente"
      />
      <RailButton
        active={rail === 'crypto'}
        disabled={disabled || !INVESTMENT_CRYPTO_CONFIGURED}
        onClick={() => onChange('crypto')}
        icon={<Coins size={15} />}
        label="Criptomonedas"
        detail="BTC · ETH · BNB · USDT"
        badge="Disponible"
      />
    </fieldset>
  );
}

export function InvestmentCryptoDestination({ amountLabel }: { amountLabel: string }) {
  const [asset, setAsset] = useState<InvestmentCryptoAsset>('USDT');
  const [copied, setCopied] = useState(false);
  const destination =
    INVESTMENT_CRYPTO_DESTINATIONS.find((item) => item.asset === asset) ??
    INVESTMENT_CRYPTO_DESTINATIONS[0];

  const qrDataUrl = useMemo(() => {
    if (!destination?.address) return '';
    const svg = encodeQR(destination.address, 'svg');
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }, [destination]);

  if (!destination) return null;

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(destination.address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/[.08] p-4 mb-4 text-xs text-text-muted leading-relaxed sm:p-5" style={{background:'rgba(0,0,0,.16)'}}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[9px] uppercase tracking-[.18em] text-accent">Pago con criptomonedas</p>
          <p className="mt-1 text-sm font-medium text-white">Elige el activo y respeta exactamente la red indicada</p>
        </div>
        <span className="w-fit rounded-full border border-white/10 px-2.5 py-1 text-[9px] uppercase tracking-[.12em] text-text-dim">Validación manual</span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Criptomoneda">
        {INVESTMENT_CRYPTO_DESTINATIONS.map((item) => {
          const active = item.asset === destination.asset;
          return (
            <button
              key={item.asset}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setAsset(item.asset)}
              className={`rounded-xl border px-3 py-3 text-left transition-colors ${
                active
                  ? 'border-accent/45 text-accent'
                  : 'border-white/10 text-text-muted hover:border-white/20 hover:text-white'
              }`}
              style={active ? { background: 'rgba(201,169,98,.075)' } : undefined}
            >
              <span className="block text-sm font-semibold">{item.asset}</span>
              <span className="mt-1 block text-[9px] leading-tight text-text-dim">{item.network}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 rounded-xl border border-accent/15 p-4" style={{background:'rgba(201,169,98,.035)'}}>
        <p>
          Monto de la orden: <strong className="text-white">{amountLabel}</strong>. Envía el equivalente en{' '}
          <strong className="text-white">{destination.asset}</strong> según la cotización de tu plataforma al momento del pago.
          La orden conserva su valor de referencia en COP hasta la verificación de Finance.
        </p>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-[190px_1fr] md:items-center">
        <div className="rounded-2xl bg-white p-3">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt={`QR de depósito ${destination.asset} en ${destination.exchange}`}
              className="mx-auto block aspect-square w-full max-w-[210px]"
            />
          ) : null}
        </div>

        <div className="min-w-0">
          <p className="text-[9px] uppercase tracking-[.16em] text-text-dim">Activo</p>
          <p className="mt-1 text-sm font-semibold text-white">{destination.asset} · {destination.name}</p>

          <p className="mt-3 text-[9px] uppercase tracking-[.16em] text-text-dim">Red obligatoria</p>
          <p className="mt-1 text-sm font-medium text-accent">{destination.network}</p>

          <p className="mt-3 text-[9px] uppercase tracking-[.16em] text-text-dim">Dirección de recepción · {destination.exchange}</p>
          <div className="mt-1 flex items-start gap-2">
            <p className="min-w-0 flex-1 break-all font-mono text-[11px] text-white">{destination.address}</p>
            <button
              type="button"
              onClick={copyAddress}
              className="shrink-0 rounded-lg border border-white/10 p-2 text-text-muted transition-colors hover:border-accent/30 hover:text-accent"
              aria-label={`Copiar dirección de ${destination.asset}`}
              title="Copiar dirección"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
          <p className="mt-1 min-h-4 text-[10px] text-accent" aria-live="polite">{copied ? 'Dirección copiada' : ''}</p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/[.035] p-3 text-[11px] text-amber-200/90">
        <strong>Importante:</strong> envía únicamente {destination.asset} por {destination.network}. Aunque varias redes puedan mostrar
        una dirección similar, seleccionar una red distinta puede causar pérdida irreversible de los fondos.
      </div>

      <p className="mt-4 text-[11px] text-text-dim">
        Después del envío, conserva el comprobante y el hash de la transacción. Súbelo en esta misma orden; la participación
        solo se activa después de la verificación humana del abono.
      </p>
    </div>
  );
}

function RailButton({
  active,
  disabled,
  onClick,
  icon,
  label,
  detail,
  badge,
}: {
  active: boolean;
  disabled: boolean;
  onClick?: () => void;
  icon: React.ReactNode;
  label: string;
  detail: string;
  badge: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-disabled={disabled}
      disabled={disabled}
      onClick={onClick}
      className={`min-h-[84px] rounded-xl border px-3 py-3 text-left transition-colors ${
        disabled
          ? 'cursor-not-allowed border-white/[.06] text-text-dim opacity-60'
          : active
            ? 'border-accent/40 text-accent'
            : 'border-white/10 text-text-muted hover:border-white/20 hover:text-white'
      }`}
      style={active && !disabled ? { background: 'rgba(201,169,98,.07)' } : undefined}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-xs font-medium">{icon}{label}</span>
        <span className="text-[8px] uppercase tracking-[.1em]">{badge}</span>
      </span>
      <span className="mt-2 block text-[9px] leading-tight text-text-dim">{detail}</span>
    </button>
  );
}
