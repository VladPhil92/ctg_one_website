'use client';

import React, { ReactNode } from 'react';
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
  type?: 'button' | 'submit' | 'reset';
  ariaLabel?: string;
}

const SIZE_CLASSES = {
  sm: 'min-h-11 px-5 py-2.5 text-xs',
  md: 'min-h-11 px-7 py-3 text-[13px]',
  lg: 'min-h-12 px-9 py-3.5 text-sm',
} as const;

const VARIANT_CLASSES = {
  primary: 'bg-accent text-bg-primary hover:bg-accent-light',
  secondary: 'border border-white/15 bg-transparent text-text-secondary hover:border-white/30 hover:text-white',
  ghost: 'bg-transparent text-text-muted hover:bg-white/[.035] hover:text-white',
  outline: 'border border-accent/35 bg-transparent text-accent hover:border-accent/65 hover:bg-accent/[.045]',
} as const;

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
  type = 'button',
  ariaLabel,
}) => {
  const isDisabled = disabled || loading;
  const baseClasses = [
    'group relative inline-flex items-center justify-center gap-3 rounded font-dm-sans font-semibold uppercase tracking-[0.1em]',
    'transition-[background-color,border-color,color,opacity,transform] duration-300 ease-elegant',
    SIZE_CLASSES[size],
    VARIANT_CLASSES[variant],
    isDisabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer',
    fullWidth ? 'w-full' : '',
    className,
  ].filter(Boolean).join(' ');

  const content = (
    <>
      {loading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
      {!loading && icon && iconPosition === 'left' && icon}
      <span>{children}</span>
      {!loading && icon && iconPosition === 'right' && icon}
      {!loading && arrow && (
        <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden="true" />
      )}
    </>
  );

  if (href && !isDisabled) {
    const opensNewTab = /^https?:\/\//.test(href);
    return (
      <a
        href={href}
        className={baseClasses}
        aria-label={ariaLabel}
        onClick={onClick}
        target={opensNewTab ? '_blank' : undefined}
        rel={opensNewTab ? 'noopener noreferrer' : undefined}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      className={baseClasses}
      aria-label={ariaLabel}
      onClick={onClick}
      disabled={isDisabled}
      type={type}
    >
      {content}
    </button>
  );
};
