'use client';

import React, { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'accent';
  glow?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  className = '',
  variant = 'default',
  glow = false,
}) => {
  const variantStyles: Record<string, React.CSSProperties> = {
    default: { color: 'var(--text-dim)' },
    accent: {
      color: 'var(--accent)',
      textShadow: glow ? '0 0 24px rgba(201,169,98,.28)' : undefined,
    },
  };

  return (
    <div
      className={`inline-flex items-center text-[11px] sm:text-xs uppercase tracking-[0.18em] font-semibold leading-snug ${className}`.trim()}
      style={variantStyles[variant]}
    >
      {variant === 'accent' && (
        <span className="w-4 h-px mr-3 bg-accent/80" aria-hidden="true" />
      )}
      {children}
    </div>
  );
};
