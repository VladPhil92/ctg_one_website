'use client';

import React, { ReactNode, CSSProperties } from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';

interface ButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  href?: string;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  arrow?: boolean;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  href,
  onClick,
  className = '',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'right',
  arrow = false,
  fullWidth = false,
}) => {
  const isDisabled = disabled || loading;

  // Size styles - Elegant
  const sizeClasses: Record<string, string> = {
    sm: 'px-6 py-3 text-[11px]',
    md: 'px-8 py-3.5 text-[12px]',
    lg: 'px-10 py-4 text-[12px]',
  };

  // Variant styles - Minimal & Elegant
  const variantStyles: Record<string, CSSProperties> = {
    primary: {
      background: '#c9a962',
      color: '#050505',
    },
    secondary: {
      background: 'transparent',
      color: '#e5e5e5',
      border: '1px solid rgba(255, 255, 255, 0.06)',
    },
    ghost: {
      background: 'transparent',
      color: '#8a8a8a',
    },
    outline: {
      background: 'transparent',
      color: '#c9a962',
      border: '1px solid rgba(201, 169, 98, 0.2)',
    },
  };

  const baseClasses = `
    relative
    inline-flex items-center justify-center
    font-medium font-dm-sans
    rounded
    transition-all duration-500 ease-elegant
    uppercase tracking-[0.15em]
    gap-3
    ${isDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:opacity-80'}
    ${fullWidth ? 'w-full' : ''}
    ${sizeClasses[size]}
    ${className}
  `.trim();

  const style: CSSProperties = {
    ...variantStyles[variant],
  };

  const content = (
    <>
      {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
      {!loading && icon && iconPosition === 'left' && icon}
      <span>{children}</span>
      {!loading && icon && iconPosition === 'right' && icon}
      {!loading && arrow && (
        <ArrowRight className="w-3.5 h-3.5 transition-transform duration-500 group-hover:translate-x-0.5" />
      )}
    </>
  );

  // Render as link or button
  if (href && !isDisabled) {
    const isExternal = href.startsWith('http') || href.startsWith('mailto:');
    return (
      <a
        href={href}
        className={`group ${baseClasses}`}
        style={style}
        target={isExternal ? '_blank' : undefined}
        rel={isExternal ? 'noopener noreferrer' : undefined}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      className={`group ${baseClasses}`}
      style={style}
      onClick={onClick}
      disabled={isDisabled}
      type="button"
    >
      {content}
    </button>
  );
};
