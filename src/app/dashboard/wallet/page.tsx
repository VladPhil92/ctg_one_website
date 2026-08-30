'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  CircleDollarSign,
  ExternalLink,
  Link2,
  Radar,
  RefreshCw,
  ShieldCheck,
  WalletCards,
} from 'lucide-react';

import { Navbar } from '@/components/Navbar';
import { Container } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { formatCents } from '@/lib/format';
import {
  WALLET_OVERVIEW_VERSION,
  type WalletOverviewActivityItem,
  type WalletOverviewV2,
} from '@/lib/wallet/domain';

type WalletLoadState =
  | { status: 'idle' | 'loading'; data: null; error: null }
  | { status: 'ready'; data: WalletOverviewV2; error: null }
  | { status: 'error'; data: null; error: string };

const initialState: WalletLoadState = { status: 'idle', data: null, error: null };

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

function activityLabel(item: WalletOverviewActivityItem) {
  if (item.source === 'wallet_intent') return item.kind.replaceAll('_', ' ');
  if (item.kind === 'deposit') return 'Recarga de cuenta';
  return item.kind.replaceAll('_', ' ');
}

function activityAmount(item: WalletOverviewActivityItem) {
  if (item.amountCents === null) return '—';
  return formatCents(item.amountCents, item.currency || 'COP');
}

export default function WalletDashboardPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [state, setState] = useState<WalletLoadState>(initialState);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/iniciar-sesion?next=/dashboard/wallet');
    }
  }, [authLoading, isAuthenticated, router]);

  const loadOverview = async () => {
    setState({ status: 'loading', data: null, error: null });
    try {
      const response = await fetch('/api/wallet/overview', {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });

      if (response.status === 401) {
        router.replace('/iniciar-sesion?next=/dashboard/wallet');
        return;
      }

      if (!response.ok) {
        setState({ status: 'error', data: null, error: 'No fue posible sincronizar la billetera.' });
        return;
      }

      const payload: unknown = await response.json();
      if (!isWalletOverview(payload)) {
        setState({ status: 'error', data: null, error: 'La respuesta de la billetera no cumple el contrato canónico.' });
        return;
      }

      setState({ status: 'ready', data: payload, error: null });
    } catch {
      setState({ status: 'error', data: null, error: 'No fue posible conectar con CTG One Wallet.' });
    }
  };

  useEffect(() => {
    if (!authLoading && isAuthenticated && state.status === 'idle') {
      void loadOverview();
    }
    // loadOverview intentionally remains event-local; auth/state changes are the trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated, state.status]);

  const overview = state.status === 'ready' ? state.data : null;
  const primaryEvm = useMemo(
    () => overview?.identity?.status === 'verified'
      ? overview.externalAccounts.find(
          (account) =>
            account.chainFamily === 'evm' &&
            account.status === 'verified' &&
            account.isPrimary,
        ) ?? null
      : null,
    [overview],
  );
  const polygonPositions = overview?.blockchain?.positions ?? [];

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#030303] text-white">
        <div className="w-16 h-16 rounded-full border border-accent/50 flex items-center justify-center">
          <Radar className="text-accent animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030303] text-white">
      <Navbar />
      <main className="pt-24 pb-20">
        <Container>
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <button
                type="button"
                onClick={() => router.push('/dashboard')}
                className="inline-flex items-center gap-2 text-xs text-white/45 hover:text-white transition-colors mb-4"
              >
                <ArrowLeft size={14} /> Volver al Personal OS
              </button>
              <p className="text-[10px] tracking-[.24em] text-accent/70 font-semibold">CTG ONE / CANONICAL WALLET</p>
              <h1 className="font-semibold tracking-[-.04em] text-4xl sm:text-5xl mt-2">Una billetera. Varias autoridades.</h1>
              <p className="text-sm text-white/45 max-w-3xl mt-3 leading-6">
                COP se lee del ledger CTG One; los activos Polygon se leen de la cadena. Esta vista no mezcla ni reescribe esas fuentes de verdad.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadOverview()}
              disabled={state.status === 'loading'}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-white/10 bg-white/[.035] text-xs text-white/70 hover:border-accent/40 hover:text-white disabled:opacity-50"
            >
              <RefreshCw size={14} className={state.status === 'loading' ? 'animate-spin' : ''} /> Sincronizar
            </button>
          </div>

          {state.status === 'error' && (
            <div className="rounded-2xl border border-red-400/20 bg-red-400/[.06] p-5 mb-6">
              <p className="text-sm text-red-200">{state.error}</p>
            </div>
          )}

          <section className="grid lg:grid-cols-3 gap-4 mb-6">
            <article className="rounded-2xl border border-accent/25 bg-accent/[.055] p-5">
              <div className="flex items-center justify-between">
                <WalletCards size={18} className="text-accent" />
                <span className="text-[9px] tracking-[.18em] text-white/25">CTG LEDGER</span>
              </div>
              <p className="text-[10px] tracking-[.16em] text-white/35 uppercase mt-7">Saldo disponible</p>
              <p className="text-3xl font-semibold tracking-[-.035em] mt-2">
                {overview ? formatCents(overview.balance.availableBalanceCents, overview.balance.currency) : '—'}
              </p>
              <p className="text-[10px] text-white/30 mt-3">Autoridad: {overview?.balance.authority ?? 'sincronizando'}</p>
            </article>

            <article className="rounded-2xl border border-white/10 bg-white/[.025] p-5">
              <div className="flex items-center justify-between">
                <CircleDollarSign size={18} className="text-accent" />
                <span className="text-[9px] tracking-[.18em] text-white/25">POLYGON / 137</span>
              </div>
              <p className="text-[10px] tracking-[.16em] text-white/35 uppercase mt-7">Activos on-chain</p>
              <p className="text-3xl font-semibold tracking-[-.035em] mt-2">{overview ? polygonPositions.length : '—'}</p>
              <p className="text-[10px] text-white/30 mt-3">Estado: {overview?.blockchain?.status ?? 'sin enlace verificado'}</p>
            </article>

            <article className="rounded-2xl border border-white/10 bg-white/[.025] p-5">
              <div className="flex items-center justify-between">
                <Link2 size={18} className="text-accent" />
                <span className="text-[9px] tracking-[.18em] text-white/25">IDENTITY LINK</span>
              </div>
              <p className="text-[10px] tracking-[.16em] text-white/35 uppercase mt-7">Wallet EVM primaria</p>
              <p className="font-mono text-sm mt-3 break-all text-white/75">{primaryEvm?.address ?? 'Aún no vinculada'}</p>
              <p className="text-[10px] text-white/30 mt-3">Privy: {overview?.identity?.status ?? 'sin vínculo canónico'}</p>
            </article>
          </section>

          <section className="grid xl:grid-cols-[.9fr_1.1fr] gap-4 mb-6">
            <article className="rounded-2xl border border-white/10 bg-white/[.025] overflow-hidden">
              <header className="p-5 border-b border-white/[.07] flex items-center justify-between">
                <div>
                  <p className="text-[9px] tracking-[.2em] text-white/30">DIGITAL ASSETS</p>
                  <h2 className="text-xl font-semibold mt-1">Portfolio Polygon</h2>
                </div>
                <ShieldCheck size={18} className="text-accent" />
              </header>
              <div className="p-5">
                {state.status === 'loading' && <p className="text-sm text-white/35">Leyendo cadena...</p>}
                {overview && polygonPositions.length === 0 && (
                  <p className="text-sm text-white/35">No hay posiciones disponibles o la lectura blockchain está degradada.</p>
                )}
                <div className="space-y-2">
                  {polygonPositions.map((position) => (
                    <div key={`${position.assetKind}:${position.assetAddress ?? 'native'}`} className="flex items-center justify-between gap-4 rounded-xl border border-white/[.07] px-4 py-3">
                      <div>
                        <p className="font-medium">{position.symbol}</p>
                        <p className="text-[10px] text-white/30 mt-1">Autoridad: blockchain · Polygon</p>
                      </div>
                      <p className="font-mono text-sm text-accent">{position.formattedBalance}</p>
                    </div>
                  ))}
                </div>
              </div>
            </article>

            <article className="rounded-2xl border border-white/10 bg-white/[.025] overflow-hidden">
              <header className="p-5 border-b border-white/[.07] flex items-center justify-between">
                <div>
                  <p className="text-[9px] tracking-[.2em] text-white/30">UNIFIED HISTORY</p>
                  <h2 className="text-xl font-semibold mt-1">Actividad canónica</h2>
                </div>
                <Activity size={18} className="text-accent" />
              </header>
              <div className="p-5">
                {state.status === 'loading' && <p className="text-sm text-white/35">Sincronizando actividad...</p>}
                {overview && overview.activity.length === 0 && <p className="text-sm text-white/35">Aún no hay movimientos normalizados.</p>}
                <div className="space-y-1">
                  {overview?.activity.slice(0, 20).map((item) => (
                    <div key={`${item.source}:${item.id}`} className="grid grid-cols-[1fr_auto] gap-4 py-3 border-b border-white/[.06] last:border-0">
                      <div>
                        <p className="text-sm capitalize">{activityLabel(item)}</p>
                        <p className="text-[10px] text-white/30 mt-1">
                          {item.source} · {item.rail ?? 'internal'} · {item.status} · {new Date(item.occurredAt).toLocaleString('es-CO')}
                        </p>
                      </div>
                      <p className="font-mono text-xs text-accent self-center">{activityAmount(item)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          </section>

          <section className="grid sm:grid-cols-3 gap-3">
            <a href="/dashboard/depositos" className="rounded-xl border border-white/10 bg-white/[.025] p-4 hover:border-accent/35 transition-colors">
              <p className="text-sm font-medium">Añadir fondos</p>
              <p className="text-xs text-white/35 mt-1">Canales COP reconciliados</p>
              <ArrowRight size={14} className="text-accent mt-4" />
            </a>
            <a href="/dashboard/inversion" className="rounded-xl border border-white/10 bg-white/[.025] p-4 hover:border-accent/35 transition-colors">
              <p className="text-sm font-medium">Inversiones</p>
              <p className="text-xs text-white/35 mt-1">Ledger contractual independiente</p>
              <ArrowRight size={14} className="text-accent mt-4" />
            </a>
            <a href="/dashboard/kyc" className="rounded-xl border border-white/10 bg-white/[.025] p-4 hover:border-accent/35 transition-colors">
              <p className="text-sm font-medium">Identidad</p>
              <p className="text-xs text-white/35 mt-1">KYC y vínculo de wallet</p>
              <ExternalLink size={14} className="text-accent mt-4" />
            </a>
          </section>

          <p className="text-[10px] text-white/25 mt-6 leading-5">
            Esta fase es de lectura. CTG One Wallet no habilita envío, swap, retiro automático ni postings de journal desde esta pantalla. Las capacidades de movimiento permanecen fail-closed hasta su fase de intención, firma y reconciliación.
          </p>
        </Container>
      </main>
    </div>
  );
}
