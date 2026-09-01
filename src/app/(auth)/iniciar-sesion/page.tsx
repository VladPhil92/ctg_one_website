'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { z } from 'zod';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { trackFunnelEvent } from '@/lib/analytics/client';
import { Button } from '@/components/ui/Button';
import { AuthInput } from '@/components/auth/AuthInput';
import { useLanguage } from '@/contexts/LanguageContext';
import { authErrorMessage, normalizeEmail } from '@/lib/auth/client-policy';
import { safeRedirectPath } from '@/lib/security/safe-redirect';

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export default function IniciarSesionPage() {
  return (
    <Suspense fallback={null}>
      <IniciarSesionForm />
    </Suspense>
  );
}

function IniciarSesionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale } = useLanguage();
  const es = locale === 'es';
  const redirectTo = safeRedirectPath(searchParams.get('next'), '/dashboard');
  const authError = searchParams.get('error');
  const resetComplete = searchParams.get('password_reset') === 'success';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(
    authError
      ? (es
          ? 'No se pudo validar el enlace de autenticación. Solicita uno nuevo e inténtalo otra vez.'
          : 'We could not validate the authentication link. Request a new one and try again.')
      : null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const copy = es
    ? {
        title: 'Iniciar sesión',
        subtitle: 'Accede a tu cuenta de CTG One.',
        email: 'Correo electrónico',
        password: 'Contraseña',
        invalidEmail: 'Correo inválido',
        passwordRequired: 'Ingresa tu contraseña',
        unavailable: 'El inicio de sesión no está disponible en este momento. Inténtalo más tarde.',
        forgot: '¿Olvidaste tu contraseña?',
        submit: 'Iniciar sesión',
        noAccount: '¿No tienes cuenta?',
        create: 'Crea una',
        resetComplete: 'Tu contraseña fue actualizada. Ya puedes iniciar sesión.',
      }
    : {
        title: 'Sign in',
        subtitle: 'Access your CTG One account.',
        email: 'Email',
        password: 'Password',
        invalidEmail: 'Invalid email',
        passwordRequired: 'Enter your password',
        unavailable: 'Sign-in is not available right now. Try again later.',
        forgot: 'Forgot your password?',
        submit: 'Sign in',
        noAccount: 'No account yet?',
        create: 'Create one',
        resetComplete: 'Your password was updated. You can now sign in.',
      };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setError(null);

    const parsed = loginSchema.safeParse({ email: normalizeEmail(email), password });
    if (!parsed.success) {
      const field = parsed.error.issues[0]?.path[0];
      setError(field === 'password' ? copy.passwordRequired : copy.invalidEmail);
      return;
    }

    if (!isSupabaseConfigured) {
      setError(copy.unavailable);
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: parsed.data.email,
        password: parsed.data.password,
      });
      if (signInError) throw signInError;
      void trackFunnelEvent('first_login', { sourcePath: '/iniciar-sesion' });
      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      setError(authErrorMessage(err, locale, 'login'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form noValidate onSubmit={(event) => { event.preventDefault(); void handleSubmit(); }}>
      <h1 className="mb-1 font-outfit text-2xl font-semibold tracking-tight text-white">{copy.title}</h1>
      <p className="mb-8 text-sm text-text-muted">{copy.subtitle}</p>

      {resetComplete && (
        <output className="mb-4 block text-sm leading-relaxed" style={{ color: 'var(--success)' }}>
          {copy.resetComplete}
        </output>
      )}

      <AuthInput label={copy.email} type="email" value={email} onChange={setEmail} autoComplete="email" inputMode="email" required />
      <AuthInput
        label={copy.password}
        type="password"
        value={password}
        onChange={setPassword}
        autoComplete="current-password"
        required
      />

      <div className="-mt-2 mb-5 text-right">
        <Link href="/recuperar-contrasena" className="inline-flex min-h-11 items-center text-xs text-accent hover:underline">{copy.forgot}</Link>
      </div>

      {error && (
        <p role="alert" className="mb-4 text-sm leading-relaxed" style={{ color: 'var(--error)' }}>{error}</p>
      )}

      <Button type="submit" loading={isSubmitting} variant="primary" size="md" fullWidth>
        {copy.submit}
      </Button>

      <p className="mt-6 text-center text-xs text-text-dim">
        {copy.noAccount}{' '}
        <Link href="/registro" className="inline-flex min-h-11 items-center text-accent hover:underline">{copy.create}</Link>
      </p>
    </form>
  );
}