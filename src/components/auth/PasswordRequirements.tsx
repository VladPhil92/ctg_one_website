'use client';

import React from 'react';
import { Check, Circle } from 'lucide-react';
import type { Locale } from '@/i18n/translations';
import { PASSWORD_REQUIREMENTS, passwordRequirementCopy } from '@/lib/auth/client-policy';

export function PasswordRequirements({ password, locale }: { password: string; locale: Locale }) {
  const copy = passwordRequirementCopy(locale);

  return (
    <div className="-mt-1 mb-5 rounded-lg border border-white/[0.06] bg-white/[0.015] px-4 py-3" aria-live="polite">
      <p className="mb-2 text-[11px] font-medium text-text-muted">{copy.title}</p>
      <ul className="grid gap-1.5 sm:grid-cols-2">
        {PASSWORD_REQUIREMENTS.map((requirement) => {
          const met = requirement.test(password);
          return (
            <li key={requirement.id} className={`flex items-center gap-2 text-[11px] ${met ? 'text-text-secondary' : 'text-text-dim'}`}>
              {met ? (
                <Check size={13} className="shrink-0 text-success" aria-hidden="true" />
              ) : (
                <Circle size={10} className="shrink-0 text-text-dim" aria-hidden="true" />
              )}
              <span>{copy[requirement.id]}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
