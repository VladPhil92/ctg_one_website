import React from 'react';
import { redirect } from 'next/navigation';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { AdminNav } from '@/components/admin/AdminNav';

// Server-side role gate. middleware.ts already redirects non-admins away
// from /admin as a fast path, but this is the real second check —
// consistent with this project's "every layer re-verifies the admin
// role itself" rule (see the SECURITY DEFINER functions in
// supabase/migrations/0001_init.sql). If middleware's matcher config
// ever changes and stops covering /admin, this still holds.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured) {
    redirect('/');
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/iniciar-sesion');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <AdminNav />
      <div className="pt-20 pb-16 px-8">
        <div className="max-w-6xl mx-auto">{children}</div>
      </div>
    </div>
  );
}
