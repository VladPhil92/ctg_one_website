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
            <stop offset="0%" stopColor={GOLD_LIGHT} stopOpacity="0.2" />
            <stop offset="48%" stopColor={GOLD} stopOpacity="0.06" />
            <stop offset="100%" stopColor={GOLD} stopOpacity="0" />
          </radialGradient>
          <linearGradient id="networkLine" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={BLUE} stopOpacity="0.08" />
            <stop offset="50%" stopColor={GOLD} stopOpacity="0.26" />
            <stop offset="100%" stopColor={GOLD_LIGHT} stopOpacity="0.08" />
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

        <circle cx={CENTER} cy={CENTER} r="218" fill="none" stroke="rgba(214,174,86,0.14)" strokeWidth="0.75" />
        <circle cx={CENTER} cy={CENTER} r="145" fill="none" stroke="rgba(36,140,255,0.08)" strokeWidth="0.65" strokeDasharray="3 14" />

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
              strokeOpacity={active ? 0.8 : 0.45}
              strokeWidth={active ? 1.2 : 0.65}
              filter={active ? 'url(#softGoldGlow)' : undefined}
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
              style={{ cursor: interactive ? 'pointer' : 'default' }}
            >
              {active && (
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r="40"
                  fill="rgba(214,174,86,.02)"
                  stroke={GOLD_LIGHT}
                  strokeOpacity="0.2"
                  strokeWidth="0.8"
                  filter="url(#softGoldGlow)"
                />
              )}
              <circle
                cx={pos.x}
                cy={pos.y}
                r="34"
                fill="rgba(4,8,13,0.97)"
                stroke={active ? GOLD_LIGHT : GOLD}
                strokeOpacity={active ? 0.95 : 0.5}
                strokeWidth={active ? 1.2 : 0.8}
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

        <g>
          <circle cx={CENTER} cy={CENTER} r="82" fill="url(#networkCenterGlow)" />
          <circle
            cx={CENTER}
            cy={CENTER}
            r="54"
            fill="#04080d"
            stroke={GOLD_LIGHT}
            strokeOpacity="0.9"
            strokeWidth="1.2"
            filter="url(#softGoldGlow)"
          />
          <circle cx={CENTER} cy={CENTER} r="45" fill="rgba(214,174,86,0.02)" stroke={BLUE} strokeOpacity="0.08" strokeWidth="0.65" />
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
