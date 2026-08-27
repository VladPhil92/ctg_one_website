'use client';

import React from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Box,
  Check,
  CircleDashed,
  Coins,
  Database,
  FileText,
  Network,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { Container } from '@/components/ui';
import { FadeInSection } from '@/components/ui/FadeInSection';
import { useLanguage } from '@/contexts/LanguageContext';

const GOLD = '#d4a259';

export const CtgoTokenSection: React.FC = () => {
  const { locale } = useLanguage();
  const es = locale === 'es';

  const copy = es
    ? {
        eyebrow: 'CTGO · EN CONSOLIDACIÓN',
        title: 'CTGO',
        subtitle: 'Un token real, todavía en consolidación.',
        intro:
          'CTGO es la capa de utilidad cripto del ecosistema CTG One. Antes de cualquier apertura pública más amplia, estamos fortaleciendo liquidez, verificación del contrato, infraestructura de mercado y revisión de seguridad.',
        explore: 'Explorar el ecosistema',
        docs: 'Ver transparencia',
        noticeTitle: 'Este token está en consolidación.',
        noticeText:
          'La verificación, auditoría y documentación pública se ampliarán a medida que se completen las fases actuales.',
        glance: 'CTGO EN UN VISTAZO',
        glanceNote: 'Estado real. Sin hype.',
        facts: [
          { label: 'Blockchain', value: 'Polygon PoS', detail: 'Mainnet', icon: Network },
          { label: 'Chain ID', value: '137', detail: 'Polygon', icon: Box },
          { label: 'Símbolo', value: 'CTG', detail: 'CTGO', icon: Coins },
          { label: 'Decimales', value: '18', detail: 'ERC-20', icon: Database },
          { label: 'Oferta total', value: '15.98 B CTG', detail: 'On-chain', icon: Wallet },
        ],
        networkEyebrow: 'DÓNDE VIVE CTGO',
        networkTitle: 'En Polygon. Construido para escalar.',
        networkText:
          'CTGO está desplegado sobre Polygon PoS, una red blockchain eficiente y ampliamente compatible con el ecosistema EVM.',
        utilityEyebrow: 'POR QUÉ EXISTE CTGO',
        utilityTitle: 'Utilidad en el centro del ecosistema.',
        utilityText:
          'CTGO está diseñado para habilitar casos de uso reales dentro de CTG One. Las integraciones se activan por fases y no todas están disponibles hoy.',
        utilityNodes: ['Pagos', 'CTG Rewards', 'Trazabilidad', 'Reservas y experiencias'],
        live: 'ACTIVO / PARCIAL',
        roadmapLegend: 'ROADMAP',
        future: 'FUTURO',
        valueEyebrow: 'BALANCE DEL TOKEN ≠ VALOR FIAT',
        valueTitle: 'Por qué puedes no ver todavía un valor en USD.',
        valueText:
          'El balance que muestra tu wallet puede ser real aunque la valoración fiat no aparezca. Son capas distintas.',
        walletOwns: 'Tu wallet posee',
        tokenBalance: 'BALANCE CTG',
        onChain: 'On-chain',
        fiatValue: 'VALOR FIAT',
        external: 'Factores externos',
        factors: ['Liquidez', 'Mercado DEX', 'Metadata del token', 'Indexadores', 'Proveedores de precio'],
        roadmapEyebrow: 'ROADMAP DE CONSOLIDACIÓN',
        roadmapIntro: 'El camino hacia transparencia completa y una eventual disponibilidad pública responsable.',
        phases: [
          {
            label: 'Despliegue del contrato',
            status: 'Completada',
            description: 'El contrato de CTGO está desplegado en Polygon PoS.',
            done: true,
            inProgress: false,
          },
          {
            label: 'Fortalecimiento de liquidez',
            status: 'En curso',
            description: 'Construcción de fundamentos de liquidez e infraestructura de mercado.',
            done: false,
            inProgress: true,
          },
          {
            label: 'Verificación + auditoría',
            status: 'Pendiente',
            description: 'Verificación del contrato y revisión de seguridad antes de mayor exposición.',
            done: false,
            inProgress: false,
          },
          {
            label: 'Apertura pública',
            status: 'No programada',
            description: 'Disponibilidad pública únicamente después de completar los controles previos.',
            done: false,
            inProgress: false,
          },
        ],
        trustTitle: 'No aceleramos la confianza.',
        trustText: 'Cada fase se ejecuta con precisión, seguridad y transparencia.',
        transparencyEyebrow: 'TRANSPARENCIA ANTES QUE PROMOCIÓN',
        transparencyTitle: 'Seguridad y transparencia primero.',
        transparencyText:
          'La confianza se construye con información abierta, código verificable, documentación técnica y revisiones independientes.',
        infrastructureEyebrow: 'INFRAESTRUCTURA DE MERCADO',
        infrastructureTitle: 'Construyendo la capa de mercado.',
        infrastructureText:
          'Liquidez, metadata, indexación y proveedores de datos deben alinearse antes de una experiencia consistente en wallets y exploradores.',
        resourcesEyebrow: 'DOCUMENTACIÓN Y RECURSOS',
        resourcesTitle: 'Todo se publicará de forma verificable.',
        resourcesText:
          'Contratos, direcciones, auditorías y recursos oficiales se documentarán conforme avance la consolidación.',
        approach: 'Nuestro enfoque',
        pipeline: 'Ver el pipeline',
        resources: 'Ver fases',
        ctaTitle: 'Sé parte de una economía de utilidad real.',
        ctaText: 'CTG One está construyendo infraestructura tecnológica para casos de uso reales. CTGO forma parte de esa arquitectura.',
        ctaButton: 'Explorar CTG One',
      }
    : {
        eyebrow: 'CTGO · UNDER CONSOLIDATION',
        title: 'CTGO',
        subtitle: 'A real token, still under consolidation.',
        intro:
          'CTGO is the crypto utility layer of the CTG One ecosystem. Before any broader public rollout, we are strengthening liquidity, contract verification, market infrastructure, and security review.',
        explore: 'Explore the ecosystem',
        docs: 'View transparency',
        noticeTitle: 'This token is under consolidation.',
        noticeText:
          'Verification, audit, and public documentation will expand as the current phases are completed.',
        glance: 'CTGO AT A GLANCE',
        glanceNote: 'Real status. No hype.',
        facts: [
          { label: 'Blockchain', value: 'Polygon PoS', detail: 'Mainnet', icon: Network },
          { label: 'Chain ID', value: '137', detail: 'Polygon', icon: Box },
          { label: 'Symbol', value: 'CTG', detail: 'CTGO', icon: Coins },
          { label: 'Decimals', value: '18', detail: 'ERC-20', icon: Database },
          { label: 'Total supply', value: '15.98 B CTG', detail: 'On-chain', icon: Wallet },
        ],
        networkEyebrow: 'WHERE CTGO LIVES',
        networkTitle: 'On Polygon. Built for scale.',
        networkText:
          'CTGO is deployed on Polygon PoS, an efficient blockchain network broadly compatible with the EVM ecosystem.',
        utilityEyebrow: 'WHY CTGO EXISTS',
        utilityTitle: 'Utility at the core of the ecosystem.',
        utilityText:
          'CTGO is designed to enable real use cases across CTG One. Integrations are activated in phases and are not all available today.',
        utilityNodes: ['Payments', 'CTG Rewards', 'Traceability', 'Booking & experiences'],
        live: 'LIVE / PARTIAL',
        roadmapLegend: 'ROADMAP',
        future: 'FUTURE',
        valueEyebrow: 'TOKEN BALANCE ≠ FIAT VALUATION',
        valueTitle: 'Why you may not see a USD value yet.',
        valueText:
          'The token balance shown by your wallet can be real even when fiat valuation is unavailable. They are separate layers.',
        walletOwns: 'Your wallet owns',
        tokenBalance: 'CTG BALANCE',
        onChain: 'On-chain',
        fiatValue: 'FIAT VALUE',
        external: 'External factors',
        factors: ['Liquidity', 'DEX market', 'Token metadata', 'Indexers', 'Price providers'],
        roadmapEyebrow: 'CONSOLIDATION ROADMAP',
        roadmapIntro: 'The path toward full transparency and a responsible eventual public availability.',
        phases: [
          {
            label: 'Contract deployment',
            status: 'Completed',
            description: 'The CTGO contract is deployed on Polygon PoS.',
            done: true,
            inProgress: false,
          },
          {
            label: 'Liquidity strengthening',
            status: 'In progress',
            description: 'Building liquidity foundations and market infrastructure.',
            done: false,
            inProgress: true,
          },
          {
            label: 'Verification + audit',
            status: 'Pending',
            description: 'Contract verification and security review before broader exposure.',
            done: false,
            inProgress: false,
          },
          {
            label: 'Public rollout',
            status: 'Not scheduled',
            description: 'Public availability only after prior controls are completed.',
            done: false,
            inProgress: false,
          },
        ],
        trustTitle: "We don't rush trust.",
        trustText: 'Every phase is executed with precision, security, and transparency.',
        transparencyEyebrow: 'TRANSPARENCY BEFORE PROMOTION',
        transparencyTitle: 'Security & transparency come first.',
        transparencyText:
          'Trust is built through open information, verifiable code, technical documentation, and independent review.',
        infrastructureEyebrow: 'MARKET INFRASTRUCTURE',
        infrastructureTitle: 'Building the market layer.',
        infrastructureText:
          'Liquidity, metadata, indexing, and data providers must align before wallets and explorers can offer a consistent experience.',
        resourcesEyebrow: 'DOCUMENTATION & RESOURCES',
        resourcesTitle: 'Everything will be published verifiably.',
        resourcesText:
          'Contracts, addresses, audits, and official resources will be documented as consolidation progresses.',
        approach: 'Our approach',
        pipeline: 'See the pipeline',
        resources: 'View phases',
        ctaTitle: 'Be part of the real utility economy.',
        ctaText: 'CTG One is building technology infrastructure for real use cases. CTGO is part of that architecture.',
        ctaButton: 'Explore CTG One',
      };

  return (
    <section id="ctgotoken" className="relative overflow-hidden bg-[#020406] pb-20 sm:pb-28 lg:pb-32">
      <div
        className="pointer-events-none absolute inset-0 opacity-45"
        aria-hidden="true"
        style={{
          backgroundImage:
            'linear-gradient(rgba(212,162,89,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(212,162,89,0.035) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
          maskImage: 'linear-gradient(to bottom, black 0%, transparent 62%)',
        }}
      />
      <div className="pointer-events-none absolute left-[-18rem] top-[-12rem] h-[42rem] w-[42rem] rounded-full bg-[#d4a259]/[0.045] blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute right-[-14rem] top-[6rem] h-[36rem] w-[36rem] rounded-full bg-[#8247e5]/[0.06] blur-3xl" aria-hidden="true" />

      <Container className="relative z-10">
        <div className="grid min-h-[680px] items-center gap-12 py-10 sm:py-14 lg:grid-cols-[0.92fr_1.08fr] lg:gap-8 lg:py-16">
          <FadeInSection direction="left">
            <div className="max-w-[620px]">
              <span className="mb-6 inline-flex items-center rounded-full border border-[#d4a259]/25 bg-[#d4a259]/[0.055] px-4 py-2 text-[9px] font-medium uppercase tracking-[0.18em] text-[#efc875] sm:text-[10px]">
                {copy.eyebrow}
              </span>

              <h1 className="font-outfit text-[4.8rem] font-semibold leading-[0.88] tracking-[-0.065em] text-transparent sm:text-[6.4rem] lg:text-[7.2rem] bg-gradient-to-br from-[#f8df9f] via-[#d4a259] to-[#8d6125] bg-clip-text">
                {copy.title}
              </h1>
              <h2 className="mt-5 max-w-xl font-outfit text-3xl font-medium leading-[1.04] tracking-[-0.035em] text-white sm:text-4xl lg:text-[2.7rem]">
                {copy.subtitle}
              </h2>
              <p className="mt-6 max-w-xl text-sm leading-7 text-white/58 sm:text-[15px]">{copy.intro}</p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/ecosystem"
                  className="inline-flex min-h-12 items-center justify-center gap-3 rounded-lg bg-gradient-to-r from-[#e6b75e] to-[#c99035] px-5 text-xs font-semibold text-[#080604] shadow-[0_12px_32px_rgba(212,162,89,0.12)] transition-transform duration-300 hover:-translate-y-0.5"
                >
                  {copy.explore}
                  <ArrowRight size={15} />
                </Link>
                <a
                  href="#transparency"
                  className="inline-flex min-h-12 items-center justify-center gap-3 rounded-lg border border-white/10 bg-white/[0.018] px-5 text-xs font-medium text-white/78 transition-colors hover:border-[#d4a259]/30 hover:text-white"
                >
                  {copy.docs}
                  <FileText size={14} />
                </a>
              </div>

              <div className="mt-6 flex max-w-xl items-start gap-4 rounded-xl border border-[#d4a259]/20 bg-black/30 p-4 sm:p-5">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#d4a259]/25 text-[#e8b85b]">
                  <ShieldCheck size={17} strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-xs font-medium text-white/88">{copy.noticeTitle}</p>
                  <p className="mt-1 text-[11px] leading-5 text-white/45">{copy.noticeText}</p>
                </div>
              </div>
            </div>
          </FadeInSection>

          <FadeInSection direction="right" delay={0.08}>
            <div className="relative mx-auto flex w-full max-w-[650px] items-center justify-center py-8 lg:min-h-[590px]">
              <div className="absolute inset-x-[7%] bottom-[8%] top-[18%] rounded-[50%] bg-[#d4a259]/[0.045] blur-3xl" aria-hidden="true" />
              <div
                className="absolute inset-x-[2%] bottom-[5%] h-[56%] opacity-60"
                aria-hidden="true"
                style={{
                  backgroundImage:
                    'linear-gradient(rgba(212,162,89,0.14) 1px, transparent 1px), linear-gradient(90deg, rgba(212,162,89,0.14) 1px, transparent 1px)',
                  backgroundSize: '34px 34px',
                  transform: 'perspective(500px) rotateX(64deg)',
                  transformOrigin: 'center bottom',
                  maskImage: 'radial-gradient(ellipse at center, black 20%, transparent 72%)',
                }}
              />

              <div className="absolute left-[5%] top-[16%] hidden text-[10px] leading-5 tracking-[0.12em] text-[#d4a259]/35 sm:block" aria-hidden="true">
                10.3910° N<br />75.4794° W
              </div>

              <div className="relative aspect-square w-[min(82vw,500px)]">
                <div className="absolute inset-[2%] rounded-full border border-[#d4a259]/10 shadow-[0_0_120px_rgba(212,162,89,0.08)]" />
                <div
                  className="absolute inset-[6%] rounded-full p-[10px] shadow-[0_35px_90px_rgba(0,0,0,0.72)]"
                  style={{
                    background:
                      'repeating-conic-gradient(from 0deg, rgba(230,183,94,0.75) 0deg 0.7deg, rgba(37,29,18,0.2) 0.7deg 5.5deg)',
                  }}
                >
                  <div className="relative h-full w-full rounded-full border border-[#f1cd7b]/45 bg-gradient-to-br from-[#36312a] via-[#0d1012] to-[#050607] p-[5.5%]">
                    <div className="absolute inset-[3%] rounded-full border border-[#d4a259]/35" />
                    <div className="absolute inset-[8%] rounded-full border border-white/[0.055]" />
                    <div
                      className="absolute inset-[10%] rounded-full opacity-40"
                      style={{
                        backgroundImage:
                          'radial-gradient(circle at 50% 36%, rgba(212,162,89,0.18), transparent 25%), repeating-radial-gradient(circle at center, rgba(255,255,255,0.035) 0 1px, transparent 1px 5px)',
                      }}
                    />
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-[9px] uppercase tracking-[0.46em] text-[#e2ba69]/62 sm:text-[11px]">CTG ONE</span>
                      <span className="mt-4 font-outfit text-[5.4rem] font-semibold leading-none tracking-[-0.08em] text-transparent sm:text-[7rem] bg-gradient-to-b from-[#fff0bd] via-[#d4a259] to-[#8e5c1e] bg-clip-text drop-shadow-[0_7px_10px_rgba(0,0,0,0.7)]">
                        CTG
                      </span>
                      <span className="mt-2 text-sm font-medium tracking-[0.35em] text-[#e7bd6a]/75 sm:text-base">CTGO</span>
                      <span className="mt-8 rounded-full border border-[#d4a259]/18 px-4 py-2 text-[8px] uppercase tracking-[0.28em] text-[#d4a259]/55 sm:text-[9px]">
                        Polygon ecosystem
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </FadeInSection>
        </div>

        <FadeInSection delay={0.08}>
          <div className="rounded-2xl border border-white/[0.075] bg-gradient-to-r from-white/[0.028] via-white/[0.015] to-white/[0.028] p-4 shadow-[0_18px_70px_rgba(0,0,0,0.28)] sm:p-5">
            <div className="grid gap-4 md:grid-cols-[1.2fr_repeat(5,minmax(0,1fr))] md:gap-0">
              <div className="flex flex-col justify-center border-white/[0.065] px-2 py-2 md:border-r md:px-4">
                <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#d4a259]">{copy.glance}</span>
                <span className="mt-1 text-[11px] text-white/42">{copy.glanceNote}</span>
              </div>
              {copy.facts.map(({ label, value, detail, icon: Icon }) => (
                <div key={label} className="flex items-center gap-3 border-white/[0.055] px-2 py-2 md:border-r md:px-4 last:md:border-r-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#d4a259]/20 bg-[#d4a259]/[0.035] text-[#dfaa4d]">
                    <Icon size={15} strokeWidth={1.5} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] text-white/38">{label}</p>
                    <p className="truncate text-xs font-medium text-white/88 sm:text-[13px]">{value}</p>
                    <p className="mt-0.5 text-[8px] text-white/25">{detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </FadeInSection>

        <div id="utility" className="mt-6 grid gap-5 lg:grid-cols-3">
          <FadeInSection direction="left">
            <article className="group relative h-full min-h-[520px] overflow-hidden rounded-2xl border border-white/[0.075] bg-[#070b0f]/82 p-6 sm:p-7">
              <div className="absolute inset-0 bg-gradient-to-b from-[#8247e5]/[0.02] to-transparent" aria-hidden="true" />
              <div className="relative z-10">
                <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#d4a259]">{copy.networkEyebrow}</p>
                <h3 className="mt-3 max-w-[260px] font-outfit text-2xl font-medium leading-tight tracking-[-0.025em] text-white">{copy.networkTitle}</h3>
                <p className="mt-4 max-w-[310px] text-xs leading-6 text-white/45">{copy.networkText}</p>
              </div>

              <div className="absolute inset-x-4 bottom-5 h-[245px] overflow-hidden rounded-xl border border-[#8247e5]/10 bg-[#06070c]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_52%,rgba(130,71,229,0.22),transparent_32%)]" />
                <div className="absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-2xl border border-[#9a63f4]/45 bg-gradient-to-br from-[#8247e5]/30 to-[#26123f]/35 shadow-[0_0_50px_rgba(130,71,229,0.16)]">
                  <div className="flex h-full w-full -rotate-45 items-center justify-center text-[#a778ff]">
                    <Network size={42} strokeWidth={1.25} />
                  </div>
                </div>
                {[18, 36, 64, 82].map((left, index) => (
                  <span
                    key={left}
                    className="absolute h-8 w-8 rotate-45 border border-[#8247e5]/20 bg-[#8247e5]/[0.045]"
                    style={{ left: `${left}%`, top: `${index % 2 === 0 ? 25 : 70}%` }}
                  />
                ))}
                <div className="absolute inset-x-[14%] bottom-5 h-px bg-gradient-to-r from-transparent via-[#8247e5]/60 to-transparent" />
              </div>
            </article>
          </FadeInSection>

          <FadeInSection delay={0.05}>
            <article className="relative h-full min-h-[520px] overflow-hidden rounded-2xl border border-white/[0.075] bg-[#070b0f]/82 p-6 sm:p-7">
              <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#d4a259]">{copy.utilityEyebrow}</p>
              <h3 className="mt-3 max-w-[300px] font-outfit text-2xl font-medium leading-tight tracking-[-0.025em] text-white">{copy.utilityTitle}</h3>
              <p className="mt-4 text-xs leading-6 text-white/45">{copy.utilityText}</p>

              <div className="relative mt-8 h-[245px]">
                <div className="absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[#d4a259]/55 bg-[#16120b] shadow-[0_0_45px_rgba(212,162,89,0.15)]">
                  <span className="font-outfit text-2xl text-[#e5b65e]">CTG</span>
                </div>
                {copy.utilityNodes.map((node, index) => {
                  const positions = [
                    'left-0 top-[44%]',
                    'left-1/2 top-0 -translate-x-1/2',
                    'right-0 top-[44%]',
                    'bottom-0 left-1/2 -translate-x-1/2',
                  ];
                  return (
                    <div
                      key={node}
                      className={`absolute ${positions[index]} max-w-[125px] rounded-lg border border-[#d4a259]/22 bg-black/35 px-3 py-2 text-center text-[10px] leading-4 text-white/72`}
                    >
                      {node}
                    </div>
                  );
                })}
                <div className="absolute left-[15%] right-[15%] top-1/2 h-px bg-gradient-to-r from-[#72c27e]/40 via-[#d4a259]/40 to-[#d4a259]/40" />
                <div className="absolute bottom-[18%] left-1/2 top-[17%] w-px bg-gradient-to-b from-[#72c27e]/40 via-[#d4a259]/45 to-[#d4a259]/40" />
              </div>

              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[8px] uppercase tracking-[0.13em] text-white/32">
                <span className="flex items-center gap-1.5"><i className="h-1.5 w-1.5 rounded-full bg-[#72c27e]" />{copy.live}</span>
                <span className="flex items-center gap-1.5"><i className="h-1.5 w-1.5 rounded-full bg-[#d4a259]" />{copy.roadmapLegend}</span>
                <span className="flex items-center gap-1.5"><i className="h-1.5 w-1.5 rounded-full bg-white/25" />{copy.future}</span>
              </div>
            </article>
          </FadeInSection>

          <FadeInSection direction="right" delay={0.1}>
            <article className="relative h-full min-h-[520px] overflow-hidden rounded-2xl border border-white/[0.075] bg-[#070b0f]/82 p-6 sm:p-7">
              <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#d4a259]">{copy.valueEyebrow}</p>
              <h3 className="mt-3 max-w-[310px] font-outfit text-2xl font-medium leading-tight tracking-[-0.025em] text-white">{copy.valueTitle}</h3>
              <p className="mt-4 text-xs leading-6 text-white/45">{copy.valueText}</p>

              <div className="mt-7 rounded-xl border border-white/[0.06] bg-black/25 p-4">
                <p className="text-[9px] text-white/36">{copy.walletOwns}</p>
                <p className="mt-1 font-outfit text-2xl text-[#e7b75c]">10,000 CTG</p>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-[#72c27e]/25 bg-[#72c27e]/[0.035] p-4">
                  <div className="mb-3 flex h-7 w-7 items-center justify-center rounded-full bg-[#72c27e]/12 text-[#7dcc87]">
                    <Check size={14} />
                  </div>
                  <p className="text-[9px] font-semibold text-[#7dcc87]">{copy.tokenBalance}</p>
                  <p className="mt-1 text-[9px] text-white/34">{copy.onChain}</p>
                </div>
                <div className="rounded-xl border border-[#d4a259]/25 bg-[#d4a259]/[0.025] p-4">
                  <div className="mb-3 flex h-7 w-7 items-center justify-center rounded-full bg-[#d4a259]/10 text-[#e2ad4e]">
                    <span className="text-xs font-semibold">?</span>
                  </div>
                  <p className="text-[9px] font-semibold text-[#d4a259]">{copy.fiatValue}</p>
                  <p className="mt-1 text-[9px] text-white/34">{copy.external}</p>
                </div>
              </div>

              <ul className="mt-5 space-y-2">
                {copy.factors.map((factor) => (
                  <li key={factor} className="flex items-center gap-2 text-[10px] text-white/36">
                    <span className="h-px w-3 bg-[#d4a259]/35" />
                    {factor}
                  </li>
                ))}
              </ul>
            </article>
          </FadeInSection>
        </div>

        <section id="consolidation" className="mt-12 sm:mt-16">
          <FadeInSection>
            <p className="text-[9px] font-semibold uppercase tracking-[0.17em] text-[#d4a259]">{copy.roadmapEyebrow}</p>
            <p className="mt-2 max-w-2xl text-xs leading-6 text-white/40">{copy.roadmapIntro}</p>
          </FadeInSection>

          <div className="mt-6 grid gap-4 lg:grid-cols-[repeat(4,minmax(0,1fr))_0.9fr]">
            {copy.phases.map((phase, index) => (
              <FadeInSection key={phase.label} delay={index * 0.04}>
                <article
                  className={`relative h-full min-h-[225px] rounded-2xl border p-5 ${
                    phase.done
                      ? 'border-[#d4a259]/40 bg-[#d4a259]/[0.045]'
                      : phase.inProgress
                        ? 'border-[#d4a259]/18 bg-[#d4a259]/[0.018]'
                        : 'border-white/[0.07] bg-white/[0.012]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`font-outfit text-2xl ${phase.done ? 'text-[#e0ad51]' : 'text-white/36'}`}>0{index + 1}</span>
                    <span className={`flex h-9 w-9 items-center justify-center rounded-full border ${phase.done ? 'border-[#d4a259]/35 text-[#e2b35b]' : 'border-white/10 text-white/28'}`}>
                      {phase.done ? <Check size={15} /> : <CircleDashed size={15} />}
                    </span>
                  </div>
                  <h4 className="mt-6 text-sm font-medium leading-5 text-white/88">{phase.label}</h4>
                  <p className={`mt-2 text-[10px] font-medium ${phase.done ? 'text-[#70c17c]' : phase.inProgress ? 'text-[#d4a259]' : 'text-white/38'}`}>{phase.status}</p>
                  <p className="mt-4 text-[10px] leading-5 text-white/34">{phase.description}</p>
                </article>
              </FadeInSection>
            ))}

            <FadeInSection delay={0.18}>
              <aside className="relative h-full min-h-[225px] overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.012] p-5">
                <div className="absolute -bottom-10 -right-10 h-36 w-36 rounded-full border border-[#d4a259]/10" aria-hidden="true" />
                <ShieldCheck size={27} className="text-[#d4a259]/38" strokeWidth={1.25} />
                <h4 className="mt-8 font-outfit text-lg font-medium text-white/88">{copy.trustTitle}</h4>
                <p className="mt-3 text-[10px] leading-5 text-white/38">{copy.trustText}</p>
              </aside>
            </FadeInSection>
          </div>
        </section>

        <div id="transparency" className="mt-6 grid gap-5 lg:grid-cols-3">
          <FadeInSection direction="left">
            <article className="relative min-h-[300px] overflow-hidden rounded-2xl border border-white/[0.075] bg-[#070b0f]/82 p-6 sm:p-7">
              <div className="absolute bottom-[-60px] right-[-45px] h-52 w-52 rounded-full border border-[#d4a259]/10" aria-hidden="true" />
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#d4a259]/22 bg-[#d4a259]/[0.035] text-[#e2ae50]">
                <ShieldCheck size={22} strokeWidth={1.35} />
              </div>
              <p className="mt-8 text-[9px] font-semibold uppercase tracking-[0.16em] text-[#d4a259]">{copy.transparencyEyebrow}</p>
              <h3 className="mt-3 max-w-[320px] font-outfit text-2xl font-medium leading-tight text-white">{copy.transparencyTitle}</h3>
              <p className="mt-4 max-w-sm text-xs leading-6 text-white/42">{copy.transparencyText}</p>
              <a href="#consolidation" className="mt-7 inline-flex items-center gap-2 text-[10px] font-medium text-[#e1ad50] hover:text-[#f2c76f]">
                {copy.approach} <ArrowRight size={13} />
              </a>
            </article>
          </FadeInSection>

          <FadeInSection delay={0.05}>
            <article id="infrastructure" className="relative min-h-[300px] overflow-hidden rounded-2xl border border-white/[0.075] bg-[#070b0f]/82 p-6 sm:p-7">
              <div className="absolute right-5 top-5 grid grid-cols-3 gap-2 opacity-45" aria-hidden="true">
                {[0, 1, 2, 3, 4, 5].map((item) => (
                  <span key={item} className="h-7 w-7 rotate-45 border border-[#d4a259]/25 bg-[#d4a259]/[0.035]" />
                ))}
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#d4a259]/22 bg-[#d4a259]/[0.035] text-[#e2ae50]">
                <Database size={22} strokeWidth={1.35} />
              </div>
              <p className="mt-8 text-[9px] font-semibold uppercase tracking-[0.16em] text-[#d4a259]">{copy.infrastructureEyebrow}</p>
              <h3 className="mt-3 max-w-[320px] font-outfit text-2xl font-medium leading-tight text-white">{copy.infrastructureTitle}</h3>
              <p className="mt-4 max-w-sm text-xs leading-6 text-white/42">{copy.infrastructureText}</p>
              <a href="#utility" className="mt-7 inline-flex items-center gap-2 text-[10px] font-medium text-[#e1ad50] hover:text-[#f2c76f]">
                {copy.pipeline} <ArrowRight size={13} />
              </a>
            </article>
          </FadeInSection>

          <FadeInSection direction="right" delay={0.1}>
            <article className="relative min-h-[300px] overflow-hidden rounded-2xl border border-white/[0.075] bg-[#070b0f]/82 p-6 sm:p-7">
              <div className="absolute right-6 top-6 flex gap-2 opacity-45" aria-hidden="true">
                <span className="h-16 w-12 rotate-[-7deg] rounded-md border border-[#d4a259]/25 bg-[#d4a259]/[0.025]" />
                <span className="h-16 w-12 rotate-[7deg] rounded-md border border-[#d4a259]/25 bg-[#d4a259]/[0.025]" />
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#d4a259]/22 bg-[#d4a259]/[0.035] text-[#e2ae50]">
                <FileText size={22} strokeWidth={1.35} />
              </div>
              <p className="mt-8 text-[9px] font-semibold uppercase tracking-[0.16em] text-[#d4a259]">{copy.resourcesEyebrow}</p>
              <h3 className="mt-3 max-w-[320px] font-outfit text-2xl font-medium leading-tight text-white">{copy.resourcesTitle}</h3>
              <p className="mt-4 max-w-sm text-xs leading-6 text-white/42">{copy.resourcesText}</p>
              <a href="#consolidation" className="mt-7 inline-flex items-center gap-2 text-[10px] font-medium text-[#e1ad50] hover:text-[#f2c76f]">
                {copy.resources} <ArrowRight size={13} />
              </a>
            </article>
          </FadeInSection>
        </div>

        <FadeInSection delay={0.12}>
          <div className="relative mt-6 overflow-hidden rounded-2xl border border-[#d4a259]/28 bg-gradient-to-r from-[#0a0906] via-[#11100d] to-[#080705] px-6 py-7 sm:px-8 lg:flex lg:items-center lg:justify-between lg:gap-8">
            <div className="pointer-events-none absolute inset-0 opacity-50" aria-hidden="true" style={{ backgroundImage: 'radial-gradient(circle at 12% 50%, rgba(212,162,89,0.15), transparent 22%), radial-gradient(circle at 88% 50%, rgba(212,162,89,0.08), transparent 22%)' }} />
            <div className="relative z-10 max-w-2xl">
              <h3 className="font-outfit text-2xl font-medium tracking-[-0.025em] text-white sm:text-3xl">{copy.ctaTitle}</h3>
              <p className="mt-2 text-xs leading-6 text-white/43">{copy.ctaText}</p>
            </div>
            <Link
              href="/ecosystem"
              className="relative z-10 mt-6 inline-flex min-h-12 shrink-0 items-center justify-center gap-3 rounded-lg bg-gradient-to-r from-[#e6b75e] to-[#c99035] px-6 text-xs font-semibold text-[#080604] transition-transform duration-300 hover:-translate-y-0.5 lg:mt-0"
            >
              {copy.ctaButton}
              <ArrowRight size={15} />
            </Link>
          </div>
        </FadeInSection>
      </Container>
    </section>
  );
};
