'use client';

import React, { memo, useCallback, useState } from 'react';
import {
  BrainCircuit,
  TrendingUp,
  Building2,
  GraduationCap,
  HeartPulse,
  Scale,
  PenTool,
  Landmark,
  type LucideIcon,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import styles from '@/styles/CommandCenter.module.css';

interface BusinessUnit {
  id: string;
  en: string;
  es: string;
  icon: LucideIcon;
}

const GOLD = '#d6ae56';
const GOLD_LIGHT = '#f1c75b';
const BLUE = '#248cff';
const CENTER = 260;
const NODE_RADIUS = 194;
const ENERGY_RAYS = 12;
const ENERGY_SPARKS = 8;

const units: BusinessUnit[] = [
  { id: 'ai', en: 'AI Strategy', es: 'Estrategia de IA', icon: BrainCircuit },
  { id: 'commerce', en: 'Commerce', es: 'Comercio', icon: TrendingUp },
  { id: 'hospitality', en: 'Hospitality', es: 'Hospitalidad', icon: Building2 },
  { id: 'education', en: 'Education', es: 'Educación', icon: GraduationCap },
  { id: 'health', en: 'Health', es: 'Salud', icon: HeartPulse },
  { id: 'legal', en: 'Legal', es: 'Legal', icon: Scale },
  { id: 'design', en: 'Design', es: 'Diseño', icon: PenTool },
  { id: 'fintech', en: 'Fintech', es: 'Fintech', icon: Landmark },
];

const getNodePosition = (index: number, total: number) => {
  const angle = (index / total) * Math.PI * 2 - Math.PI / 2;
  return {
    x: CENTER + NODE_RADIUS * Math.cos(angle),
    y: CENTER + NODE_RADIUS * Math.sin(angle),
  };
};

const getEnergySparkPosition = (index: number, total: number) => {
  const angle = (index / total) * Math.PI * 2 - Math.PI / 2;
  const radius = index % 2 === 0 ? 78 : 88;
  return {
    x: CENTER + radius * Math.cos(angle),
    y: CENTER + radius * Math.sin(angle),
  };
};

interface BlockchainNetworkProps {
  interactive?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const BlockchainNetwork: React.FC<BlockchainNetworkProps> = memo(function BlockchainNetwork({
  interactive = true,
  size = 'md',
}) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const { locale } = useLanguage();
  const svgSize = size === 'sm' ? 340 : size === 'lg' ? 680 : 480;
  const sizeClass = size === 'sm' ? 'max-w-[340px]' : size === 'lg' ? 'max-w-[680px]' : 'max-w-[480px]';

  const handleMouseEnter = useCallback((unitId: string) => {
    if (interactive) setHoveredNode(unitId);
  }, [interactive]);

  const handleMouseLeave = useCallback(() => setHoveredNode(null), []);
  const accessibleLabel = locale === 'es'
    ? 'Ecosistema tecnológico de CTG One'
    : 'CTG One technology ecosystem';

  return (
    <div
      className={`relative flex aspect-square w-full items-center justify-center ${sizeClass}`}
      role="img"
      aria-label={accessibleLabel}
      data-ecosystem-diagram
    >
      <div
        className="pointer-events-none absolute inset-[12%] rounded-full"
        aria-hidden="true"
        style={{
          background: 'radial-gradient(circle, rgba(214,174,86,0.07) 0%, rgba(36,140,255,0.018) 43%, transparent 72%)',
          filter: 'blur(22px)',
        }}
      />

      <svg
        width={svgSize}
        height={svgSize}
        viewBox="0 0 520 520"
        aria-hidden="true"
        className="relative h-full w-full overflow-visible drop-shadow-xl"
      >
        <defs>
          <radialGradient id="networkCenterGlow">
            <stop offset="0%" stopColor={GOLD_LIGHT} stopOpacity="0.22" />
            <stop offset="48%" stopColor={GOLD} stopOpacity="0.07" />
            <stop offset="100%" stopColor={GOLD} stopOpacity="0" />
          </radialGradient>
          <radialGradient id="coreEnergyGlow">
            <stop offset="0%" stopColor={GOLD_LIGHT} stopOpacity="0.3" />
            <stop offset="46%" stopColor={GOLD} stopOpacity="0.12" />
            <stop offset="100%" stopColor={GOLD} stopOpacity="0" />
          </radialGradient>
          <linearGradient id="networkLine" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={BLUE} stopOpacity="0.1" />
            <stop offset="50%" stopColor={GOLD} stopOpacity="0.34" />
            <stop offset="100%" stopColor={GOLD_LIGHT} stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id="coreEnergyRay" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor={GOLD} stopOpacity="0.2" />
            <stop offset="58%" stopColor={GOLD_LIGHT} stopOpacity="0.95" />
            <stop offset="100%" stopColor="#fff2b2" stopOpacity="0.08" />
          </linearGradient>
          <filter id="softGoldGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <clipPath id="centerLogoClip">
            <circle cx={CENTER} cy={CENTER} r="39" />
          </clipPath>
        </defs>

        <circle
          cx={CENTER}
          cy={CENTER}
          r="218"
          fill="none"
          stroke="rgba(214,174,86,0.14)"
          strokeWidth="0.75"
          className={styles.ecosystemOrbitOuter}
        />
        <circle
          cx={CENTER}
          cy={CENTER}
          r="145"
          fill="none"
          stroke="rgba(36,140,255,0.11)"
          strokeWidth="0.7"
          className={styles.ecosystemOrbitInner}
        />

        {units.map((unit, index) => {
          const pos = getNodePosition(index, units.length);
          const active = hoveredNode === unit.id;
          return (
            <line
              key={`connection-${unit.id}`}
              x1={CENTER}
              y1={CENTER}
              x2={pos.x}
              y2={pos.y}
              stroke={active ? GOLD_LIGHT : 'url(#networkLine)'}
              strokeOpacity={active ? 0.88 : 0.52}
              strokeWidth={active ? 1.25 : 0.75}
              filter={active ? 'url(#softGoldGlow)' : undefined}
              className={styles.ecosystemConnection}
              style={{ animationDelay: `${index * -0.38}s` }}
            />
          );
        })}

        {units.map((unit, index) => {
          const Icon = unit.icon;
          const pos = getNodePosition(index, units.length);
          const active = hoveredNode === unit.id;
          return (
            <g
              key={unit.id}
              onMouseEnter={() => handleMouseEnter(unit.id)}
              onMouseLeave={handleMouseLeave}
              className={styles.ecosystemNode}
              style={{
                cursor: interactive ? 'pointer' : 'default',
                animationDelay: `${index * -0.55}s`,
              }}
            >
              {active && (
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r="41"
                  fill="rgba(214,174,86,.025)"
                  stroke={GOLD_LIGHT}
                  strokeOpacity="0.24"
                  strokeWidth="0.9"
                  filter="url(#softGoldGlow)"
                />
              )}
              <circle
                cx={pos.x}
                cy={pos.y}
                r="34"
                fill="rgba(4,8,13,0.97)"
                stroke={active ? GOLD_LIGHT : GOLD}
                strokeOpacity={active ? 0.98 : 0.58}
                strokeWidth={active ? 1.25 : 0.85}
              />
              <foreignObject x={pos.x - 14} y={pos.y - 14} width="28" height="28">
                <div className="flex h-7 w-7 items-center justify-center">
                  <Icon size={20} color={active ? GOLD_LIGHT : GOLD} strokeWidth={active ? 1.7 : 1.35} />
                </div>
              </foreignObject>
              <text
                x={pos.x}
                y={pos.y + 53}
                textAnchor="middle"
                fill={active ? GOLD_LIGHT : '#d5d0c7'}
                fontSize="12.5"
                fontWeight="600"
                fontFamily="DM Sans, sans-serif"
                letterSpacing="0.012em"
              >
                {locale === 'es' ? unit.es : unit.en}
              </text>
            </g>
          );
        })}

        <g className={styles.coreEnergyField} data-core-energy="radial-emission">
          <circle
            cx={CENTER}
            cy={CENTER}
            r="70"
            fill="url(#coreEnergyGlow)"
            className={styles.coreEnergyGlow}
          />
          {[0, 1, 2].map((ring) => (
            <circle
              key={`energy-ring-${ring}`}
              cx={CENTER}
              cy={CENTER}
              r="64"
              fill="none"
              stroke={GOLD_LIGHT}
              strokeWidth="0.9"
              className={styles.coreEnergyRing}
              style={{ animationDelay: `${ring * 0.72}s` }}
            />
          ))}
          {Array.from({ length: ENERGY_RAYS }).map((_, index) => (
            <line
              key={`energy-ray-${index}`}
              x1={CENTER}
              y1={CENTER - 56}
              x2={CENTER}
              y2={CENTER - 101}
              stroke="url(#coreEnergyRay)"
              strokeWidth="1.45"
              strokeLinecap="round"
              transform={`rotate(${index * (360 / ENERGY_RAYS)} ${CENTER} ${CENTER})`}
              className={styles.coreEnergyRay}
              style={{ animationDelay: `${index * -0.13}s` }}
            />
          ))}
          {Array.from({ length: ENERGY_SPARKS }).map((_, index) => {
            const spark = getEnergySparkPosition(index, ENERGY_SPARKS);
            return (
              <circle
                key={`energy-spark-${index}`}
                cx={spark.x}
                cy={spark.y}
                r={index % 2 === 0 ? 2.1 : 1.55}
                fill={index % 3 === 0 ? '#fff2b2' : GOLD_LIGHT}
                className={styles.coreEnergySpark}
                style={{ animationDelay: `${index * -0.19}s` }}
              />
            );
          })}
        </g>

        <g className={styles.ecosystemCenter}>
          <circle
            cx={CENTER}
            cy={CENTER}
            r="84"
            fill="url(#networkCenterGlow)"
            className={styles.ecosystemHalo}
          />
          <circle
            cx={CENTER}
            cy={CENTER}
            r="54"
            fill="#04080d"
            stroke={GOLD_LIGHT}
            strokeOpacity="0.94"
            strokeWidth="1.25"
            filter="url(#softGoldGlow)"
          />
          <circle
            cx={CENTER}
            cy={CENTER}
            r="45"
            fill="rgba(214,174,86,0.025)"
            stroke={BLUE}
            strokeOpacity="0.12"
            strokeWidth="0.7"
          />
          <image
            href="/images/logo/ctg-one-coin-icon.png"
            x="219"
            y="219"
            width="82"
            height="82"
            preserveAspectRatio="xMidYMid meet"
            clipPath="url(#centerLogoClip)"
          />
        </g>
      </svg>
    </div>
  );
});

BlockchainNetwork.displayName = 'BlockchainNetwork';
