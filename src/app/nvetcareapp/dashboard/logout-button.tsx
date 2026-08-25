'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      await fetch('/api/nvetcareapp/auth/logout', { method: 'POST' });
    } finally {
      router.push('/nvetcareapp/iniciar-sesion');
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="rounded-lg border border-black/10 px-4 py-2 text-sm font-medium text-[#0D1B2A] transition hover:bg-black/5 disabled:opacity-60"
    >
      {loading ? 'Cerrando sesión...' : 'Cerrar sesión'}
    </button>
  );
}
