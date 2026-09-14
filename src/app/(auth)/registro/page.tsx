'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { z } from 'zod';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { getAnalyticsAnonymousId, trackFunnelEvent } from '@/lib/analytics/client';
import { Button } from '@/components/ui/Button';
import { AuthInput } from '@/components/auth/AuthInput';
import { PasswordRequirements } from '@/components/auth/PasswordRequirements';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  PASSWORD_MIN_LENGTH,
  authErrorMessage,
  normalizeEmail,
  strongPasswordError,
} from '@/lib/auth/client-policy';
import { safeRedirectPath } from '@/lib/security/safe-redirect';

const registerSchema = z.object({
  fullName: z.string().trim().min(2),
  phone: z.string().trim().min(7),
  email: z.string().trim().email(),
});

export default function RegistroPage() {
  return (
    <Suspense fallback={null}>
      <RegistroForm />
    </Suspense>
  );
}

function RegistroForm() {
  const searchParams = useSearchParams();
  const { locale } = useLanguage();
  const es = locale === 'es';
  const redirectTo = safeRedirectPath(searchParams.get('next'), '/dashboard');
  const isWorldMakersFlow = redirectTo.startsWith('/worldmakers');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  const copy = es
    ? {
        title: isWorldMakersFlow ? 'Crear cuenta para World Makers' : 'Crear cuenta',
        subtitle: isWorldMakersFlow
          ? 'Crea tu identidad CTG One y úsala como tu cuenta de jugador de World Makers.'
          : 'Crea tu identidad CTG One y reúne en una sola cuenta las funciones que ya están habilitadas para ti.',
        valueTitle: isWorldMakersFlow ? 'Tu cuenta de jugador' : 'Con tu cuenta puedes',
        valueItems: isWorldMakersFlow
          ? [
              'Entrar a tu espacio personal de World Makers.',
              'Conservar una sola identidad para World Makers y CTG One.',
              'Quedar preparado para futuras funciones de progreso, mundos y comunidad cuando estén disponibles.',
            ]
          : [
              'Entrar a tu dashboard personal y gestionar tu identidad.',
              'Consultar Wallet, saldo y actividad cuando estén habilitados para tu perfil.',
              'Conservar accesos de inversión y educación vinculados a la misma cuenta.',
            ],
        truthNote: isWorldMakersFlow
          ? 'Crear tu cuenta prepara tu identidad de jugador, pero no implica acceso inmediato a una beta jugable. Si eres menor de edad, pide a tu madre, padre o tutor que gestione el registro contigo.'
          : 'CTG Rewards está en Foundation v1: la infraestructura de cuenta existe, pero crear tu cuenta no activa acumulación ni redención de puntos.',
        fullName: 'Nombre completo',
        phone: 'Teléfono',
        email: 'Correo electrónico',
        password: 'Contraseña',
        invalidName: 'Ingresa tu nombre completo.',
        invalidPhone: 'Ingresa un teléfono válido.',
        invalidEmail: 'Ingresa un correo electrónico válido.',
        unavailable: 'El registro no está disponible en este momento. Inténtalo más tarde.',
        submit: isWorldMakersFlow ? 'Crear mi cuenta de World Makers' : 'Crear mi cuenta CTG One',
        existing: '¿Ya tienes cuenta?',
        signIn: 'Inicia sesión',
        checkTitle: 'Revisa tu correo',
        checkPrefix: 'Enviamos un enlace de confirmación a',
        checkSuffix: isWorldMakersFlow
          ? 'Confírmalo para activar tu identidad y continuar a tu espacio de World Makers.'
          : 'Confírmalo para activar tu cuenta y entrar a tu centro de control CTG One.',
      }
    : {
        title: isWorldMakersFlow ? 'Create your World Makers account' : 'Create account',
        subtitle: isWorldMakersFlow
          ? 'Create your CTG One identity and use it as your World Makers player account.'
          : 'Create your CTG One identity and bring the capabilities already enabled for you into one account.',
        valueTitle: isWorldMakersFlow ? 'Your player account' : 'With your account you can',
        valueItems: isWorldMakersFlow
          ? [
              'Enter your personal World Makers space.',
              'Keep one identity across World Makers and CTG One.',
              'Be ready for future progress, worlds and community features when they become available.',
            ]
          : [
              'Enter your personal dashboard and manage your identity.',
              'Review Wallet balance and activity when enabled for your profile.',
              'Keep investment and education access linked to the same account.',
            ],
        truthNote: isWorldMakersFlow
          ? 'Creating an account prepares your player identity but does not grant immediate access to a playable beta. If you are under 18, ask a parent or guardian to manage registration with you.'
          : 'CTG Rewards is in Foundation v1: the account infrastructure exists, but creating your account does not activate point earning or redemption.',
        fullName: 'Full name',
        phone: 'Phone',
        email: 'Email',
        password: 'Password',
        invalidName: 'Enter your full name.',
        invalidPhone: 'Enter a valid phone number.',
        invalidEmail: 'Enter a valid email address.',
        unavailable: 'Registration is not available right now. Try again later.',
        submit: isWorldMakersFlow ? 'Create my World Makers account' : 'Create my CTG One account',
        existing: 'Already have an account?',
        signIn: 'Sign in',
        checkTitle: 'Check your email',
        checkPrefix: 'We sent a confirmation link to',
        checkSuffix: isWorldMakersFlow
          ? 'Confirm it to activate your identity and continue to your World Makers space.'
          : 'Confirm it to activate your account and enter your CTG One control center.',
      };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setError(null);

    const normalized = {
      fullName: fullName.trim(),
      phone: phone.trim(),
      email: normalizeEmail(email),
    };
    const parsed = registerSchema.safeParse(normalized);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const field = issue?.path[0];
      setError(field === 'fullName' ? copy.invalidName : field === 'phone' ? copy.invalidPhone : copy.invalidEmail);
      return;
    }

    const passwordError = strongPasswordError(password, locale);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (!isSupabaseConfigured) {
      setError(copy.unavailable);
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
      const analyticsAnonymousId = getAnalyticsAnonymousId();
      const redirectOptions = redirectTo === '/dashboard'
        ? { emailRedirectTo: `${siteUrl}/auth/callback?next=/dashboard` }
        : { emailRedirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(redirectTo)}` };
      void trackFunnelEvent('signup_started', { sourcePath: isWorldMakersFlow ? '/worldmakers' : '/registro' });
      const { error: signUpError } = await supabase.auth.signUp({
        email: parsed.data.email,
        password,
        options: {
          data: {
            full_name: parsed.data.fullName,
            phone: parsed.data.phone,
            analytics_anonymous_id: analyticsAnonymousId,
          },
          ...redirectOptions,
        },
      });
      if (signUpError) throw signUpError;
      setEmail(parsed.data.email);
      setSubmittedEmail(parsed.data.email);
    } catch (err) {
      setError(authErrorMessage(err, locale, 'signup'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submittedEmail) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-5 h-11 w-11 rounded-full border border-accent/25 bg-accent/[0.05]" aria-hidden="true" />
        <h1 className="mb-3 font-outfit text-xl font-semibold text-white">{copy.checkTitle}</h1>
        <p className="text-sm leading-relaxed text-text-muted">
          {copy.checkPrefix} <strong className="break-all text-white">{submittedEmail}</strong>. {copy.checkSuffix}
        </p>
      </div>
    );
  }

  return (
    <form noValidate onSubmit={(event) => { event.preventDefault(); void handleSubmit(); }}>
      <h1 className="mb-1 font-outfit text-2xl font-semibold tracking-tight text-white">{copy.title}</h1>
      <p className="text-sm leading-relaxed text-text-muted">{copy.subtitle}</p>

      <div className="mb-7 mt-5 rounded-2xl border border-accent/15 bg-accent/[0.035] p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">{copy.valueTitle}</p>
        <ul className="mt-3 space-y-2">
          {copy.valueItems.map((item) => (
            <li key={item} className="flex gap-2 text-xs leading-relaxed text-text-muted">
              <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 border-t border-white/[0.07] pt-3 text-[11px] leading-relaxed text-text-dim">{copy.truthNote}</p>
      </div>

      <AuthInput label={copy.fullName} value={fullName} onChange={setFullName} autoComplete="name" required />
      <AuthInput label={copy.phone} type="tel" value={phone} onChange={setPhone} autoComplete="tel" inputMode="tel" required />
      <AuthInput label={copy.email} type="email" value={email} onChange={setEmail} autoComplete="email" inputMode="email" required />
      <AuthInput
        label={copy.password}
        type="password"
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
        minLength={PASSWORD_MIN_LENGTH}
        required
      />
      <PasswordRequirements password={password} locale={locale} />

      {error && (
        <p role="alert" className="mb-4 text-sm leading-relaxed" style={{ color: 'var(--error)' }}>{error}</p>
      )}

      <Button type="submit" loading={isSubmitting} variant="primary" size="md" fullWidth>
        {copy.submit}
      </Button>

      <p className="mt-6 text-center text-xs text-text-dim">
        {copy.existing}{' '}
        <Link
          href={`/iniciar-sesion?next=${encodeURIComponent(redirectTo)}`}
          className="inline-flex min-h-11 items-center text-accent hover:underline"
        >
          {copy.signIn}
        </Link>
      </p>
    </form>
  );
}
