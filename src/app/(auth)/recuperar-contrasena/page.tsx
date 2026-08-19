'use client';

import React, { useState } from 'react';
import { z } from 'zod';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { AuthInput } from '@/components/auth/AuthInput';
import { useLanguage } from '@/contexts/LanguageContext';
import { authErrorMessage, normalizeEmail } from '@/lib/auth/client-policy';

const schema = z.object({ email: z.string().trim().email() });

export default function RecuperarContrasenaPage() {
  const { locale } = useLanguage();
  const es = locale === 'es';
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sentEmail, setSentEmail] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const copy = es
    ? {
        title: 'Recuperar contraseña',
        subtitle: 'Te enviaremos un enlace seguro para definir una contraseña nueva.',
        email: 'Correo electrónico',
        invalidEmail: 'Ingresa un correo electrónico válido.',
        unavailable: 'La recuperación de contraseña no está disponible en este momento.',
        submit: 'Enviar enlace',
        back: 'Volver a iniciar sesión',
        sentTitle: 'Revisa tu correo',
        sentPrefix: 'Si existe una cuenta asociada a',
        sentSuffix: 'recibirás un enlace para restablecer la contraseña.',
      }
    : {
        title: 'Recover password',
        subtitle: 'We will send you a secure link to choose a new password.',
        email: 'Email',
        invalidEmail: 'Enter a valid email address.',
        unavailable: 'Password recovery is not available right now.',
        submit: 'Send recovery link',
        back: 'Back to sign in',
        sentTitle: 'Check your email',
        sentPrefix: 'If an account is associated with',
        sentSuffix: 'you will receive a password-reset link.',
      };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setError(null);

    const normalizedEmail = normalizeEmail(email);
    const parsed = schema.safeParse({ email: normalizedEmail });
    if (!parsed.success) {
      setError(copy.invalidEmail);
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
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
        redirectTo: `${siteUrl}/auth/callback?next=/restablecer-contrasena`,
      });
      if (resetError) throw resetError;
      setEmail(parsed.data.email);
      setSentEmail(parsed.data.email);
    } catch (err) {
      setError(authErrorMessage(err, locale, 'recovery'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (sentEmail) {
    return (
      <div className="text-center">
        <h1 className="mb-3 font-outfit text-xl font-semibold text-white">{copy.sentTitle}</h1>
        <p className="text-sm leading-relaxed text-text-muted">
          {copy.sentPrefix} <strong className="break-all text-white">{sentEmail}</strong>, {copy.sentSuffix}
        </p>
        <a href="/iniciar-sesion" className="mt-6 inline-flex min-h-11 items-center text-sm text-accent hover:underline">{copy.back}</a>
      </div>
    );
  }

  return (
    <form noValidate onSubmit={(event) => { event.preventDefault(); void handleSubmit(); }}>
      <h1 className="mb-1 font-outfit text-2xl font-semibold tracking-tight text-white">{copy.title}</h1>
      <p className="mb-8 text-sm leading-relaxed text-text-muted">{copy.subtitle}</p>
      <AuthInput label={copy.email} type="email" value={email} onChange={setEmail} autoComplete="email" inputMode="email" required />
      {error && <p role="alert" className="mb-4 text-sm leading-relaxed" style={{ color: 'var(--error)' }}>{error}</p>}
      <Button type="submit" loading={isSubmitting} variant="primary" size="md" fullWidth>
        {copy.submit}
      </Button>
      <p className="mt-6 text-center text-xs text-text-dim">
        <a href="/iniciar-sesion" className="inline-flex min-h-11 items-center text-accent hover:underline">{copy.back}</a>
      </p>
    </form>
  );
}
