'use client';

import React from 'react';

interface AuthInputProps {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  onEnter?: () => void;
  required?: boolean;
  minLength?: number;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  description?: string;
}

export const AuthInput: React.FC<AuthInputProps> = ({
  label,
  type = 'text',
  value,
  onChange,
  autoComplete,
  onEnter,
  required = false,
  minLength,
  inputMode,
  description,
}) => {
  const inputId = React.useId();
  const descriptionId = description ? `${inputId}-description` : undefined;

  return (
    <div className="block mb-4">
      <label
        htmlFor={inputId}
        className="block text-[11px] uppercase tracking-[0.15em] text-text-dim mb-2"
      >
        {label}
        {required && <span className="ml-1 text-accent" aria-hidden="true">*</span>}
      </label>
      <input
        id={inputId}
        aria-label={label}
        aria-describedby={descriptionId}
        aria-required={required || undefined}
        required={required}
        minLength={minLength}
        inputMode={inputMode}
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && onEnter) onEnter();
        }}
        className="min-h-11 w-full rounded-lg px-4 py-3 text-sm text-white outline-none transition-colors duration-300 focus:border-accent"
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border)',
        }}
      />
      {description && (
        <p id={descriptionId} className="mt-2 text-[11px] leading-relaxed text-text-dim">
          {description}
        </p>
      )}
    </div>
  );
};