'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { AuthInput } from '@/components/auth/AuthInput';

const schema = z.object({
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  confirmPassword: z.string().min(8, 'Confirma la nueva contraseña'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

export default function RestablecerContrasenaPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setError('El restablecimiento de contraseña no está disponible todavía.');
      return;
    }
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data, error: userError }) => {
      if (userError || !data.user) {
        setError('El enlace de recuperación no es válido o ya expiró. Solicita uno nuevo.');
        return;
      }
      setReady(true);
    });
  }, []);

  const handleSubmit = async () => {
    if (!ready || isSubmitting) return;
    setError(null);
    const parsed = schema.safeParse({ password, confirmPassword });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Contraseña inválida');
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password: parsed.data.password });
      if (updateError) throw updateError;
      await supabase.auth.signOut();
      router.replace('/iniciar-sesion?password_reset=success');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar la contraseña');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form noValidate onSubmit={(e) => { e.preventDefault(); void handleSubmit(); }}>
      <h1 className="text-xl font-outfit font-semibold text-white mb-1">Nueva contraseña</h1>
      <p className="text-sm text-text-dim mb-8">Define una nueva contraseña para tu cuenta.</p>
      <AuthInput label="Nueva contraseña" type="password" value={password} onChange={setPassword} autoComplete="new-password" />
      <AuthInput label="Confirmar contraseña" type="password" value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" />
      {error && <p role="alert" className="text-sm mb-4" style={{ color: 'var(--error)' }}>{error}</p>}
      <Button type="submit" loading={isSubmitting} disabled={!ready} variant="primary" size="md" fullWidth>
        Guardar nueva contraseña
      </Button>
      {!ready && !error && <p className="text-xs text-text-dim text-center mt-4">Validando enlace seguro…</p>}
    </form>
  );
}
