'use client';

import React, { useState } from 'react';
import { z } from 'zod';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
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

const registerSchema = z.object({
  fullName: z.string().trim().min(2),
  phone: z.string().trim().min(7),
  email: z.string().trim().email(),
});

export default function RegistroPage() {
  const { locale } = useLanguage();
  const es = locale === 'es';
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  const copy = es
    ? {
        title: 'Crear cuenta',
        subtitle: 'Crea una identidad para acceder al ecosistema CTG One.',
        fullName: 'Nombre completo',
        phone: 'Teléfono',
        email: 'Correo electrónico',
        password: 'Contraseña',
        invalidName: 'Ingresa tu nombre completo.',
        invalidPhone: 'Ingresa un teléfono válido.',
        invalidEmail: 'Ingresa un correo electrónico válido.',
        unavailable: 'El registro no está disponible en este momento. Inténtalo más tarde.',
        submit: 'Crear cuenta',
        existing: '¿Ya tienes cuenta?',
        signIn: 'Inicia sesión',
        checkTitle: 'Revisa tu correo',
        checkPrefix: 'Enviamos un enlace de confirmación a',
        checkSuffix: 'Confírmalo para activar tu cuenta y continuar.',
      }
    : {
        title: 'Create account',
        subtitle: 'Create one identity to access the CTG One ecosystem.',
        fullName: 'Full name',
        phone: 'Phone',
        email: 'Email',
        password: 'Password',
        invalidName: 'Enter your full name.',
        invalidPhone: 'Enter a valid phone number.',
        invalidEmail: 'Enter a valid email address.',
        unavailable: 'Registration is not available right now. Try again later.',
        submit: 'Create account',
        existing: 'Already have an account?',
        signIn: 'Sign in',
        checkTitle: 'Check your email',
        checkPrefix: 'We sent a confirmation link to',
        checkSuffix: 'Confirm it to activate your account and continue.',
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
      const { error: signUpError } = await supabase.auth.signUp({
        email: parsed.data.email,
        password,
        options: {
          data: { full_name: parsed.data.fullName, phone: parsed.data.phone },
          emailRedirectTo: `${siteUrl}/auth/callback?next=/dashboard`,
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
      <p className="mb-8 text-sm leading-relaxed text-text-muted">{copy.subtitle}</p>

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
        <a href="/iniciar-sesion" className="inline-flex min-h-11 items-center text-accent hover:underline">{copy.signIn}</a>
      </p>
    </form>
  );
}
