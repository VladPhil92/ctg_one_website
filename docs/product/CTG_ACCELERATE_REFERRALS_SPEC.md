# CTG Accelerate — Referral Rewards & Investment Recovery (DRAFT)

Status: **design proposal only; NOT enabled for real-money operations**. Owner approval, legal review, financial sustainability and security testing required.

## Goal
Let an authenticated CTG One investor share a unique referral link and earn eligible, auditable promotional rewards funded by a segregated operating marketing budget. The investor may elect to apply vested rewards toward early recovery of principal **only when their investment agreement expressly allows it**. Referral count alone never shortens a fixed term.

## UX
Dashboard: prominent **CTG Accelerate** card adjacent to staking, showing (a) referral link/copy action, (b) registrations vs verified eligible referrals, (c) pending/vested/applied/reversed rewards, (d) investment principal outstanding and contractual maturity, (e) simulation clearly labeled nonbinding. Never show referred users' private investment details.

Flow: share link → referred user signs up → KYC/anti-abuse checks → qualifying settled investment → cooling-off and funding validation → budget approval → reward vests → investor explicitly chooses wallet credit or eligible principal application → authoritative ledger posts → receipt.

## Business policy (unapproved)
- Direct referrals only. No downstream/multilevel commissions.
- No payment for registrations alone. No guaranteed reward or guaranteed accelerated maturity.
- Reward percentage, cap, minimum investment, qualifying assets, settlement asset, vesting delay, reversals and eligible jurisdictions are **configuration requiring approval**; examples such as 2% are not live rates.
- Reward funding must come from verified operating revenue / a prefunded marketing reserve, never new investor deposits or protected customer assets.
- Avoid presenting fixed 2.11% investment returns as risk-free, guaranteed or native protocol staking absent evidence. Legal review of crypto custody, investment solicitation and referral compensation before public launch.

## Authority boundaries
CTG One Investment OS is the canonical investment authority; CTG Wallet is a client, not a second ledger. Server-side authorization only. Supabase auth/KYC and immutable accounting journal remain authoritative. No browser-side balance mutation.

Proposed records:
- referral_codes(id, referrer_user_id, code_hash, status, created_at)
- referral_attributions(id, referred_user_id UNIQUE, referrer_user_id, attributed_at, source, fraud_review_status)
- referral_reward_policies(id, version, eligible_jurisdictions, rate_bps, per_referral_cap, user_cap, budget_id, effective_from, approved_by)
- referral_reward_events(id, attribution_id, qualifying_investment_id, policy_version, event_type, amount_atomic, asset_id, state, idempotency_key UNIQUE, created_at)
- referral_reward_allocations(id, reward_event_id, investment_id NULL, allocation_type, amount_atomic, ledger_transaction_id, created_at)
- referral_audit_events(id, actor_id, event_type, entity_id, metadata_redacted, created_at)

Model details require review against existing canonical schemas before migrations. Monetary amounts use integer atomic units and explicit asset/network, never floating point.

## Invariants
1. A referred account can have at most one attribution; self-referrals, related-party abuse, duplicates and circular referrals are rejected/reviewed.
2. Rewards are not recognized until investment settlement and eligibility are independently verified.
3. Every reward has a policy version, budget reservation, unique qualifying event, immutable ledger trail and idempotency key.
4. Reward reversals produce compensating entries; no destructive edits to settled ledger rows.
5. Applying rewards to principal requires investor consent and a contract-authorized early principal recovery endpoint. Do not silently modify maturity, future interest obligations or locked balances.
6. Prevent double-spend with transactional posting and concurrency locks. Reconcile across Investment OS and Wallet views.
7. Admin review and operational controls: feature flag OFF by default, jurisdiction gate, reward caps, budget kill switch, fraud queue, metrics and audit export.
8. No real-money rollout without legal/compliance approval, unit/integration/E2E tests and a canary plan.

## Acceptance criteria
- User can view and copy their referral code, and see only privacy-safe status.
- Registration without a funded eligible investment earns zero.
- Ten valid referred investments can create ten separate pending reward events, never automatic guaranteed payouts.
- Reward allocation is rejected if reward not vested, budget insufficient, investment not eligible or contract disallows early recovery.
- Repeated webhooks or button clicks never credit a reward twice.
- Early principal recovery updates the canonical ledger and displays revised outstanding principal; maturity only changes through an explicit authorized contract process.
- Product surfaces show a plain-language risk disclosure and differentiate marketing rewards from investment yield.

## Implementation sequence
1. Inspect current Investment OS, staking, KYC, ledger and dashboard interfaces; map existing contracts.
2. Obtain product policy decisions (reward formula, payout timing, asset denomination, maturity treatment).
3. Complete jurisdiction-specific legal/compliance and budget approval.
4. Add migrations, service APIs and accounting tests behind disabled feature flag.
5. Add responsive dashboard UI and simulation with non-production fixtures.
6. Run security review, anti-abuse testing, reconciliation and gated rollout.

This document is a specification, not evidence of a deployed or production-ready financial capability.
