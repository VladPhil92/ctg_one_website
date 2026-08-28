'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { AuthInput } from '@/components/auth/AuthInput';
import { PasswordRequirements } from '@/components/auth/PasswordRequirements';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  PASSWORD_MIN_LENGTH,
  authErrorMessage,
  strongPasswordError,
} from '@/lib/auth/client-policy';

export default function RestablecerContrasenaPage() {
  const router = useRouter();
  const { locale } = useLanguage();
  const es = locale === 'es';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const copy = es
    ? {
        title: 'Nueva contraseña',
        subtitle: 'Define una contraseña nueva para tu cuenta.',
        password: 'Nueva contraseña',
        confirm: 'Confirmar contraseña',
        unavailable: 'El restablecimiento de contraseña no está disponible en este momento.',
        invalidLink: 'El enlace de recuperación no es válido o ya expiró. Solicita uno nuevo.',
        mismatch: 'Las contraseñas no coinciden.',
        submit: 'Guardar nueva contraseña',
        validating: 'Validando enlace seguro…',
        newLink: 'Solicitar un enlace nuevo',
      }
    : {
        title: 'New password',
        subtitle: 'Choose a new password for your account.',
        password: 'New password',
        confirm: 'Confirm password',
        unavailable: 'Password reset is not available right now.',
        invalidLink: 'The recovery link is invalid or has expired. Request a new one.',
        mismatch: 'The passwords do not match.',
        submit: 'Save new password',
        validating: 'Validating secure link…',
        newLink: 'Request a new link',
      };

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setError(copy.unavailable);
      setReady(false);
      return;
    }

    let mounted = true;
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data, error: userError }) => {
      if (!mounted) return;
      if (userError || !data.user) {
        setReady(false);
        setError(copy.invalidLink);
        return;
      }
      setError(null);
      setReady(true);
    });

    return () => {
      mounted = false;
    };
  }, [copy.invalidLink, copy.unavailable]);

  const handleSubmit = async () => {
    if (!ready || isSubmitting) return;
    setError(null);

    const passwordError = strongPasswordError(password, locale);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    if (password !== confirmPassword) {
      setError(copy.mismatch);
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      await supabase.auth.signOut();
      router.replace('/iniciar-sesion?password_reset=success');
      router.refresh();
    } catch (err) {
      setError(authErrorMessage(err, locale, 'password-update'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form noValidate onSubmit={(event) => { event.preventDefault(); void handleSubmit(); }}>
      <h1 className="mb-1 font-outfit text-2xl font-semibold tracking-tight text-white">{copy.title}</h1>
      <p className="mb-8 text-sm leading-relaxed text-text-muted">{copy.subtitle}</p>
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
      <AuthInput
        label={copy.confirm}
        type="password"
        value={confirmPassword}
        onChange={setConfirmPassword}
        autoComplete="new-password"
        minLength={PASSWORD_MIN_LENGTH}
        required
      />

      {error && <p role="alert" className="mb-4 text-sm leading-relaxed" style={{ color: 'var(--error)' }}>{error}</p>}
      <Button type="submit" loading={isSubmitting} disabled={!ready} variant="primary" size="md" fullWidth>
        {copy.submit}
      </Button>
      {!ready && !error && <output className="mt-4 block text-center text-xs text-text-dim">{copy.validating}</output>}
      {!ready && error && (
        <p className="mt-4 text-center text-xs text-text-dim">
          <Link href="/recuperar-contrasena" className="inline-flex min-h-11 items-center text-accent hover:underline">{copy.newLink}</Link>
        </p>
      )}
    </form>
  );
}