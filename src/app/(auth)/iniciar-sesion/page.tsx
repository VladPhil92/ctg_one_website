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
  // Only ever redirect to a same-site relative path (never a bare "//host"
  // which browsers treat as protocol-relative) — anything else falls back
  // to the original /dashboard destination.
  const next = searchParams.get('next');
  const redirectTo = next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setError(null);

    if (!isSupabaseConfigured) {
      setError('El inicio de sesión no está disponible todavía. Vuelve a intentarlo más tarde.');
      return;
    }

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Datos inválidos');
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
    <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
      <h1 className="text-xl font-outfit font-semibold text-white mb-1">Iniciar sesión</h1>
      <p className="text-sm text-text-dim mb-8">Accede a tu cuenta de CTG One.</p>

      <AuthInput label="Correo electrónico" type="email" value={email} onChange={setEmail} autoComplete="email" />
      <AuthInput
        label="Contraseña"
        type="password"
        value={password}
        onChange={setPassword}
        autoComplete="current-password"
        onEnter={handleSubmit}
      />

      {error && (
        <p className="text-sm mb-4" style={{ color: 'var(--error)' }}>{error}</p>
      )}

      <Button onClick={handleSubmit} loading={isSubmitting} variant="primary" size="md" fullWidth>
        Iniciar sesión
      </Button>

      <p className="text-xs text-text-dim text-center mt-6">
        ¿No tienes cuenta?{' '}
        <a href="/registro" className="text-accent hover:underline">Crea una</a>
      </p>
    </form>
  );
}
