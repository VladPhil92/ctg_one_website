'use client';

import React, { useState } from 'react';
import { z } from 'zod';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { AuthInput } from '@/components/auth/AuthInput';

const registerSchema = z.object({
  fullName: z.string().trim().min(2, 'Ingresa tu nombre completo'),
  phone: z.string().trim().min(7, 'Ingresa un teléfono válido'),
  email: z.string().trim().email('Correo inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
});

export default function RegistroPage() {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setError(null);

    if (!isSupabaseConfigured) {
      setError('El registro no está disponible todavía. Vuelve a intentarlo más tarde.');
      return;
    }

    const parsed = registerSchema.safeParse({ fullName, phone, email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Datos inválidos');
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const { error: signUpError } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: {
          data: { full_name: parsed.data.fullName, phone: parsed.data.phone },
          emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin}/iniciar-sesion`,
        },
      });
      if (signUpError) throw signUpError;
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la cuenta');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-center p-8 rounded-lg" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <h1 className="text-lg font-outfit font-semibold text-white mb-3">Revisa tu correo</h1>
        <p className="text-sm text-text-muted leading-relaxed">
          Te enviamos un enlace de confirmación a <strong className="text-white">{email}</strong>.
          Confírmalo antes de iniciar sesión.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); void handleSubmit(); }}>
      <h1 className="text-xl font-outfit font-semibold text-white mb-1">Crear cuenta</h1>
      <p className="text-sm text-text-dim mb-8">Únete al ecosistema CTG One.</p>

      <AuthInput label="Nombre completo" value={fullName} onChange={setFullName} autoComplete="name" />
      <AuthInput label="Teléfono" type="tel" value={phone} onChange={setPhone} autoComplete="tel" />
      <AuthInput label="Correo electrónico" type="email" value={email} onChange={setEmail} autoComplete="email" />
      <AuthInput
        label="Contraseña"
        type="password"
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
      />

      {error && (
        <p role="alert" className="text-sm mb-4" style={{ color: 'var(--error)' }}>{error}</p>
      )}

      <Button type="submit" loading={isSubmitting} variant="primary" size="md" fullWidth>
        Crear cuenta
      </Button>

      <p className="text-xs text-text-dim text-center mt-6">
        ¿Ya tienes cuenta?{' '}
        <a href="/iniciar-sesion" className="text-accent hover:underline">Inicia sesión</a>
      </p>
    </form>
  );
}
