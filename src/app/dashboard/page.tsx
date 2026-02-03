'use client';

import { useAuth } from '@/contexts/AuthContext';
import { WalletConnect } from '@/components/web3/WalletConnect';
import { Container } from '@/components/ui';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Navbar } from '@/components/Navbar';

export default function DashboardPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/');
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

  if (!user) return null;

  return (
    <div style={{ backgroundColor: 'var(--bg-primary)' }}>
      <Navbar />
      
      <div className="min-h-screen pt-24 pb-16">
        <Container>
          <h1 className="text-4xl font-outfit font-bold mb-8">Dashboard</h1>
          
          {/* User Info Card */}
          <div className="mb-8 p-6 rounded-lg border border-border" style={{ backgroundColor: 'var(--bg-card)' }}>
            <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-soft)' }}>
              Información de Cuenta
            </h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-muted)' }}>Email:</span>
                <span style={{ color: 'var(--text-primary)' }}>{user.email}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-muted)' }}>Tier:</span>
                <span style={{ color: 'var(--accent)' }} className="uppercase font-semibold">{user.tier}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-muted)' }}>KYC Status:</span>
                <span style={{ color: user.kycVerified ? 'var(--green)' : 'var(--text-dim)' }}>
                  {user.kycVerified ? '✓ Verificado' : 'Pendiente'}
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-muted)' }}>Miembro desde:</span>
                <span style={{ color: 'var(--text-primary)' }}>
                  {new Date(user.createdAt).toLocaleDateString('es-ES')}
                </span>
              </div>
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
              title="Balance de Tokens" 
              description="Visualiza tu balance de CTG One Tokens en tiempo real"
            />
            <ComingSoonCard 
              title="Historial de Transacciones" 
              description="Revisa todas tus transacciones on-chain"
            />
            <ComingSoonCard 
              title="Staking Pools" 
              description="Haz staking de tus tokens y gana rewards"
            />
            <ComingSoonCard 
              title="Trading Interface" 
              description="Compra y vende CTGO tokens directamente"
            />
            <ComingSoonCard 
              title="Loyalty Rewards" 
              description="Acumula puntos por usar el ecosistema"
            />
            <ComingSoonCard 
              title="Portfolio Analytics" 
              description="Analíticas detalladas de tu portfolio"
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
      style={{ backgroundColor: 'var(--accent-dim)' }}
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
