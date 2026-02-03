'use client';

import React, { useEffect, useState, useCallback, memo } from 'react';
import { motion } from 'framer-motion';
import {
  Brain,
  TrendingUp,
  Building2,
  GraduationCap,
  Heart,
  Scale,
  Palette,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

interface BusinessUnit {
  id: string;
  label: string;
  icon: LucideIcon;
  color: string;
}

const units: BusinessUnit[] = [
  { id: 'ai', label: 'AI Strategy', icon: Brain, color: '#d4a259' },
  { id: 'commerce', label: 'Commerce', icon: TrendingUp, color: '#6b8cae' },
  { id: 'hospitality', label: 'Hospitality', icon: Building2, color: '#7da87d' },
  { id: 'education', label: 'Education', icon: GraduationCap, color: '#9a8cae' },
  { id: 'health', label: 'Health', icon: Heart, color: '#ae8c9a' },
  { id: 'legal', label: 'Legal', icon: Scale, color: '#8c9aae' },
  { id: 'design', label: 'Design', icon: Palette, color: '#7dae9a' },
  { id: 'fintech', label: 'Fintech', icon: Wallet, color: '#c4956a' },
];

// Calculate positions in a circle
const getNodePosition = (index: number, total: number, radius: number = 150) => {
  const angle = (index / total) * Math.PI * 2 - Math.PI / 2;
  return {
    x: 200 + radius * Math.cos(angle),
    y: 200 + radius * Math.sin(angle),
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
  const [rotationAngle, setRotationAngle] = useState(0);

  // Very slow rotation animation - subtle elegance
  useEffect(() => {
    const interval = setInterval(() => {
      setRotationAngle((prev) => (prev + 0.05) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Memoized hover handlers
  const handleMouseEnter = useCallback((unitId: string) => {
    if (interactive) setHoveredNode(unitId);
  }, [interactive]);

  const handleMouseLeave = useCallback(() => {
    setHoveredNode(null);
  }, []);

  const svgSize = size === 'sm' ? 320 : size === 'lg' ? 500 : 400;

  return (
    <div className="flex flex-col items-center justify-center">
      <svg
        width={svgSize}
        height={svgSize}
        viewBox="0 0 400 400"
        className="drop-shadow-2xl"
      >
        <defs>
          {/* Gradients for each unit - More subtle */}
          {units.map((unit) => (
            <radialGradient key={`gradient-${unit.id}`} id={`glow-${unit.id}`}>
              <stop offset="0%" stopColor={unit.color} stopOpacity="0.3" />
              <stop offset="100%" stopColor={unit.color} stopOpacity="0" />
            </radialGradient>
          ))}

          {/* Center glow gradient - Refined */}
          <radialGradient id="centerGlow">
            <stop offset="0%" stopColor="#d4a259" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#d4a259" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#d4a259" stopOpacity="0" />
          </radialGradient>

          {/* Static gradient for connections */}
          <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#d4a259" stopOpacity="0.05" />
            <stop offset="50%" stopColor="#d4a259" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#d4a259" stopOpacity="0.05" />
          </linearGradient>

          {/* Blur filter */}
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Background circles */}
        <circle
          cx="200"
          cy="200"
          r="170"
          fill="none"
          stroke="rgba(255, 255, 255, 0.03)"
          strokeWidth="1"
          strokeDasharray="4 4"
          style={{ transform: `rotate(${rotationAngle}deg)`, transformOrigin: '200px 200px' }}
        />
        <circle
          cx="200"
          cy="200"
          r="150"
          fill="none"
          stroke="rgba(255, 255, 255, 0.04)"
          strokeWidth="1"
        />
        <circle
          cx="200"
          cy="200"
          r="95"
          fill="none"
          stroke="rgba(255, 255, 255, 0.03)"
          strokeWidth="1"
          strokeDasharray="8 8"
          style={{ transform: `rotate(${-rotationAngle * 0.5}deg)`, transformOrigin: '200px 200px' }}
        />

        {/* Connection lines */}
        {units.map((unit, index) => {
          const pos = getNodePosition(index, units.length);
          const isHovered = hoveredNode === unit.id;

          return (
            <g key={`connection-${unit.id}`}>
              {/* Base connection */}
              <line
                x1="200"
                y1="200"
                x2={pos.x}
                y2={pos.y}
                stroke={isHovered ? unit.color : 'rgba(255, 255, 255, 0.08)'}
                strokeWidth={isHovered ? 2 : 1}
                style={{ transition: 'all 0.3s ease' }}
              />

              {/* Animated pulse on connection */}
              {isHovered && (
                <line
                  x1="200"
                  y1="200"
                  x2={pos.x}
                  y2={pos.y}
                  stroke={unit.color}
                  strokeWidth="4"
                  strokeLinecap="round"
                  opacity="0.3"
                  filter="url(#glow)"
                />
              )}
            </g>
          );
        })}

        {/* Unit Nodes */}
        {units.map((unit, index) => {
          const Icon = unit.icon;
          const pos = getNodePosition(index, units.length);
          const isHovered = hoveredNode === unit.id;

          return (
            <g
              key={`node-${unit.id}`}
              style={{ cursor: interactive ? 'pointer' : 'default' }}
              onMouseEnter={() => handleMouseEnter(unit.id)}
              onMouseLeave={handleMouseLeave}
            >
              {/* Glow effect on hover */}
              {isHovered && (
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r="40"
                  fill={`url(#glow-${unit.id})`}
                />
              )}

              {/* Node background - More subtle */}
              <motion.circle
                cx={pos.x}
                cy={pos.y}
                r="24"
                fill="rgba(15, 15, 18, 0.95)"
                stroke={isHovered ? unit.color : 'rgba(255, 255, 255, 0.06)'}
                strokeWidth={isHovered ? 1 : 0.5}
                animate={{
                  scale: isHovered ? 1.08 : 1,
                }}
                transition={{ duration: 0.4, ease: [0.33, 1, 0.68, 1] }}
                style={{ transformOrigin: `${pos.x}px ${pos.y}px` }}
              />

              {/* Icon container */}
              <foreignObject
                x={pos.x - 12}
                y={pos.y - 12}
                width="24"
                height="24"
              >
                <div
                  className="flex items-center justify-center w-6 h-6 transition-transform duration-300"
                  style={{ transform: isHovered ? 'scale(1.1)' : 'scale(1)' }}
                >
                  <Icon
                    size={18}
                    color={isHovered ? unit.color : '#a1a1aa'}
                    strokeWidth={1.5}
                  />
                </div>
              </foreignObject>

              {/* Label - only show if not overlapping center */}
              <text
                x={pos.x}
                y={pos.y + 42}
                textAnchor="middle"
                fill={isHovered ? unit.color : '#71717a'}
                fontSize="10"
                fontWeight="500"
                fontFamily="DM Sans, sans-serif"
                opacity={isHovered ? 1 : 0.6}
              >
                {unit.label}
              </text>
            </g>
          );
        })}

        {/* Center - CTG One Token (rendered last to be on top) */}
        <g>
          {/* Outer glow */}
          <circle
            cx="200"
            cy="200"
            r="60"
            fill="url(#centerGlow)"
          />

          {/* Static ring - no animation for elegance */}
          <circle
            cx="200"
            cy="200"
            r="48"
            fill="none"
            stroke="#d4a259"
            strokeWidth="0.5"
            strokeDasharray="6 6"
            opacity="0.4"
          />

          {/* Core circle - static, solid background */}
          <circle
            cx="200"
            cy="200"
            r="40"
            fill="#09090b"
            stroke="#d4a259"
            strokeWidth="1"
          />

          {/* Inner glow */}
          <circle
            cx="200"
            cy="200"
            r="28"
            fill="rgba(212, 162, 89, 0.08)"
          />

          {/* Center text */}
          <text
            x="200"
            y="196"
            textAnchor="middle"
            fill="#d4a259"
            fontSize="14"
            fontWeight="600"
            fontFamily="Outfit, sans-serif"
            letterSpacing="0.05em"
          >
            CTG
          </text>
          <text
            x="200"
            y="212"
            textAnchor="middle"
            fill="#71717a"
            fontSize="9"
            fontFamily="DM Sans, sans-serif"
            letterSpacing="0.15em"
          >
            ONE
          </text>
        </g>
      </svg>
    </div>
  );
});
