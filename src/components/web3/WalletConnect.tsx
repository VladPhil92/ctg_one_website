'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Wallet, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';

export const WalletConnect: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      // Check if MetaMask is installed
      if (typeof window.ethereum === 'undefined') {
        throw new Error('MetaMask no está instalado. Por favor instálalo desde metamask.io');
      }

      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (accounts && accounts.length > 0) {
        setWalletAddress(accounts[0]);
      }
    } catch (err) {
      console.error('Error connecting wallet:', err);
      setError(err instanceof Error ? err.message : 'Error al conectar wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="text-center p-6 border border-border rounded-lg">
        <AlertCircle className="mx-auto mb-4" size={48} color="var(--accent)" />
        <p style={{ color: 'var(--text-muted)' }}>
          Debes iniciar sesión para conectar tu wallet
        </p>
      </div>
    );
  }

  if (walletAddress) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="p-6 border border-accent rounded-lg"
        style={{ backgroundColor: 'rgba(201, 169, 98, 0.08)' }}
      >
        <div className="flex items-center gap-3">
          <Wallet size={24} color="var(--accent)" />
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
              Wallet Conectada
            </p>
            <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
              {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="p-6 border border-border rounded-lg" style={{ backgroundColor: 'var(--bg-card)' }}>
        <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
          Conectar MetaMask
        </h3>
        <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
          Conecta tu wallet de MetaMask para comprar, vender y hacer staking de CTG One Tokens.
          Conecta tu wallet de MetaMask para gestionar tus CTG One Tokens y tus beneficios del ecosistema.
        </p>

        <Button
          onClick={handleConnect}
          disabled={isConnecting}
          variant="primary"
          size="lg"
          className="w-full"
        >
          {isConnecting ? 'Conectando...' : 'Conectar MetaMask'}
        </Button>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-3 rounded-lg"
            style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--error)' }}
          >
            <p className="text-sm" style={{ color: 'var(--error)' }}>
              {error}
            </p>
          </motion.div>
        )}
      </div>

      <div className="p-4 border border-border rounded-lg" style={{ backgroundColor: 'var(--bg-card)' }}>
        <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
          ℹ️ No tienes MetaMask? <a href="https://metamask.io" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Descárgalo aquí</a>
        </p>
      </div>

      {/* Coming Soon Notice */}
      <div className="p-6 border border-accent rounded-lg" style={{ backgroundColor: 'rgba(201, 169, 98, 0.08)' }}>
        <p className="text-sm font-semibold mb-2" style={{ color: 'var(--accent)' }}>
          🚧 En Proceso de Integración
        </p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          La funcionalidad completa de trading estará disponible próximamente. Actualmente puedes crear tu perfil y conectar tu wallet para estar listo cuando lancemos.
          La funcionalidad completa de la wallet estará disponible próximamente. Actualmente puedes crear tu perfil y conectar tu wallet para estar listo cuando lancemos.
        </p>
      </div>
    </div>
  );
};
