import { NextResponse } from 'next/server';

import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { buildWalletCopTopUpCapability } from '@/lib/wallet/cop-topup-capability';
import { readPolygonPortfolio } from '@/lib/wallet/polygon-portfolio';
import {
  WalletReadModelError,
  buildWalletOverviewV2,
  type WalletOverviewBalanceRow,
  type WalletOverviewExternalAccountRow,
  type WalletOverviewIdentityRow,
  type WalletOverviewIntentRow,
  type WalletOverviewLegacyTransactionRow,
  type WalletOverviewProfileRow,
} from '@/lib/wallet/read-model';

const ACTIVITY_FETCH_LIMIT = 20;

function noStoreJson(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set('Cache-Control', 'no-store');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'no-referrer');
  return NextResponse.json(body, { ...init, headers });
}

export async function GET() {
  if (!isSupabaseConfigured) {
    return noStoreJson({ error: 'WALLET_READ_UNAVAILABLE' }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return noStoreJson({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }

  const userId = user.id;
  const [profileResult, balanceResult, identityResult, accountsResult, transactionsResult, intentsResult] =
    await Promise.all([
      supabase
        .from('profiles')
        .select('id,kyc_status')
        .eq('id', userId)
        .maybeSingle(),
      supabase
        .from('wallet_balance_compatibility_v2')
        .select(
          'account_id,user_id,legacy_wallet_id,currency,available_balance_cents,balance_authority,journal_posting_enabled,balance_updated_at',
        )
        .eq('user_id', userId)
        .maybeSingle(),
      supabase
        .from('wallet_identity_links')
        .select('user_id,provider,status,link_mode,linked_at,verified_at')
        .eq('user_id', userId)
        .eq('provider', 'privy')
        .maybeSingle(),
      supabase
        .from('wallet_external_accounts')
        .select(
          'id,user_id,provider,chain_family,account_kind,address,status,is_primary,legacy_preserved,verified_at,created_at',
        )
        .eq('user_id', userId)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: true }),
      supabase
        .from('transactions')
        .select(
          'id,user_id,type,method,amount_cents,status,external_reference,crypto_tx_hash,reviewed_at,created_at',
        )
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(ACTIVITY_FETCH_LIMIT),
      supabase
        .from('wallet_intents_v2')
        .select(
          'id,user_id,intent_type,status,currency,amount_cents,external_reference,expires_at,created_at,updated_at',
        )
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(ACTIVITY_FETCH_LIMIT),
    ]);

  if (
    profileResult.error ||
    balanceResult.error ||
    identityResult.error ||
    accountsResult.error ||
    transactionsResult.error ||
    intentsResult.error
  ) {
    return noStoreJson({ error: 'WALLET_READ_UNAVAILABLE' }, { status: 503 });
  }

  if (!profileResult.data || !balanceResult.data) {
    return noStoreJson({ error: 'WALLET_ACCOUNT_INCOMPLETE' }, { status: 409 });
  }

  try {
    const overview = buildWalletOverviewV2({
      authenticatedUserId: userId,
      asOf: new Date().toISOString(),
      profile: profileResult.data as WalletOverviewProfileRow,
      balance: balanceResult.data as WalletOverviewBalanceRow,
      identity: (identityResult.data as WalletOverviewIdentityRow | null) ?? null,
      externalAccounts: (accountsResult.data ?? []) as WalletOverviewExternalAccountRow[],
      legacyTransactions: (transactionsResult.data ?? []) as WalletOverviewLegacyTransactionRow[],
      intents: (intentsResult.data ?? []) as WalletOverviewIntentRow[],
    });

    // The server chooses the address exclusively from the verified canonical
    // registry. A browser request cannot substitute an arbitrary EVM address.
    const primaryVerifiedEvmAccount =
      identityResult.data?.status === 'verified'
        ? (accountsResult.data ?? []).find(
            (account) =>
              account.chain_family === 'evm' &&
              account.status === 'verified' &&
              account.is_primary === true,
          )
        : undefined;

    const blockchain = await readPolygonPortfolio(primaryVerifiedEvmAccount?.address ?? null);
    const blockchainBalances =
      blockchain.status === 'available' || blockchain.status === 'degraded';
    const copTopUp = buildWalletCopTopUpCapability(overview.user.kycStatus);

    return noStoreJson({
      ...overview,
      blockchain,
      ...(copTopUp.action ? { copTopUp: copTopUp.action } : {}),
      capabilities: {
        ...overview.capabilities,
        blockchainBalances,
        // An additive Wallet V2 capability. It is deliberately separate from
        // moneyMovement: the client may only hand off to CTG One's protected
        // web flow; it receives no primitive that can credit or move money.
        copTopUp: copTopUp.enabled,
      },
    });
  } catch (error) {
    if (error instanceof WalletReadModelError) {
      return noStoreJson({ error: 'WALLET_READ_CONTRACT_VIOLATION' }, { status: 503 });
    }
    return noStoreJson({ error: 'WALLET_READ_UNAVAILABLE' }, { status: 503 });
  }
}