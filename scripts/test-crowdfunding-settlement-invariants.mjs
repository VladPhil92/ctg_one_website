import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const [foundation, reconciliation, indexHardening, campaignsApi, contributionsApi, handoffApi, webhookApi, reconcilerApi, bold] = await Promise.all([
  read('supabase/migrations/20260908140320_0126_crowdfunding_settlement_foundation.sql'),
  read('supabase/migrations/20260908140427_0127_crowdfunding_provider_reconciliation.sql'),
  read('supabase/migrations/20260908140710_0128_crowdfunding_fk_index_hardening.sql'),
  read('src/app/api/federation/vertice/crowdfunding/campaigns/route.ts'),
  read('src/app/api/federation/vertice/crowdfunding/contributions/route.ts'),
  read('src/app/api/wallet/intents/[intentId]/route.ts'),
  read('src/app/api/payments/bold/crowdfunding/events/route.ts'),
  read('src/app/api/internal/crowdfunding/reconcile/bold/route.ts'),
  read('src/lib/payments/bold-crowdfunding.ts'),
]);

// Campaigns are federated financial attestations, not a replacement civic source of truth.
assert.match(foundation, /federated_crowdfunding_campaigns/);
assert.match(foundation, /funding_model in \('donation','reward'\)/);
assert.match(foundation, /CROWDFUNDING_FUNDING_MODEL_PROHIBITED/);
assert.match(foundation, /p\.kyc_status = 'verified'/);
assert.match(foundation, /CROWDFUNDING_TREASURY_IMMUTABLE/);
assert.match(foundation, /crypto_chain_id = 137/);
assert.match(foundation, /crypto_asset_symbol = 'USDC'/);
assert.doesNotMatch(foundation, /reputation_events|reputation_score|ranking_score/);

// Direct browser mutation is impossible; only service-role RPC boundaries can write.
assert.match(foundation, /revoke all on table public\.federated_crowdfunding_campaigns from public, anon, authenticated/);
assert.match(foundation, /revoke all on table public\.federated_crowdfunding_contributions from public, anon, authenticated/);
assert.match(foundation, /revoke all on table public\.federated_crowdfunding_settlements from public, anon, authenticated/);
assert.match(foundation, /create_wallet_intent_v1_server/);
assert.match(foundation, /CROWDFUNDING_CRYPTO_KYC_REQUIRED/);

// VERTICE service calls are authenticated, bounded and rate-limited.
for (const route of [campaignsApi, contributionsApi]) {
  assert.match(route, /federationSecretState/);
  assert.match(route, /consume_service_api_rate_limit/);
  assert.match(route, /readBoundedJson/);
  assert.match(route, /UNSUPPORTED_MEDIA_TYPE/);
}
assert.doesNotMatch(contributionsApi, /destinationAddress|treasuryAddress/);
assert.match(contributionsApi, /walletIntentId/);
assert.match(contributionsApi, /assetSymbol: 'USDC'/);

// CTG Wallet receives only an intent id and reloads authoritative terms from CTG One.
assert.match(handoffApi, /createAuthenticatedRequestContext/);
assert.match(handoffApi, /\.eq\('id', intentId\)/);
assert.match(handoffApi, /\.eq\('user_id', auth\.user\.id\)/);
assert.match(handoffApi, /WALLET_INTENT_NOT_FOUND/);
assert.match(handoffApi, /ctg-wallet-intent-v1/);
assert.doesNotMatch(handoffApi, /insert\(|update\(|delete\(/);

// Bold checkout is closed-amount, server-only and explicitly gated.
assert.match(bold, /BOLD_CROWDFUNDING_ENABLED/);
assert.match(bold, /amount_type: 'CLOSE'/);
assert.match(bold, /total_amount: input\.amountCop/);
assert.match(bold, /Authorization: `x-api-key/);
assert.match(bold, /checkout\.bold\.co/);
assert.match(contributionsApi, /bind_vertice_crowdfunding_bold_checkout_server/);
assert.doesNotMatch(contributionsApi, /body\.currency|body\.providerReference|body\.checkoutUrl/);

// Webhook is inbox-only; provider verification is independent and settlement is separate.
assert.match(webhookApi, /record_crowdfunding_bold_webhook_inbox_server/);
assert.doesNotMatch(webhookApi, /reconcile_crowdfunding_bold_event_server/);
assert.doesNotMatch(webhookApi, /status='settled'|status: 'settled'/);
assert.match(bold, /payments\/webhook\/notifications/);
assert.match(reconcilerApi, /verifyBoldWebhookEvidence/);
assert.match(reconcilerApi, /reconcile_crowdfunding_bold_event_server/);
assert.match(reconcilerApi, /timingSafeEqual/);
assert.match(reconciliation, /CROWDFUNDING_BOLD_AMOUNT_MISMATCH/);
assert.match(reconciliation, /CROWDFUNDING_BOLD_CURRENCY_MISMATCH/);
assert.match(reconciliation, /verification_status='verified'/);

// Crypto can settle only after the canonical wallet intent has reconciled on-chain.
assert.match(reconciliation, /materialize_crowdfunding_crypto_settlement_server/);
assert.match(reconciliation, /v_wallet\.status <> 'reconciled'/);
assert.match(reconciliation, /chain_reconciliation_digest_sha256/);
assert.match(reconciliation, /chain_confirmations < 1/);
assert.match(reconciliation, /valuation_source/);
assert.match(reconciliation, /valuation_observed_at/);

// Production advisor follow-up: every new crowdfunding FK used by lifecycle joins is indexed.
assert.match(indexHardening, /federated_crowdfunding_campaigns_subject_idx/);
assert.match(indexHardening, /federated_crowdfunding_wallet_intent_idx/);
assert.match(indexHardening, /federated_crowdfunding_settlement_contribution_idx/);

console.log('Federated crowdfunding settlement invariants: PASS');
