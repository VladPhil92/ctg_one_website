'use client';

import React, { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { z } from 'zod';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { AuthInput } from '@/components/auth/AuthInput';

const loginSchema = z.object({
  email: z.string().trim().email('Correo inválido'),
  password: z.string().min(1, 'Ingresa tu contraseña'),
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
  const next = searchParams.get('next');
  const redirectTo = next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';
  const authError = searchParams.get('error');
  const resetComplete = searchParams.get('password_reset') === 'success';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(
    authError ? 'No se pudo validar el enlace de autenticación. Solicita uno nuevo e inténtalo otra vez.' : null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setError(null);

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Datos inválidos');
      return;
    }

    if (!isSupabaseConfigured) {
      setError('El inicio de sesión no está disponible todavía. Vuelve a intentarlo más tarde.');
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
      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form noValidate onSubmit={(e) => { e.preventDefault(); void handleSubmit(); }}>
      <h1 className="text-xl font-outfit font-semibold text-white mb-1">Iniciar sesión</h1>
      <p className="text-sm text-text-dim mb-8">Accede a tu cuenta de CTG One.</p>

      {resetComplete && (
        <p className="text-sm mb-4" style={{ color: 'var(--success)' }}>
          Tu contraseña fue actualizada. Ya puedes iniciar sesión.
        </p>
      )}

      <AuthInput label="Correo electrónico" type="email" value={email} onChange={setEmail} autoComplete="email" />
      <AuthInput
        label="Contraseña"
        type="password"
        value={password}
        onChange={setPassword}
        autoComplete="current-password"
      />

      <div className="text-right -mt-2 mb-5">
        <a href="/recuperar-contrasena" className="text-xs text-accent hover:underline">¿Olvidaste tu contraseña?</a>
      </div>

      {error && (
        <p role="alert" className="text-sm mb-4" style={{ color: 'var(--error)' }}>{error}</p>
      )}

      <Button type="submit" loading={isSubmitting} variant="primary" size="md" fullWidth>
        Iniciar sesión
      </Button>

      <p className="text-xs text-text-dim text-center mt-6">
        ¿No tienes cuenta?{' '}
        <a href="/registro" className="text-accent hover:underline">Crea una</a>
      </p>
    </form>
  );
}
