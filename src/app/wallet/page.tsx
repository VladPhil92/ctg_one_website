'use client';

import React from 'react';
import {
  ArrowUpRight,
  BadgeCheck,
  CircleDollarSign,
  Globe2,
  Landmark,
  Link2,
  LockKeyhole,
  ShieldCheck,
  Smartphone,
  WalletCards,
} from 'lucide-react';
import { PublicPageShell } from '@/components/PublicPageShell';
import { Container } from '@/components/ui';
import { useLanguage } from '@/contexts/LanguageContext';

const PWA_URL = 'https://ctg-one-wallet.vercel.app';

export default function WalletPage() {
  const { locale } = useLanguage();
  const es = locale === 'es';

  const principles = [
    {
      icon: Link2,
      title: es ? 'Una identidad canónica' : 'One canonical identity',
      text: es ? 'Tu cuenta CTG One es la identidad principal. La wallet se vincula a esa cuenta; no crea un segundo usuario financiero.' : 'Your CTG One account is the primary identity. The wallet links to that account instead of creating a second financial user.',
    },
    {
      icon: ShieldCheck,
      title: es ? 'Wallet legacy preservada' : 'Legacy wallet preserved',
      text: es ? 'Si ya tenías una wallet verificada, CTG One está diseñado para preservar su dirección y detener cualquier reemplazo silencioso ante un conflicto.' : 'If you already had a verified wallet, CTG One is designed to preserve its address and stop any silent replacement when a conflict is detected.',
    },
    {
      icon: Landmark,
      title: es ? 'Saldo CTG con autoridad propia' : 'CTG Balance with its own authority',
      text: es ? 'Los pesos se derivan del ledger CTG One. Los activos on-chain se leen desde blockchain. La interfaz unifica la experiencia sin mezclar las fuentes de verdad.' : 'COP derives from the CTG One ledger while on-chain assets derive from blockchain. The interface unifies the experience without mixing sources of truth.',
    },
  ];

  const capabilities = [
    {
      name: es ? 'Saldo CTG y actividad' : 'CTG Balance and activity',
      state: es ? 'Canónico' : 'Canonical',
      tone: 'border-emerald-400/20 bg-emerald-400/[0.05] text-emerald-300',
      text: es ? 'Lectura autenticada desde el modelo financiero de CTG One.' : 'Authenticated read model served by CTG One financial authority.',
    },
    {
      name: es ? 'Recargar Saldo CTG' : 'Top up CTG Balance',
      state: es ? 'Según capability' : 'Capability-driven',
      tone: 'border-[#c9a962]/25 bg-[#c9a962]/[0.055] text-[#d4b676]',
      text: es ? 'Se habilita solo con KYC y una acción de recarga publicada por CTG One.' : 'Enabled only with KYC and a top-up action published by CTG One.',
    },
    {
      name: es ? 'Recibir crypto' : 'Receive crypto',
      state: es ? 'Condicionado' : 'Conditional',
      tone: 'border-[#248cff]/20 bg-[#248cff]/[0.045] text-[#7db8ff]',
      text: es ? 'Requiere una dirección EVM primaria verificada y vinculada a la identidad CTG One.' : 'Requires a verified primary EVM address linked to CTG One identity.',
    },
    {
      name: es ? 'Enviar crypto' : 'Send crypto',
      state: es ? 'Canary controlado' : 'Controlled canary',
      tone: 'border-amber-300/20 bg-amber-300/[0.045] text-amber-200',
      text: es ? 'El envío público sigue cerrado; el canary usa guardrails, simulación y reconciliación server-side.' : 'Public send remains closed; the canary uses server-side guardrails, simulation and reconciliation.',
    },
    {
      name: 'Swap',
      state: es ? 'Solo cotización' : 'Quote only',
      tone: 'border-white/[0.10] bg-white/[0.025] text-white/60',
      text: es ? 'La pantalla puede estimar una ruta, pero no ejecuta ni modifica balances.' : 'The surface may estimate a route but does not execute or mutate balances.',
    },
    {
      name: es ? 'Retiro a banco / compra crypto' : 'Bank withdrawal / crypto purchase',
      state: es ? 'No habilitado' : 'Unavailable',
      tone: 'border-rose-300/15 bg-rose-300/[0.035] text-rose-200/80',
      text: es ? 'No se presentan como operaciones productivas hasta existir contratos canónicos de ejecución y conciliación.' : 'Not presented as production operations until canonical execution and reconciliation contracts exist.',
    },
  ];

  return (
    <PublicPageShell>
      <Container size="large">
        <section className="relative overflow-hidden rounded-[34px] border border-[#c9a962]/25 bg-[linear-gradient(135deg,#0b0b09_0%,#070a0e_58%,#040609_100%)] px-6 py-12 shadow-[0_40px_120px_rgba(0,0,0,.45)] sm:px-10 sm:py-16 md:px-14 md:py-20">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_16%,rgba(201,169,98,.15),transparent_30%),radial-gradient(circle_at_84%_22%,rgba(36,140,255,.11),transparent_28%)]" aria-hidden="true" />
          <div className="relative grid gap-12 lg:grid-cols-[1fr_.95fr] lg:items-center">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#c9a962]/25 bg-[#c9a962]/[0.055] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#d4b676]">
                <WalletCards size={14} /> CTG One Wallet
              </div>
              <h1 className="max-w-3xl font-outfit text-5xl font-semibold leading-[.94] tracking-[-0.055em] text-white sm:text-6xl md:text-7xl">
                {es ? 'Tu dinero y activos CTG One, en una sola wallet.' : 'Your CTG One money and assets, in one wallet.'}
              </h1>
              <p className="mt-7 max-w-2xl text-base leading-relaxed text-text-muted sm:text-lg">
                {es ? 'Accede desde la web o instala la app. Ambas superficies usan la misma cuenta CTG One, la misma relación de identidad y las mismas fuentes financieras canónicas.' : 'Access it on the web or install the app. Both surfaces use the same CTG One account, the same identity relationship and the same canonical financial sources.'}
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <a href="/dashboard/wallet" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#c9a962] px-6 text-xs font-semibold uppercase tracking-[0.1em] text-black transition-all hover:-translate-y-0.5 hover:bg-[#d4b676]">
                  {es ? 'Abrir Wallet Web' : 'Open Web Wallet'} <ArrowUpRight size={14} />
                </a>
                <a href="#app" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.025] px-6 text-xs font-semibold uppercase tracking-[0.1em] text-white transition-all hover:-translate-y-0.5 hover:border-[#c9a962]/35 hover:bg-white/[0.05]">
                  {es ? 'Instalar app' : 'Install app'} <Smartphone size={14} />
                </a>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-[520px]">
              <div className="absolute -inset-10 rounded-full bg-[radial-gradient(circle,rgba(201,169,98,.12),transparent_66%)] blur-3xl" aria-hidden="true" />
              <div className="relative overflow-hidden rounded-[30px] border border-white/[0.10] bg-[#070b10]/95 p-6 shadow-[0_40px_100px_rgba(0,0,0,.55)] backdrop-blur-xl">
                <div className="flex items-center justify-between border-b border-white/[0.07] pb-5">
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#d4b676]">CTG One / Wallet</p>
                    <p className="mt-2 font-outfit text-2xl font-semibold tracking-[-0.04em] text-white">{es ? 'Identidad financiera unificada' : 'Unified financial identity'}</p>
                    <p className="mt-2 text-[9px] uppercase tracking-[0.14em] text-text-dim">{es ? 'Vista conceptual de arquitectura' : 'Conceptual architecture view'}</p>
                  </div>
                  <BadgeCheck size={22} className="text-[#d4b676]" />
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-[#c9a962]/18 bg-[#c9a962]/[0.055] p-4">
                    <CircleDollarSign size={17} className="text-[#d4b676]" />
                    <p className="mt-6 text-[9px] uppercase tracking-[0.18em] text-white/30">Saldo CTG</p>
                    <p className="mt-2 text-lg font-semibold text-white">COP / CTG Ledger</p>
                  </div>
                  <div className="rounded-2xl border border-[#248cff]/15 bg-[#248cff]/[0.035] p-4">
                    <Globe2 size={17} className="text-[#7db8ff]" />
                    <p className="mt-6 text-[9px] uppercase tracking-[0.18em] text-white/30">Blockchain</p>
                    <p className="mt-2 text-lg font-semibold text-white">Polygon / EVM</p>
                  </div>
                </div>
                <div className="mt-4 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[9px] uppercase tracking-[0.18em] text-white/30">Account model</p>
                      <p className="mt-2 text-sm font-semibold text-white">1 CTG One user → 1 canonical wallet identity</p>
                    </div>
                    <LockKeyhole size={18} className="shrink-0 text-[#d4b676]" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-20">
          <div className="mb-9 max-w-3xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#d4b676]">{es ? 'Arquitectura de producto' : 'Product architecture'}</p>
            <h2 className="mt-4 font-outfit text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">{es ? 'Una experiencia; fuentes de verdad separadas.' : 'One experience; separate sources of truth.'}</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {principles.map(({ icon: Icon, title, text }) => (
              <article key={title} className="rounded-[24px] border border-white/[0.08] bg-white/[0.025] p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#c9a962]/20 bg-[#c9a962]/[0.05] text-[#d4b676]"><Icon size={18} /></div>
                <h3 className="mt-6 font-outfit text-xl font-semibold tracking-[-0.025em] text-white">{title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-text-muted">{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="pb-16 sm:pb-20">
          <div className="mb-8 max-w-3xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#d4b676]">{es ? 'Estado de capacidades' : 'Capability status'}</p>
            <h2 className="mt-4 font-outfit text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">{es ? 'La interfaz solo habilita lo que el backend puede certificar.' : 'The interface only enables what the backend can certify.'}</h2>
            <p className="mt-4 text-sm leading-relaxed text-text-muted">{es ? 'Las funciones financieras pueden estar habilitadas, controladas, ser solo informativas o permanecer cerradas. Una pantalla o un SDK no convierten una función en productiva.' : 'Financial functions may be enabled, controlled, informational only, or closed. A screen or SDK does not make a capability production-ready.'}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {capabilities.map((capability) => (
              <article key={capability.name} className="rounded-[22px] border border-white/[0.08] bg-white/[0.02] p-5">
                <span className={`inline-flex rounded-full border px-3 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] ${capability.tone}`}>{capability.state}</span>
                <h3 className="mt-4 font-outfit text-lg font-semibold text-white">{capability.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-muted">{capability.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="app" className="scroll-mt-32 pb-20 sm:pb-24">
          <div className="grid gap-5 lg:grid-cols-2">
            <article className="rounded-[28px] border border-white/[0.08] bg-white/[0.025] p-7 sm:p-8">
              <Globe2 size={22} className="text-[#d4b676]" />
              <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.17em] text-white/35">Web Wallet</p>
              <h2 className="mt-3 font-outfit text-3xl font-semibold tracking-[-0.04em] text-white">{es ? 'Integrada directamente en ctgone.com' : 'Integrated directly into ctgone.com'}</h2>
              <p className="mt-4 text-sm leading-relaxed text-text-muted">{es ? 'Si ya tienes sesión CTG One, entras a la Wallet con esa misma cuenta. Si no la tienes, el login conserva el destino y te devuelve a la Wallet.' : 'If you already have a CTG One session, you enter the Wallet with that same account. Otherwise, login preserves the destination and returns you to the Wallet.'}</p>
              <a href="/dashboard/wallet" className="mt-7 inline-flex min-h-11 items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-[#d4b676] hover:text-white">{es ? 'Abrir Wallet Web' : 'Open Web Wallet'} <ArrowUpRight size={14} /></a>
            </article>

            <article className="rounded-[28px] border border-white/[0.08] bg-white/[0.025] p-7 sm:p-8">
              <Smartphone size={22} className="text-[#7db8ff]" />
              <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.17em] text-white/35">App / PWA</p>
              <h2 className="mt-3 font-outfit text-3xl font-semibold tracking-[-0.04em] text-white">{es ? 'La misma wallet en tu dispositivo' : 'The same wallet on your device'}</h2>
              <p className="mt-4 text-sm leading-relaxed text-text-muted">{es ? 'La app es un cliente de la misma identidad CTG One y no debe crear un segundo ledger ni sustituir una wallet legacy ya verificada. Las capacidades operativas siguen las mismas reglas fail-closed del backend.' : 'The app is a client of the same CTG One identity and must not create a second ledger or replace an already verified legacy wallet. Operational capabilities follow the same fail-closed backend rules.'}</p>
              <a href={PWA_URL} target="_blank" rel="noreferrer" className="mt-7 inline-flex min-h-11 items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-[#7db8ff] hover:text-white">{es ? 'Abrir PWA' : 'Open PWA'} <ArrowUpRight size={14} /></a>
            </article>
          </div>

          <div className="mt-5 rounded-[26px] border border-[#c9a962]/18 bg-[#c9a962]/[0.035] p-6 sm:p-7">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="max-w-3xl">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#d4b676]">{es ? 'Recargar Saldo CTG' : 'Top up CTG Balance'}</p>
                <p className="mt-3 text-sm leading-relaxed text-text-muted">{es ? 'Las recargas COP pertenecen a la Wallet. El pago se registra como evidencia y el saldo solo cambia después de la verificación y conciliación correspondiente.' : 'COP top-ups belong to the Wallet. Payment is registered as evidence and the balance changes only after the corresponding verification and reconciliation.'}</p>
              </div>
              <a href="/dashboard/depositos" className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#c9a962] px-5 text-xs font-semibold uppercase tracking-[0.1em] text-black hover:bg-[#d4b676]">{es ? 'Recargar' : 'Top up'} <ArrowUpRight size={14} /></a>
            </div>
          </div>
        </section>
      </Container>
    </PublicPageShell>
  );
}
