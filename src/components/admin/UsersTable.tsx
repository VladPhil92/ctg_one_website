import React from 'react';
import { formatCents } from '@/lib/format';
import type { KycStatus, UserRole } from '@/types/domain';

interface WalletEmbed {
  balance_cents: number;
  currency: string;
}

interface UserRow {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  kyc_status: KycStatus;
  created_at: string;
  // PostgREST returns a single object for a to-one embed (wallets.user_id
  // is unique), but this defends against an array shape too.
  wallets: WalletEmbed | WalletEmbed[] | null;
}

const KYC_LABELS: Record<KycStatus, string> = {
  not_submitted: 'Sin enviar',
  pending: 'En revisión',
  verified: 'Verificado',
  rejected: 'Rechazado',
};

function walletOf(row: UserRow): WalletEmbed | null {
  if (Array.isArray(row.wallets)) return row.wallets[0] ?? null;
  return row.wallets;
}

export const UsersTable: React.FC<{ users: UserRow[] }> = ({ users }) => {
  if (users.length === 0) {
    return <p style={{ color: 'var(--text-muted)' }}>Todavía no hay usuarios registrados.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--border)' }}>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)' }}>
            {['Nombre', 'Email', 'Rol', 'KYC', 'Saldo', 'Registrado'].map((h) => (
              <th
                key={h}
                className="text-left px-4 py-3 text-[10px] uppercase tracking-[0.12em]"
                style={{ color: 'var(--text-dim)' }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {users.map((u) => {
            const wallet = walletOf(u);
            return (
              <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td className="px-4 py-3 text-white">{u.full_name ?? '—'}</td>
                <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
                <td className="px-4 py-3 uppercase" style={{ color: u.role === 'admin' ? 'var(--accent)' : 'var(--text-muted)' }}>
                  {u.role}
                </td>
                <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>{KYC_LABELS[u.kyc_status]}</td>
                <td className="px-4 py-3 text-white">{formatCents(wallet?.balance_cents ?? 0, wallet?.currency ?? 'COP')}</td>
                <td className="px-4 py-3" style={{ color: 'var(--text-dim)' }}>
                  {new Date(u.created_at).toLocaleDateString('es-CO')}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
