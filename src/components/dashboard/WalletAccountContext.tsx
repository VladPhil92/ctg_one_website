'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CircleDollarSign, Link2, RefreshCw, ShieldCheck, Smartphone, WalletCards } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatCents } from '@/lib/format';
import {
  WALLET_OVERVIEW_VERSION,
  type WalletOverviewV2,
} from '@/lib/wallet/domain';

type LoadState =
  | { status: 'loading'; data: null }
  | { status: 'ready'; data: WalletOverviewV2 }
  | { status: 'error'; data: null };

function isWalletOverview(value: unknown): value is WalletOverviewV2 {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<WalletOverviewV2>;
  return (
    candidate.version === WALLET_OVERVIEW_VERSION &&
    !!candidate.user &&
    !!candidate.balance &&
    Array.isArray(candidate.activity) &&
    Array.isArray(candidate.externalAccounts) &&
    !!candidate.capabilities
  );
}

function shortenAddress(value: string) {
  if (value.length < 15) return value;
  return `${value.slice(0, 7)}…${value.slice(-6)}`;
}

export function WalletAccountContext() {
  const [state, setState] = useState<LoadState>({ status: 'loading', data: null });

  const load = useCallback(async () => {
    setState({ status: 'loading', data: null });
    try {
      const response = await fetch('/api/wallet/overview', {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) {
        setState({ status: 'error', data: null });
        return;
      }
      const payload: unknown = await response.json();
      setState(isWalletOverview(payload) ? { status: 'ready', data: payload } : { status: 'error', data: null });
    } catch {
      setState({ status: 'error', data: null });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const overview = state.status === 'ready' ? state.data : null;
  const primaryEvm = useMemo(
    () => overview?.externalAccounts.find(
      (account) => account.chainFamily === 'evm' && account.status === 'verified' && account.isPrimary,
    ) ?? null,
    [overview],
  );

  const identityVerified = overview?.identity?.status === 'verified';
  const legacyPreserved = Boolean(primaryEvm?.legacyPreserved);

  return (
    <section className="accountPanel mb-4 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_88%_0%,rgba(36,140,255,.07),transparent_36%),radial-gradient(circle_at_10%_100%,rgba(201,169,98,.06),transparent_34%)]" aria-hidden="true" />
      <div className="relative">
        <div className="accountPanelHeader">
          <div>
            <p className="accountMicro"><WalletCards size={11} /> CTG One Wallet</p>
            <h2>Tu Wallet y tu cuenta son una sola identidad</h2>
            <p>Saldo CTG, wallet web y app usan el mismo usuario CTG One. Una wallet legacy verificada se preserva; nunca se sustituye silenciosamente.</p>
          </div>
          <div className="accountNode"><ShieldCheck size={17} /></div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-[#d6ae56]/18 bg-[#d6ae56]/[0.045] p-4">
            <div className="flex items-center justify-between gap-3">
              <CircleDollarSign size={16} className="text-accent" />
              <span className="text-[8px] uppercase tracking-[.16em] text-white/25">CTG LEDGER</span>
            </div>
            <p className="mt-5 text-[8px] uppercase tracking-[.16em] text-white/30">Saldo disponible</p>
            <p className="mt-2 font-outfit text-2xl font-semibold tracking-[-.035em] text-white">
              {overview ? formatCents(overview.balance.availableBalanceCents, overview.balance.currency) : '—'}
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
            <div className="flex items-center justify-between gap-3">
              <Link2 size={16} className="text-accent" />
              <span className="text-[8px] uppercase tracking-[.16em] text-white/25">IDENTITY LINK</span>
            </div>
            <p className="mt-5 text-[8px] uppercase tracking-[.16em] text-white/30">Estado</p>
            <p className="mt-2 text-sm font-semibold text-white">
              {state.status === 'loading' ? 'Sincronizando…' : identityVerified ? 'Wallet vinculada' : 'Vinculación pendiente'}
            </p>
            <p className="mt-2 text-[10px] leading-relaxed text-white/35">
              {identityVerified ? (legacyPreserved ? 'Wallet legacy preservada' : 'Identidad canónica verificada') : 'No se creará una wallet alternativa como fallback.'}
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
            <div className="flex items-center justify-between gap-3">
              <Smartphone size={16} className="text-accent" />
              <span className="text-[8px] uppercase tracking-[.16em] text-white/25">WEB + APP</span>
            </div>
            <p className="mt-5 text-[8px] uppercase tracking-[.16em] text-white/30">Wallet EVM primaria</p>
            <p className="mt-2 font-mono text-xs text-white/70">{primaryEvm ? shortenAddress(primaryEvm.address) : 'Aún no vinculada'}</p>
            <p className="mt-2 text-[10px] text-white/35">Misma relación canónica en ambas superficies.</p>
          </div>
        </div>

        {state.status === 'error' && (
          <div className="accountNotice warning mt-4 mb-0">
            <ShieldCheck size={17} />
            <div>
              <strong>No pudimos leer el resumen de Wallet</strong>
              <p>La recarga permanece separada de esta lectura. Puedes volver a sincronizar sin crear ni reemplazar ninguna wallet.</p>
            </div>
          </div>
        )}

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Button href="/dashboard/wallet" variant="primary" size="sm">Abrir Wallet Web</Button>
          <Button href="/wallet#app" variant="secondary" size="sm">Ver app</Button>
          <button type="button" onClick={() => void load()} disabled={state.status === 'loading'} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/[0.09] px-4 text-[10px] font-semibold uppercase tracking-[.1em] text-white/45 transition-colors hover:border-[#d6ae56]/25 hover:text-white disabled:opacity-50">
            <RefreshCw size={13} className={state.status === 'loading' ? 'animate-spin' : ''} /> Sincronizar
          </button>
        </div>
      </div>
    </section>
  );
}
