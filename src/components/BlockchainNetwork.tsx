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

const GOLD = '#d6ae56';
const GOLD_LIGHT = '#f1c75b';
const BLUE = '#248cff';
const CENTER = 260;
const NODE_RADIUS = 198;

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

const getNodePosition = (index: number, total: number, radius = NODE_RADIUS) => {
  const angle = (index / total) * Math.PI * 2 - Math.PI / 2;
  return { x: CENTER + radius * Math.cos(angle), y: CENTER + radius * Math.sin(angle) };
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
  const svgSize = size === 'sm' ? 340 : size === 'lg' ? 680 : 480;
  const sizeClass = size === 'sm' ? 'max-w-[340px]' : size === 'lg' ? 'max-w-[680px]' : 'max-w-[480px]';

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
        className="absolute inset-[8%] rounded-full pointer-events-none"
        aria-hidden="true"
        style={{
          background: 'radial-gradient(circle, rgba(214,174,86,0.10) 0%, rgba(36,140,255,0.025) 44%, transparent 70%)',
          filter: 'blur(18px)',
        }}
      />

      <svg
        width={svgSize}
        height={svgSize}
        viewBox="0 0 520 520"
        aria-hidden="true"
        className="relative h-full w-full overflow-visible drop-shadow-2xl"
      >
        <defs>
          <radialGradient id="networkCenterGlow">
            <stop offset="0%" stopColor={GOLD_LIGHT} stopOpacity="0.32" />
            <stop offset="42%" stopColor={GOLD} stopOpacity="0.11" />
            <stop offset="72%" stopColor={BLUE} stopOpacity="0.025" />
            <stop offset="100%" stopColor={GOLD} stopOpacity="0" />
          </radialGradient>
          <linearGradient id="networkLine" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={BLUE} stopOpacity="0.12" />
            <stop offset="46%" stopColor={GOLD} stopOpacity="0.36" />
            <stop offset="100%" stopColor={GOLD_LIGHT} stopOpacity="0.12" />
          </linearGradient>
          <linearGradient id="blueArc" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={BLUE} stopOpacity="0" />
            <stop offset="50%" stopColor={BLUE} stopOpacity="0.58" />
            <stop offset="100%" stopColor={BLUE} stopOpacity="0" />
          </linearGradient>
          <filter id="softGoldGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="softBlueGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <clipPath id="centerLogoClip"><circle cx={CENTER} cy={CENTER} r="40" /></clipPath>
        </defs>

        <g opacity="0.82">
          <circle cx={CENTER} cy={CENTER} r="238" fill="none" stroke="rgba(36,140,255,0.13)" strokeWidth="0.7" strokeDasharray="1 9">
            {!reduceMotion && <animateTransform attributeName="transform" type="rotate" from={`0 ${CENTER} ${CENTER}`} to={`360 ${CENTER} ${CENTER}`} dur="150s" repeatCount="indefinite" />}
          </circle>
          <circle cx={CENTER} cy={CENTER} r="222" fill="none" stroke="rgba(214,174,86,0.16)" strokeWidth="0.8" strokeDasharray="16 9 2 9">
            {!reduceMotion && <animateTransform attributeName="transform" type="rotate" from={`360 ${CENTER} ${CENTER}`} to={`0 ${CENTER} ${CENTER}`} dur="118s" repeatCount="indefinite" />}
          </circle>
          <circle cx={CENTER} cy={CENTER} r="198" fill="none" stroke="rgba(214,174,86,0.28)" strokeWidth="0.9" />
          <circle cx={CENTER} cy={CENTER} r="166" fill="none" stroke="rgba(36,140,255,0.18)" strokeWidth="0.75" strokeDasharray="4 9">
            {!reduceMotion && <animateTransform attributeName="transform" type="rotate" from={`0 ${CENTER} ${CENTER}`} to={`360 ${CENTER} ${CENTER}`} dur="92s" repeatCount="indefinite" />}
          </circle>
          <circle cx={CENTER} cy={CENTER} r="126" fill="none" stroke="rgba(255,255,255,0.055)" strokeWidth="0.7" strokeDasharray="13 10" />
          <circle cx={CENTER} cy={CENTER} r="92" fill="none" stroke="rgba(214,174,86,0.13)" strokeWidth="0.8" strokeDasharray="2 8" />
        </g>

        <g opacity="0.55">
          <path d="M42 260H478" stroke="url(#networkLine)" strokeWidth="0.6" strokeDasharray="2 10" />
          <path d="M260 42V478" stroke="url(#networkLine)" strokeWidth="0.6" strokeDasharray="2 10" />
          <path d="M104 104L416 416" stroke="rgba(36,140,255,.11)" strokeWidth="0.55" strokeDasharray="3 11" />
          <path d="M416 104L104 416" stroke="rgba(214,174,86,.11)" strokeWidth="0.55" strokeDasharray="3 11" />
        </g>

        <g opacity="0.74">
          <path d="M91 120 A222 222 0 0 1 431 122" fill="none" stroke="url(#blueArc)" strokeWidth="1.05" />
          <path d="M82 379 A226 226 0 0 0 440 376" fill="none" stroke="rgba(214,174,86,.20)" strokeWidth="0.8" strokeDasharray="7 7" />
        </g>

        {Array.from({ length: 32 }).map((_, index) => {
          const angle = (index / 32) * Math.PI * 2;
          const inner = index % 4 === 0 ? 230 : 234;
          const outer = 240;
          const x1 = CENTER + inner * Math.cos(angle);
          const y1 = CENTER + inner * Math.sin(angle);
          const x2 = CENTER + outer * Math.cos(angle);
          const y2 = CENTER + outer * Math.sin(angle);
          return (
            <line
              key={`tick-${index}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={index % 2 === 0 ? GOLD : BLUE}
              strokeOpacity={index % 4 === 0 ? 0.4 : 0.16}
              strokeWidth={index % 4 === 0 ? 0.9 : 0.55}
            />
          );
        })}

        {units.map((unit, index) => {
          const pos = getNodePosition(index, units.length);
          const active = hoveredNode === unit.id;
          return (
            <g key={`connection-${unit.id}`}>
              <line
                x1={CENTER}
                y1={CENTER}
                x2={pos.x}
                y2={pos.y}
                stroke={active ? GOLD_LIGHT : 'url(#networkLine)'}
                strokeOpacity={active ? 0.98 : 0.58}
                strokeWidth={active ? 1.55 : 0.75}
                filter={active ? 'url(#softGoldGlow)' : undefined}
                style={{ transition: reduceMotion ? 'none' : 'all 220ms ease' }}
              />
              <circle cx={(CENTER + pos.x) / 2} cy={(CENTER + pos.y) / 2} r="3.8" fill="#07111d" stroke={GOLD} strokeOpacity={active ? 0.9 : 0.42} strokeWidth="0.8" />
              <circle cx={(CENTER + pos.x) / 2} cy={(CENTER + pos.y) / 2} r="1.25" fill={active ? GOLD_LIGHT : GOLD} opacity={active ? 1 : 0.56} />
              <circle r="1.8" fill={index % 2 === 0 ? GOLD_LIGHT : BLUE} opacity={active ? 1 : 0.42}>
                {!reduceMotion && <animateMotion dur={`${7.5 + index * 0.45}s`} repeatCount="indefinite" path={`M${CENTER},${CENTER} L${pos.x},${pos.y}`} />}
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
              {active && <circle cx={pos.x} cy={pos.y} r="43" fill="rgba(214,174,86,.035)" stroke={GOLD_LIGHT} strokeOpacity="0.28" strokeWidth="1" filter="url(#softGoldGlow)" />}
              <motion.circle
                cx={pos.x}
                cy={pos.y}
                r="35"
                fill="rgba(4,8,13,0.97)"
                stroke={active ? GOLD_LIGHT : GOLD}
                strokeOpacity={active ? 1 : 0.55}
                strokeWidth={active ? 1.45 : 0.85}
                animate={{ y: reduceMotion ? 0 : active ? -2 : 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.2 }}
              />
              <circle cx={pos.x} cy={pos.y} r="29" fill="none" stroke={index % 2 === 0 ? GOLD : BLUE} strokeOpacity={active ? 0.38 : 0.12} strokeWidth="0.7" strokeDasharray="2 4" />
              <foreignObject x={pos.x - 14} y={pos.y - 14} width="28" height="28">
                <div className="flex h-7 w-7 items-center justify-center">
                  <Icon size={21} color={active ? GOLD_LIGHT : GOLD} strokeWidth={active ? 1.8 : 1.45} />
                </div>
              </foreignObject>
              <text
                x={pos.x}
                y={pos.y + 55}
                textAnchor="middle"
                fill={active ? '#f1c75b' : '#d5d0c7'}
                fontSize="12.5"
                fontWeight="600"
                fontFamily="DM Sans, sans-serif"
                letterSpacing="0.015em"
              >
                {locale === 'es' ? unit.es : unit.en}
              </text>
            </g>
          );
        })}

        <g>
          <circle cx={CENTER} cy={CENTER} r="92" fill="url(#networkCenterGlow)" />
          <circle cx={CENTER} cy={CENTER} r="77" fill="none" stroke={BLUE} strokeOpacity="0.11" strokeWidth="0.9" strokeDasharray="3 8">
            {!reduceMotion && <animateTransform attributeName="transform" type="rotate" from={`360 ${CENTER} ${CENTER}`} to={`0 ${CENTER} ${CENTER}`} dur="46s" repeatCount="indefinite" />}
          </circle>
          <circle cx={CENTER} cy={CENTER} r="64" fill="none" stroke={GOLD} strokeOpacity="0.38" strokeWidth="1" strokeDasharray="7 6">
            {!reduceMotion && <animateTransform attributeName="transform" type="rotate" from={`0 ${CENTER} ${CENTER}`} to={`360 ${CENTER} ${CENTER}`} dur="64s" repeatCount="indefinite" />}
          </circle>
          <circle cx={CENTER} cy={CENTER} r="55" fill="#04080d" stroke={GOLD_LIGHT} strokeOpacity="0.96" strokeWidth="1.45" filter="url(#softGoldGlow)" />
          <circle cx={CENTER} cy={CENTER} r="46" fill="rgba(214,174,86,0.035)" stroke={BLUE} strokeOpacity="0.14" strokeWidth="0.8" />
          <image
            href="/images/logo/ctg-one-coin-icon.png"
            x="218"
            y="218"
            width="84"
            height="84"
            preserveAspectRatio="xMidYMid meet"
            clipPath="url(#centerLogoClip)"
          />
          {!reduceMotion && (
            <circle cx={CENTER} cy={CENTER} r="58" fill="none" stroke={GOLD_LIGHT} strokeWidth="0.8" opacity="0.1">
              <animate attributeName="r" values="58;72;58" dur="6s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.12;0.02;0.12" dur="6s" repeatCount="indefinite" />
            </circle>
          )}
        </g>

        <g fill="#9a9a9a" fontFamily="DM Sans, sans-serif" fontSize="7.5" letterSpacing="0.12em" opacity="0.42">
          <text x="28" y="54">CTG/CORE-01</text>
          <text x="410" y="54">NET 08/08</text>
          <text x="28" y="486">SYNC 100</text>
          <text x="418" y="486">CARTAGENA</text>
        </g>
      </svg>
    </div>
  );
});
