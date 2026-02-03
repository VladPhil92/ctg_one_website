'use client';

import React, { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
  variant?: 'default' | 'glass' | 'bordered' | 'gradient';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  hover = false,
  onClick,
  variant = 'default',
  padding = 'md',
}) => {
  // Padding styles - More generous
  const paddingClasses = {
    none: '',
    sm: 'p-5',
    md: 'p-7 md:p-9',
    lg: 'p-9 md:p-12',
  };

  // Variant styles - Ultra Minimal
  const variantStyles: Record<string, React.CSSProperties> = {
    default: {
      backgroundColor: 'rgba(12, 12, 12, 0.8)',
      border: '1px solid rgba(255, 255, 255, 0.03)',
    },
    glass: {
      backgroundColor: 'rgba(255, 255, 255, 0.01)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.03)',
    },
    bordered: {
      backgroundColor: 'transparent',
      border: '1px solid rgba(255, 255, 255, 0.04)',
    },
    gradient: {
      background: 'linear-gradient(145deg, rgba(255,255,255,0.015) 0%, rgba(255,255,255,0.005) 100%)',
      border: '1px solid rgba(255, 255, 255, 0.03)',
    },
  };

  return (
    <div
      onClick={onClick}
      className={`
        rounded-lg
        transition-all duration-500 ease-elegant
        ${paddingClasses[padding]}
        ${hover ? 'hover:border-[rgba(255,255,255,0.06)]' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `.trim()}
      style={variantStyles[variant]}
    >
      {children}
    </div>
  );
};

// ============================================
// STAT CARD
// ============================================
interface StatCardProps {
  value: string;
  label: string;
  suffix?: string;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  value,
  label,
  suffix,
  className = '',
}) => {
  return (
    <div className={className}>
      <div className="flex items-baseline gap-1 mb-1">
        <span className="text-2xl font-outfit font-medium text-white">
          {value}
        </span>
        {suffix && (
          <span className="text-sm text-text-dim">{suffix}</span>
        )}
      </div>
      <p className="text-[10px] text-text-dim uppercase tracking-[0.15em]">
        {label}
      </p>
    </div>
  );
};
