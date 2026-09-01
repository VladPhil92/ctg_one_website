import 'server-only';

import { createAdminClient } from '@/lib/supabase/server';

export const IDENTITY_CONVERGENCE_CANARY_VERSION =
  'ctg-wallet-identity-convergence-canary-v1' as const;

export type IdentityConvergenceCanaryState =
  | 'not_eligible'
  | 'ready_to_converge'
  | 'converged'
  | 'conflict';

export type IdentityConvergenceCanaryInspection = {
  version: typeof IDENTITY_CONVERGENCE_CANARY_VERSION;
  eligible: boolean;
  canConverge: boolean;
  certified: boolean;
  state: IdentityConvergenceCanaryState;
  code: string;
  checks: {
    adminCanary: boolean;
    identityLink: boolean;
    externalAccount: boolean;
    legacyEvidence: boolean;
    auditEvidence: boolean;
  };
};

export class IdentityConvergenceCanaryError extends Error {
  constructor(
    public readonly code: 'IDENTITY_CONVERGENCE_CANARY_UNAVAILABLE',
    message: string,
  ) {
    super(message);
    this.name = 'IdentityConvergenceCanaryError';
  }
}

type IdentityLinkRow = {
  id: string;
  status: string;
  link_mode: string;
  provider_user_id: string;
};

type ExternalAccountRow = {
  id: string;
  identity_link_id: string | null;
  status: string;
  is_primary: boolean;
  chain_family: string;
  provider: string;
  account_kind: string;
  legacy_preserved: boolean;
  address_normalized: string;
};

type LegacyEvidenceRow = {
  status: string;
  provider_user_id: string;
  expected_address_normalized: string;
};

type AuditRow = {
  action: string;
  identity_link_id: string;
  external_account_id: string;
  provider_user_id: string;
  address_normalized: string;
};

function result(params: {
  eligible: boolean;
  canConverge: boolean;
  certified: boolean;
  state: IdentityConvergenceCanaryState;
  code: string;
  identityLink?: boolean;
  externalAccount?: boolean;
  legacyEvidence?: boolean;
  auditEvidence?: boolean;
}): IdentityConvergenceCanaryInspection {
  return {
    version: IDENTITY_CONVERGENCE_CANARY_VERSION,
    eligible: params.eligible,
    canConverge: params.canConverge,
    certified: params.certified,
    state: params.state,
    code: params.code,
    checks: {
      adminCanary: params.eligible,
      identityLink: params.identityLink ?? false,
      externalAccount: params.externalAccount ?? false,
      legacyEvidence: params.legacyEvidence ?? false,
      auditEvidence: params.auditEvidence ?? false,
    },
  };
}

/**
 * Read-only production canary inspector for the first canonical wallet identity.
 *
 * Eligibility is deliberately derived from the canonical CTG One profile role,
 * not from browser state or an environment-maintained user id. During this phase
 * only authenticated admins may enter the mutation boundary. The returned
 * evidence is privacy-safe: it exposes no Supabase UUID, Privy DID, EVM address,
 * token, migration digest or database primary key.
 */
export async function inspectIdentityConvergenceCanary(
  userId: string,
): Promise<IdentityConvergenceCanaryInspection> {
  const serviceRole = createAdminClient();

  const [profileResult, linkResult, accountResult, evidenceResult, auditResult] =
    await Promise.all([
      serviceRole
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle(),
      serviceRole
        .from('wallet_identity_links')
        .select('id,status,link_mode,provider_user_id')
        .eq('user_id', userId)
        .eq('provider', 'privy')
        .limit(2),
      serviceRole
        .from('wallet_external_accounts')
        .select(
          'id,identity_link_id,status,is_primary,chain_family,provider,account_kind,legacy_preserved,address_normalized',
        )
        .eq('user_id', userId)
        .eq('provider', 'privy')
        .eq('chain_family', 'evm')
        .eq('is_primary', true)
        .neq('status', 'revoked')
        .limit(2),
      serviceRole
        .from('wallet_legacy_migration_evidence')
        .select('status,provider_user_id,expected_address_normalized')
        .eq('user_id', userId)
        .eq('provider', 'privy')
        .limit(2),
      serviceRole
        .from('wallet_identity_audit_log')
        .select(
          'action,identity_link_id,external_account_id,provider_user_id,address_normalized',
        )
        .eq('actor_user_id', userId)
        .eq('provider', 'privy')
        .order('created_at', { ascending: false })
        .limit(1),
    ]);

  if (
    profileResult.error ||
    linkResult.error ||
    accountResult.error ||
    evidenceResult.error ||
    auditResult.error
  ) {
    throw new IdentityConvergenceCanaryError(
      'IDENTITY_CONVERGENCE_CANARY_UNAVAILABLE',
      'Canonical identity convergence evidence could not be inspected.',
    );
  }

  const eligible = profileResult.data?.role === 'admin';
  if (!eligible) {
    return result({
      eligible: false,
      canConverge: false,
      certified: false,
      state: 'not_eligible',
      code: 'IDENTITY_CONVERGENCE_CANARY_ADMIN_ONLY',
    });
  }

  const links = (linkResult.data ?? []) as IdentityLinkRow[];
  const accounts = (accountResult.data ?? []) as ExternalAccountRow[];
  const evidence = (evidenceResult.data ?? []) as LegacyEvidenceRow[];
  const latestAudit = ((auditResult.data ?? []) as AuditRow[])[0] ?? null;

  if (links.length > 1 || accounts.length > 1 || evidence.length > 1) {
    return result({
      eligible: true,
      canConverge: false,
      certified: false,
      state: 'conflict',
      code: 'IDENTITY_CONVERGENCE_CANARY_AMBIGUOUS',
    });
  }

  const link = links[0] ?? null;
  const account = accounts[0] ?? null;
  const legacyEvidence = evidence[0] ?? null;

  if (!link && !account && !latestAudit) {
    if (!legacyEvidence || legacyEvidence.status === 'pending') {
      return result({
        eligible: true,
        canConverge: true,
        certified: false,
        state: 'ready_to_converge',
        code: legacyEvidence
          ? 'IDENTITY_CONVERGENCE_CANARY_RESUMABLE'
          : 'IDENTITY_CONVERGENCE_CANARY_READY',
        legacyEvidence: Boolean(legacyEvidence),
      });
    }

    return result({
      eligible: true,
      canConverge: false,
      certified: false,
      state: 'conflict',
      code: 'IDENTITY_CONVERGENCE_CANARY_EVIDENCE_CONFLICT',
      legacyEvidence: true,
    });
  }

  if (!link || !account || !legacyEvidence || !latestAudit) {
    return result({
      eligible: true,
      canConverge: false,
      certified: false,
      state: 'conflict',
      code: 'IDENTITY_CONVERGENCE_CANARY_PARTIAL',
      identityLink: Boolean(link),
      externalAccount: Boolean(account),
      legacyEvidence: Boolean(legacyEvidence),
      auditEvidence: Boolean(latestAudit),
    });
  }

  const linkReady =
    link.status === 'verified' && link.link_mode === 'legacy_preserve';
  const accountReady =
    account.status === 'verified' &&
    account.is_primary === true &&
    account.chain_family === 'evm' &&
    account.provider === 'privy' &&
    account.account_kind === 'embedded' &&
    account.legacy_preserved === true &&
    account.identity_link_id === link.id;
  const evidenceReady =
    legacyEvidence.status === 'consumed' &&
    legacyEvidence.provider_user_id === link.provider_user_id &&
    legacyEvidence.expected_address_normalized === account.address_normalized;
  const auditReady =
    ['IDENTITY_LINK_VERIFIED', 'IDENTITY_LINK_IDEMPOTENT'].includes(
      latestAudit.action,
    ) &&
    latestAudit.identity_link_id === link.id &&
    latestAudit.external_account_id === account.id &&
    latestAudit.provider_user_id === link.provider_user_id &&
    latestAudit.address_normalized === account.address_normalized;

  if (linkReady && accountReady && evidenceReady && auditReady) {
    return result({
      eligible: true,
      canConverge: false,
      certified: true,
      state: 'converged',
      code: 'IDENTITY_CONVERGENCE_CANARY_CERTIFIED',
      identityLink: true,
      externalAccount: true,
      legacyEvidence: true,
      auditEvidence: true,
    });
  }

  return result({
    eligible: true,
    canConverge: false,
    certified: false,
    state: 'conflict',
    code: 'IDENTITY_CONVERGENCE_CANARY_INCONSISTENT',
    identityLink: linkReady,
    externalAccount: accountReady,
    legacyEvidence: evidenceReady,
    auditEvidence: auditReady,
  });
}

export async function assertIdentityConvergenceCanaryMutationAllowed(
  userId: string,
): Promise<IdentityConvergenceCanaryInspection> {
  const inspection = await inspectIdentityConvergenceCanary(userId);
  if (!inspection.eligible) return inspection;
  return inspection;
}
