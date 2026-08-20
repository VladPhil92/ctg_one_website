export type UserRole = 'user' | 'admin';
export type KycStatus = 'not_submitted' | 'pending' | 'verified' | 'rejected';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: UserRole;
  kyc_status: KycStatus;
  created_at: string;
}

export interface Wallet {
  id: string;
  user_id: string;
  balance_cents: number;
  currency: string;
  updated_at: string;
}

export type TransactionType = 'deposit' | 'purchase' | 'adjustment';
export type TransactionMethod = 'bank_transfer' | 'pse' | 'bre_b_qr' | 'crypto';
export type TransactionStatus = 'pending' | 'approved' | 'rejected';

export interface Transaction {
  id: string;
  user_id: string;
  type: TransactionType;
  method: TransactionMethod | null;
  amount_cents: number;
  status: TransactionStatus;
  proof_storage_path: string | null;
  external_reference: string | null;
  crypto_network: string | null;
  crypto_asset: string | null;
  crypto_tx_hash: string | null;
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export type KycSubmissionStatus = 'draft' | 'pending' | 'verified' | 'rejected';

export interface KycSubmission {
  id: string;
  user_id: string;
  status: KycSubmissionStatus;
  client_request_id: string | null;
  submitted_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
}

export interface KycDocument {
  id: string;
  submission_id: string;
  document_type: string;
  storage_path: string;
  created_at: string;
}
