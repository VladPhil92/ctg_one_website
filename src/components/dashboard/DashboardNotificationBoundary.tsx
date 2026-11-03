'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState, type MouseEvent, type ReactNode } from 'react';
import { CheckCircle2, CircleAlert, Fingerprint, Link2, Network, RefreshCw, ShieldCheck } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import {
  WALLET_OVERVIEW_VERSION,
  type WalletOverviewV2,
} from '@/lib/wallet/domain';

type VerificationLoadState =
  | { status: 'loading'; data: null }
  | { status: 'ready'; data: WalletOverviewV2 }
  | { status: 'error'; data: null };

function isWalletOverview(value: unknown): value is WalletOverviewV2 {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<WalletOverviewV2>;
  return (
    candidate.version === WALLET_OVERVIEW_VERSION
    && !!candidate.user
    && !!candidate.balance
    && Array.isArray(candidate.activity)
    && Array.isArray(candidate.externalAccounts)
    && !!candidate.capabilities
  );
}

function shortenAddress(value: string) {
  if (value.length <= 16) return value;
  return `${value.slice(0, 8)}…${value.slice(-6)}`;
}

function StatusPill({
  label,
  value,
  verified,
  loading = false,
}: {
  label: string;
  value: string;
  verified: boolean;
  loading?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 py-2.5">
      <div className="flex min-w-0 items-center gap-2">
        {loading ? (
          <RefreshCw size={13} className="shrink-0 animate-spin text-white/35" />
        ) : verified ? (
          <CheckCircle2 size={13} className="shrink-0 text-emerald-300" />
        ) : (
          <CircleAlert size={13} className="shrink-0 text-amber-300" />
        )}
        <span className="truncate text-[9px] font-semibold uppercase tracking-[.12em] text-white/35">{label}</span>
      </div>
      <p className={`mt-1.5 truncate text-xs font-semibold ${verified ? 'text-white' : 'text-white/62'}`}>{value}</p>
    </div>
  );
}

function AccountVerificationConvergence() {
  const { profile } = useAuth();
  const [state, setState] = useState<VerificationLoadState>({ status: 'loading', data: null });

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
    () => overview?.identity?.status === 'verified'
      ? overview.externalAccounts.find(
          (account) => account.chainFamily === 'evm' && account.status === 'verified' && account.isPrimary,
        ) ?? null
      : null,
    [overview],
  );

  const kycVerified = profile?.kyc_status === 'verified';
  const identityVerified = overview?.identity?.status === 'verified';
  const walletVerified = Boolean(identityVerified && primaryEvm);
  const legacyPreserved = Boolean(primaryEvm?.legacyPreserved);
  const polygonAvailable = overview?.blockchain?.status === 'available';
  const allVerified = Boolean(kycVerified && walletVerified && polygonAvailable);
  const loading = state.status === 'loading';

  return (
    <section className="border-b border-white/[0.07] bg-[#080a0c] lg:pl-[248px]" aria-label="Estado canónico de cuenta">
      <div className="mx-auto max-w-[1560px] px-4 py-3 sm:px-6 xl:px-8">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="min-w-0 xl:w-[250px] xl:shrink-0">
            <div className="flex items-center gap-2">
              <ShieldCheck size={15} className={allVerified ? 'text-emerald-300' : 'text-[#e3b653]'} />
              <p className="text-[9px] font-semibold uppercase tracking-[.18em] text-white/38">Cuenta CTG One</p>
            </div>
            <p className="mt-1 text-sm font-semibold text-white">
              {loading ? 'Verificando cuenta…' : allVerified ? 'Cuenta y Wallet verificadas' : 'Verificación parcial'}
            </p>
            <p className="mt-1 text-[10px] leading-4 text-white/34">
              Estado leído desde CTG One y Wallet Overview; no se infiere desde datos locales.
            </p>
          </div>

          <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <StatusPill
              label="Identidad"
              value={kycVerified ? 'KYC verificado' : 'KYC pendiente'}
              verified={kycVerified}
              loading={false}
            />
            <StatusPill
              label="Wallet"
              value={loading ? 'Sincronizando…' : walletVerified ? 'Privy vinculada' : state.status === 'error' ? 'No disponible' : 'Vinculación pendiente'}
              verified={walletVerified}
              loading={loading}
            />
            <StatusPill
              label="Custodia"
              value={loading ? 'Sincronizando…' : walletVerified ? (legacyPreserved ? 'Legacy preservada' : 'Canónica verificada') : 'Sin prueba canónica'}
              verified={walletVerified}
              loading={loading}
            />
            <StatusPill
              label="Polygon"
              value={loading ? 'Sincronizando…' : polygonAvailable ? 'Red disponible' : overview?.blockchain?.status ?? 'No disponible'}
              verified={polygonAvailable}
              loading={loading}
            />
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2 xl:justify-end">
            {primaryEvm ? (
              <span className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 font-mono text-[10px] text-white/55" title={primaryEvm.address}>
                <Link2 size={12} className="text-[#e3b653]" /> {shortenAddress(primaryEvm.address)}
              </span>
            ) : null}
            <Link href="/dashboard/wallet" className="inline-flex h-9 items-center gap-2 rounded-xl border border-[#e3b653]/25 bg-[#e3b653]/[0.07] px-3 text-[10px] font-semibold text-[#f0cb75] transition hover:border-[#e3b653]/45 hover:bg-[#e3b653]/[0.1]">
              <Network size={12} /> Wallet
            </Link>
            {!kycVerified ? (
              <Link href="/dashboard/kyc" className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/[0.08] px-3 text-[10px] font-semibold text-white/55 transition hover:border-white/15 hover:text-white">
                <Fingerprint size={12} /> KYC
              </Link>
            ) : null}
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="grid h-9 w-9 place-items-center rounded-xl border border-white/[0.08] text-white/38 transition hover:border-white/15 hover:text-white disabled:opacity-50"
              aria-label="Sincronizar estado de cuenta"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {state.status === 'error' ? (
          <p className="mt-2 text-[10px] text-amber-200/70">
            No fue posible leer Wallet Overview. El dashboard no asume una wallet verificada ni modifica saldos mientras la lectura está degradada.
          </p>
        ) : null}
      </div>
    </section>
  );
}

export default function DashboardNotificationBoundary({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const router = useRouter();

  function handleClickCapture(event: MouseEvent<HTMLDivElement>) {
    if (profile?.kyc_status === 'verified') return;

    const target = event.target;
    if (!(target instanceof Element)) return;

    const notificationLink = target.closest<HTMLAnchorElement>('a[href="#actividad"]');
    if (!notificationLink) return;

    event.preventDefault();
    event.stopPropagation();
    router.push('/dashboard/kyc');
  }

  return (
    <div onClickCapture={handleClickCapture}>
      <AccountVerificationConvergence />
      {children}
    </div>
  );
}
