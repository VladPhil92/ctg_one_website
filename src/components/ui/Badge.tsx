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
  // Variant styles - Ultra Minimal
  const variantStyles: Record<string, React.CSSProperties> = {
    default: {
      color: '#5a5a5a',
    },
    accent: {
      color: '#c9a962',
    },
  };

  return (
    <div
      className={`
        inline-flex items-center
        uppercase tracking-[0.2em] font-medium
        text-[10px]
        ${className}
      `.trim()}
      style={variantStyles[variant]}
    >
      {variant === 'accent' && (
        <span
          className="w-1.5 h-px mr-3"
          style={{ backgroundColor: '#c9a962' }}
        />
      )}
      {children}
    </div>
  );
};
