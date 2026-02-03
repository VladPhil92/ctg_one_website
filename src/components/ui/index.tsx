'use client';

import React, { ReactNode } from 'react';
import { Badge } from './Badge';

// ============================================
// EXPORTS
// ============================================
export { Card, StatCard } from './Card';
export { Button } from './Button';
export { Badge } from './Badge';
export { FadeInSection, StaggeredContainer, StaggeredItem } from './FadeInSection';

// ============================================
// CONTAINER
// ============================================
interface ContainerProps {
  children: ReactNode;
  className?: string;
  size?: 'default' | 'small' | 'large';
}

export const Container: React.FC<ContainerProps> = ({ 
  children, 
  className = '',
  size = 'default'
}) => {
  const maxWidthClass = {
    small: 'max-w-4xl',
    default: 'max-w-6xl',
    large: 'max-w-7xl',
  }[size];

  return (
    <div className={`w-full ${maxWidthClass} mx-auto px-8 lg:px-12 ${className}`}>
      {children}
    </div>
  );
};

// ============================================
// SECTION HEADER
// ============================================
interface SectionHeaderProps {
  badge?: string;
  title: string;
  titleHighlight?: string;
  description?: string;
  centered?: boolean;
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  badge,
  title,
  titleHighlight,
  description,
  centered = true,
  className = '',
}) => {
  return (
    <div className={`${centered ? 'text-center' : ''} ${className}`}>
      {badge && <Badge variant="accent" className="mb-10">{badge}</Badge>}
      <h2 className="text-3xl md:text-4xl font-outfit font-semibold mb-6 tracking-tight">
        {title}{' '}
        {titleHighlight && (
          <span className="text-accent">{titleHighlight}</span>
        )}
      </h2>
      {description && (
        <p className="text-base text-text-muted max-w-xl mx-auto leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
};

// ============================================
// GRADIENT TEXT
// ============================================
interface GradientTextProps {
  children: ReactNode;
  className?: string;
  variant?: 'primary' | 'secondary';
}

export const GradientText: React.FC<GradientTextProps> = ({
  children,
  className = '',
  variant = 'primary',
}) => {
  const gradientClass = variant === 'primary' ? 'gradient-text' : 'gradient-text-blue';
  return <span className={`${gradientClass} ${className}`}>{children}</span>;
};

// ============================================
// ICON BOX
// ============================================
interface IconBoxProps {
  icon: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  className?: string;
}

export const IconBox: React.FC<IconBoxProps> = ({
  icon,
  size = 'md',
  color = 'var(--accent)',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  return (
    <div
      className={`
        flex items-center justify-center
        rounded-xl
        ${sizeClasses[size]}
        ${className}
      `}
      style={{
        backgroundColor: `${color}15`,
        color: color,
      }}
    >
      {icon}
    </div>
  );
};

// ============================================
// DIVIDER
// ============================================
interface DividerProps {
  className?: string;
}

export const Divider: React.FC<DividerProps> = ({ className = '' }) => (
  <div className={`section-divider ${className}`} />
);
