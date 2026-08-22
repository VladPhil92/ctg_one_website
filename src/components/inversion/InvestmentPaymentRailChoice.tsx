'use client';

import React from 'react';
import {
  INVESTMENT_CRYPTO_CONFIGURED,
  INVESTMENT_CRYPTO_INSTRUCTIONS,
} from '@/lib/payment-instructions';
import { Coins, Landmark } from 'lucide-react';

export type InvestmentPaymentRail = 'bank_transfer' | 'crypto';

/**
 * Rendered only once a destination wallet is configured, so a deployment
 * without one keeps the single-rail Bancolombia checkout it has today.
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
  if (!INVESTMENT_CRYPTO_CONFIGURED) return null;

  return (
    <div className="grid grid-cols-2 gap-2 mb-5" role="group" aria-label="Medio de pago">
      <RailButton
        active={rail === 'bank_transfer'}
        disabled={disabled}
        onClick={() => onChange('bank_transfer')}
        icon={<Landmark size={14} />}
        label="Bancolombia"
      />
      <RailButton
        active={rail === 'crypto'}
        disabled={disabled}
        onClick={() => onChange('crypto')}
        icon={<Coins size={14} />}
        label="Cripto"
      />
    </div>
  );
}

export function InvestmentCryptoDestination({ amountLabel }: { amountLabel: string }) {
  return (
    <div className="rounded-xl border border-white/[.07] p-4 mb-4 text-xs text-text-muted leading-relaxed">
      <p>
        Transfiere el equivalente exacto a <strong className="text-white">{amountLabel}</strong> en{' '}
        <strong className="text-white">{INVESTMENT_CRYPTO_INSTRUCTIONS.asset}</strong> sobre la red{' '}
        <strong className="text-white">{INVESTMENT_CRYPTO_INSTRUCTIONS.network}</strong>.
      </p>
      <p className="mt-3 text-[10px] uppercase tracking-[.14em] text-text-dim">Dirección de destino</p>
      <p className="mt-1 font-mono text-[11px] text-white break-all">{INVESTMENT_CRYPTO_INSTRUCTIONS.address}</p>
      <p className="mt-3 text-[11px] text-amber-300/80">
        Envía únicamente {INVESTMENT_CRYPTO_INSTRUCTIONS.asset} por la red {INVESTMENT_CRYPTO_INSTRUCTIONS.network}.
        Un envío en otro activo o en otra red no se puede verificar ni devolver.
      </p>
      <p className="mt-3">
        Después de transferir, sube la evidencia con el hash de la transacción visible. Finance confirmará el
        movimiento en el explorador público de la red antes de activar la participación.
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
}: {
  active: boolean;
  disabled: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs transition-colors disabled:opacity-30 ${
        active
          ? 'border-accent/40 text-accent'
          : 'border-white/10 text-text-muted hover:text-white'
      }`}
      style={active ? { background: 'rgba(201,169,98,.07)' } : undefined}
    >
      {icon}
      {label}
    </button>
  );
}
