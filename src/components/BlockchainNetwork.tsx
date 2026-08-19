'use client';

import React, { memo, useCallback, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
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

const GOLD = '#d4a259';

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

const getNodePosition = (index: number, total: number, radius = 150) => {
  const angle = (index / total) * Math.PI * 2 - Math.PI / 2;
  return { x: 200 + radius * Math.cos(angle), y: 200 + radius * Math.sin(angle) };
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
  const reduceMotion = useReducedMotion();
  const svgSize = size === 'sm' ? 320 : size === 'lg' ? 520 : 400;
  const sizeClass = size === 'sm' ? 'max-w-[320px]' : size === 'lg' ? 'max-w-[520px]' : 'max-w-[400px]';

  const handleMouseEnter = useCallback((unitId: string) => {
    if (interactive) setHoveredNode(unitId);
  }, [interactive]);

  const handleMouseLeave = useCallback(() => setHoveredNode(null), []);
  const accessibleLabel = locale === 'es' ? 'Ecosistema tecnológico de CTG One' : 'CTG One technology ecosystem';

  return (
    <div
      className={`relative flex aspect-square w-full items-center justify-center ${sizeClass}`}
      role="img"
      aria-label={accessibleLabel}
      data-ecosystem-diagram
    >
      <div
        className="absolute inset-[13%] rounded-full pointer-events-none"
        aria-hidden="true"
        style={{
          background: 'radial-gradient(circle, rgba(212,162,89,0.09) 0%, rgba(212,162,89,0.025) 38%, transparent 70%)',
          filter: 'blur(14px)',
        }}
      />

      <svg
        width={svgSize}
        height={svgSize}
        viewBox="0 0 400 400"
        aria-hidden="true"
        className="relative h-full w-full overflow-visible drop-shadow-2xl"
      >
        <defs>
          <radialGradient id="networkCenterGlow">
            <stop offset="0%" stopColor={GOLD} stopOpacity="0.24" />
            <stop offset="55%" stopColor={GOLD} stopOpacity="0.07" />
            <stop offset="100%" stopColor={GOLD} stopOpacity="0" />
          </radialGradient>
          <linearGradient id="networkLine" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={GOLD} stopOpacity="0.08" />
            <stop offset="50%" stopColor={GOLD} stopOpacity="0.42" />
            <stop offset="100%" stopColor={GOLD} stopOpacity="0.08" />
          </linearGradient>
          <filter id="softGoldGlow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <clipPath id="centerLogoClip"><circle cx="200" cy="200" r="30" /></clipPath>
        </defs>

        <g opacity="0.7">
          <circle cx="200" cy="200" r="178" fill="none" stroke="rgba(212,162,89,0.08)" strokeWidth="0.7" strokeDasharray="2 7">
            {!reduceMotion && <animateTransform attributeName="transform" type="rotate" from="0 200 200" to="360 200 200" dur="70s" repeatCount="indefinite" />}
          </circle>
          <circle cx="200" cy="200" r="151" fill="none" stroke="rgba(212,162,89,0.18)" strokeWidth="0.7" />
          <circle cx="200" cy="200" r="112" fill="none" stroke="rgba(255,255,255,0.045)" strokeWidth="0.7" strokeDasharray="8 9">
            {!reduceMotion && <animateTransform attributeName="transform" type="rotate" from="360 200 200" to="0 200 200" dur="52s" repeatCount="indefinite" />}
          </circle>
          <circle cx="200" cy="200" r="77" fill="none" stroke="rgba(212,162,89,0.12)" strokeWidth="0.7" strokeDasharray="1 8" />
        </g>

        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
          const rad = (angle * Math.PI) / 180;
          const x1 = 200 + 171 * Math.cos(rad);
          const y1 = 200 + 171 * Math.sin(rad);
          const x2 = 200 + 178 * Math.cos(rad);
          const y2 = 200 + 178 * Math.sin(rad);
          return <line key={angle} x1={x1} y1={y1} x2={x2} y2={y2} stroke={GOLD} strokeOpacity="0.26" strokeWidth="0.8" />;
        })}

        {units.map((unit, index) => {
          const pos = getNodePosition(index, units.length);
          const active = hoveredNode === unit.id;
          return (
            <g key={`connection-${unit.id}`}>
              <line
                x1="200"
                y1="200"
                x2={pos.x}
                y2={pos.y}
                stroke={active ? GOLD : 'url(#networkLine)'}
                strokeOpacity={active ? 0.92 : 0.5}
                strokeWidth={active ? 1.35 : 0.7}
                style={{ transition: reduceMotion ? 'none' : 'all 260ms ease' }}
              />
              <circle r="1.7" fill={GOLD} opacity={active ? 0.95 : 0.22}>
                {!reduceMotion && <animateMotion dur={`${5.5 + index * 0.35}s`} repeatCount="indefinite" path={`M200,200 L${pos.x},${pos.y}`} />}
              </circle>
            </g>
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
              <motion.circle
                cx={pos.x}
                cy={pos.y}
                r="28"
                fill="rgba(9,9,11,0.96)"
                stroke={GOLD}
                strokeOpacity={active ? 0.95 : 0.25}
                strokeWidth={active ? 1.2 : 0.7}
                animate={{ scale: reduceMotion ? 1 : active ? 1.06 : 1 }}
                transition={{ duration: reduceMotion ? 0 : 0.24 }}
                style={{ transformOrigin: `${pos.x}px ${pos.y}px` }}
              />
              <circle cx={pos.x} cy={pos.y} r="22" fill="none" stroke={GOLD} strokeOpacity={active ? 0.28 : 0.08} strokeWidth="0.7" />
              {active && <circle cx={pos.x} cy={pos.y} r="34" fill="none" stroke={GOLD} strokeOpacity="0.18" strokeWidth="1" filter="url(#softGoldGlow)" />}
              <foreignObject x={pos.x - 12} y={pos.y - 12} width="24" height="24">
                <div className="w-6 h-6 flex items-center justify-center">
                  <Icon size={19} color={GOLD} strokeWidth={active ? 1.8 : 1.4} />
                </div>
              </foreignObject>
              <text
                x={pos.x}
                y={pos.y + 45}
                textAnchor="middle"
                fill={active ? '#e0bd78' : '#aaa39b'}
                fontSize="11.5"
                fontWeight="500"
                fontFamily="DM Sans, sans-serif"
                letterSpacing="0.03em"
              >
                {locale === 'es' ? unit.es : unit.en}
              </text>
            </g>
          );
        })}

        <g>
          <circle cx="200" cy="200" r="67" fill="url(#networkCenterGlow)" />
          <circle cx="200" cy="200" r="53" fill="none" stroke={GOLD} strokeOpacity="0.2" strokeWidth="0.8" strokeDasharray="4 7">
            {!reduceMotion && <animateTransform attributeName="transform" type="rotate" from="0 200 200" to="360 200 200" dur="28s" repeatCount="indefinite" />}
          </circle>
          <circle cx="200" cy="200" r="43" fill="#080808" stroke={GOLD} strokeOpacity="0.9" strokeWidth="1.2" filter="url(#softGoldGlow)" />
          <circle cx="200" cy="200" r="35" fill="rgba(212,162,89,0.035)" stroke={GOLD} strokeOpacity="0.14" strokeWidth="0.7" />
          <image
            href="/images/logo/ctg-one-coin-icon.png"
            x="169"
            y="169"
            width="62"
            height="62"
            preserveAspectRatio="xMidYMid slice"
            clipPath="url(#centerLogoClip)"
          />
        </g>
      </svg>
    </div>
  );
});
