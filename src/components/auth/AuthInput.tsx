'use client';

import React from 'react';

interface AuthInputProps {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  onEnter?: () => void;
}

export const AuthInput: React.FC<AuthInputProps> = ({
  label,
  type = 'text',
  value,
  onChange,
  autoComplete,
  onEnter,
}) => {
  const inputId = React.useId();

  return (
    <div className="block mb-4">
      <label
        htmlFor={inputId}
        className="block text-[11px] uppercase tracking-[0.15em] text-text-dim mb-2"
      >
        {label}
      </label>
      <input
        id={inputId}
        aria-label={label}
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && onEnter) onEnter();
        }}
        className="w-full px-4 py-3 rounded-lg text-sm text-white outline-none transition-colors duration-300 focus:border-accent"
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border)',
        }}
      />
    </div>
  );
};
