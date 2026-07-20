'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useWallet } from '@/hooks/useWallet';
import { WalletConnect } from '@/components/web3/WalletConnect';
import { Container } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { formatCents } from '@/lib/format';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Navbar } from '@/components/Navbar';

const KYC_LABELS: Record<string, { label: string; color: string }> = {
  not_submitted: { label: 'Pendiente de enviar', color: 'var(--text-dim)' },
  pending: { label: 'En revisión', color: 'var(--accent)' },
  verified: { label: '✓ Verificado', color: 'var(--success)' },
  rejected: { label: 'Rechazado', color: 'var(--error)' },
};

export default function DashboardPage() {
  const { profile, email, isAuthenticated, isLoading, signOut } = useAuth();
  const { wallet, isLoading: isWalletLoading } = useWallet();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/iniciar-sesion');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--accent)' }}></div>
          <p style={{ color: 'var(--text-muted)' }}>Cargando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const kyc = KYC_LABELS[profile?.kyc_status ?? 'not_submitted'];

  return (
    <div style={{ backgroundColor: 'var(--bg-primary)' }}>
      <Navbar />

      <div className="min-h-screen pt-24 pb-16">
        <Container>
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-4xl font-outfit font-bold">Dashboard</h1>
            <Button onClick={signOut} variant="secondary" size="sm">Cerrar sesión</Button>
          </div>

          {/* Account + Balance */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="p-6 rounded-lg border border-border" style={{ backgroundColor: 'var(--bg-card)' }}>
              <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-secondary)' }}>
                Información de Cuenta
              </h2>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-muted)' }}>Email:</span>
                  <span style={{ color: 'var(--text-primary)' }}>{profile?.email ?? email}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-muted)' }}>Verificación (KYC):</span>
                  <span style={{ color: kyc.color }}>{kyc.label}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-muted)' }}>Miembro desde:</span>
                  <span style={{ color: 'var(--text-primary)' }}>
                    {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('es-CO') : '—'}
                  </span>
                </div>
              </div>
              {profile && profile.kyc_status !== 'verified' && (
                <a href="/dashboard/kyc" className="inline-block mt-4 text-xs text-accent hover:underline">
                  {profile.kyc_status === 'rejected' ? 'Vuelve a enviar tu documento →' : 'Completa tu verificación de identidad →'}
                </a>
              )}
            </div>

            <div className="p-6 rounded-lg border border-border" style={{ backgroundColor: 'var(--bg-card)' }}>
              <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-secondary)' }}>
                Saldo
              </h2>
              <p className="text-3xl font-outfit font-semibold text-white mb-4">
                {isWalletLoading ? '—' : formatCents(wallet?.balance_cents ?? 0, wallet?.currency ?? 'COP')}
              </p>
              <Button href="/dashboard/depositos" variant="primary" size="sm">
                Recargar cuenta
              </Button>
            </div>
          </div>

          {/* Wallet Connection Section */}
          <div className="mb-8">
            <h2 className="text-2xl font-outfit font-bold mb-4">Conectar Wallet</h2>
            <WalletConnect />
          </div>

          {/* Coming Soon Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ComingSoonCard
              title="Historial de Transacciones"
              description="Revisa todas tus recargas y su estado de revisión"
            />
            <ComingSoonCard
              title="Productos y Servicios"
              description="Compra productos y servicios del ecosistema con tu saldo"
            />
          </div>
        </Container>
      </div>
    </div>
  );
}

interface ComingSoonCardProps {
  title: string;
  description: string;
}

function ComingSoonCard({ title, description }: ComingSoonCardProps) {
  return (
    <div
      className="p-6 border border-accent rounded-lg"
      style={{ backgroundColor: 'rgba(201, 169, 98, 0.08)' }}
    >
      <div className="flex items-start gap-3 mb-3">
        <span className="text-2xl">🚧</span>
        <div>
          <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--accent)' }}>
            {title}
          </h3>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {description}
          </p>
        </div>
      </div>
      <p className="text-xs mt-4" style={{ color: 'var(--text-dim)' }}>
        En desarrollo - Disponible próximamente
      </p>
    </div>
  );
}
