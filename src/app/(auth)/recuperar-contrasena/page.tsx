'use client';

import React, { useState } from 'react';
import { z } from 'zod';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { AuthInput } from '@/components/auth/AuthInput';

const schema = z.object({ email: z.string().trim().email('Correo inválido') });

export default function RecuperarContrasenaPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setError(null);
    const parsed = schema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Correo inválido');
      return;
    }
    if (!isSupabaseConfigured) {
      setError('La recuperación de contraseña no está disponible todavía.');
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
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar el enlace de recuperación');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (sent) {
    return (
      <div className="text-center p-8 rounded-lg" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <h1 className="text-lg font-outfit font-semibold text-white mb-3">Revisa tu correo</h1>
        <p className="text-sm text-text-muted leading-relaxed">
          Si existe una cuenta asociada a <strong className="text-white">{email}</strong>, recibirás un enlace para restablecer la contraseña.
        </p>
      </div>
    );
  }

  return (
    <form noValidate onSubmit={(e) => { e.preventDefault(); void handleSubmit(); }}>
      <h1 className="text-xl font-outfit font-semibold text-white mb-1">Recuperar contraseña</h1>
      <p className="text-sm text-text-dim mb-8">Te enviaremos un enlace seguro de recuperación.</p>
      <AuthInput label="Correo electrónico" type="email" value={email} onChange={setEmail} autoComplete="email" />
      {error && <p role="alert" className="text-sm mb-4" style={{ color: 'var(--error)' }}>{error}</p>}
      <Button type="submit" loading={isSubmitting} variant="primary" size="md" fullWidth>
        Enviar enlace
      </Button>
      <p className="text-xs text-text-dim text-center mt-6">
        <a href="/iniciar-sesion" className="text-accent hover:underline">Volver a iniciar sesión</a>
      </p>
    </form>
  );
}
