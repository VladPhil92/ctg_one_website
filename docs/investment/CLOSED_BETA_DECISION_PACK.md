# Closed Beta Decision Pack — CTG Craft Beer Inversión

Status: **PROPOSED FOR EXPLICIT BUSINESS/LEGAL APPROVAL — NOT YET AUTHORITATIVE**

This document converts BR-001..BR-005 into a deterministic approval package for the first real closed-beta operating cycle. Nothing in this file enables public funding, automatic settlement, withdrawals, or LIVE status. Until these decisions are explicitly approved and propagated into the authoritative business/financial documentation and runtime rules, `BUSINESS_MODEL.md` remains controlling and the BR items remain pending.

## Operating objective

The first closed-beta cycle must exercise one real, fully reconciled lot through:

`verified participant → agreement acceptance → manually verified funding → lot allocation → production → serialization/inventory → documented sales/returns/dispositions → finalized settlement → approved reinvestment or confirmed withdrawal → redacted evidence review`.

The cycle is deliberately supervised. Public registration/funding automation and automatic money movement remain fail-closed.

## Decision principles

The recommended baseline follows these constraints:

1. calculations must be reproducible from versioned, persisted facts;
2. no guaranteed-return or guaranteed-capital language;
3. costs and losses must be attributable, evidenced and auditable at lot level;
4. a participant must never acquire an unbounded negative balance or automatic capital-call obligation;
5. no cost may be deducted twice — especially a cost already represented by deployed participant capital;
6. no profit is distributable before the applicable capital-recovery waterfall has been applied;
7. every lot-level cent distributed across allocations must conserve the source total exactly;
8. cent rounding mode and tie-breaking must be explicit and engine-independent;
9. unresolved legal classification must not be inferred by software.

## BR-001 — Cost scope

### Recommended closed-beta rule

Eligible lot costs include only **documented, directly attributable costs of producing and commercially realizing the specific lot/allocation**:

- brewing ingredients and consumables;
- direct production/processing costs measured for the lot;
- bottles, caps, labels, cases and other lot packaging;
- lot-specific quality/compliance inputs;
- lot-specific transport, fulfillment or distribution expense;
- sales-channel/commercial fees directly attributable to recognized lot revenue;
- authorized lot-specific adjustments supported by first-party evidence.

The following are excluded unless a later contract/formula version expressly includes and allocates them:

- unrelated corporate overhead;
- general office/admin costs;
- unrelated rent or payroll;
- financing costs;
- general brand marketing not attributable to the lot;
- penalties, owner distributions or unrelated liabilities.

Taxes remain a separate financial category and must not be double-counted as eligible costs.

Each eligible cost must additionally be classified as exactly one of:

- `FINANCED_CAPITAL_COST`: already represented by deployed capital for the allocation; or
- `NON_CAPITAL_DEDUCTION`: economically attributable to the allocation but not already represented by deployed capital.

The same economic cost may never appear in both classes.

### Approval required

- [ ] APPROVE BR-001 as written
- [ ] APPROVE WITH CHANGES
- [ ] REJECT

## BR-002 — Capital recovery and deterministic settlement waterfall

### Recommended closed-beta rule

Capital recovery is **economic recovery from realized lot proceeds, not a guaranteed repayment obligation**.

All monetary outputs are integer COP cents and derive from authoritative realized entries under the lot's pinned formula version. For the closed-beta version, every settlement allocation in one lot must use the same formula version and therefore the same participant profit-share percentage `S`.

### Deterministic lot-to-allocation attribution

Let `U_a` be the allocation's eligible case-equivalent units and `U_total = sum(U_a)` across every allocation participating in the lot settlement, including explicitly recorded CTG-internal allocations where applicable. Settlement is not eligible unless the allocation set reconciles to the lot's eligible funded quantity.

Any non-negative lot-level cent amount `X` that must be attributed across allocations — including recognized revenue `R`, applicable taxes `T`, `NON_CAPITAL_DEDUCTION` costs `D`, and approved participant-borne losses `L` — uses the same largest-remainder allocator:

```text
ExactX_a    = X × U_a / U_total
BaseX_a     = floor(ExactX_a)
FractionX_a = ExactX_a - BaseX_a

RemainderX = X - sum(BaseX_a)

X_a = BaseX_a
  + 1 cent for the first RemainderX allocations ordered by:
      FractionX_a DESC,
      allocation_id ASC
```

This allocator is run independently for each source category (`R`, `T`, `D`, `L`) so source genealogy is retained rather than netting categories before attribution.

Required input conservation identities:

```text
sum(R_a) = R
sum(T_a) = T
sum(D_a) = D
sum(L_a) = L
```

No implementation may use floating-point binary arithmetic for these settlement allocations. Exact decimal/integer arithmetic must be used.

Definitions after attribution:

```text
R_a = attributable eligible recognized revenue
T_a = attributable applicable taxes
D_a = attributable NON_CAPITAL_DEDUCTION amounts
L_a = attributable participant-borne loss deductions approved under BR-003
K_a = eligible deployed capital for the allocation
S   = participant profit-share percentage from the lot's pinned formula version
```

Capital-recovery waterfall:

```text
AvailableForCapitalAndProfit_a = max(0, R_a - T_a - D_a - L_a)

EligibleCapitalRecovery_a = min(K_a, AvailableForCapitalAndProfit_a)

UnrecoveredCapital_a = K_a - EligibleCapitalRecovery_a

ProfitBase_a = max(
  0,
  AvailableForCapitalAndProfit_a - EligibleCapitalRecovery_a
)
```

### Deterministic profit-share cent reconciliation

Independent per-allocation rounding is forbidden because it can distort the pinned aggregate profit split. Participant profit is first computed as a lot-level pool and then distributed with largest remainder.

The closed-beta rounding mode is explicitly **half-up for non-negative values**, expressed without an engine-specific `round()` function:

```text
ExactParticipantProfit_a = ProfitBase_a × S
BaseParticipantProfit_a  = floor(ExactParticipantProfit_a)
FractionProfit_a          = ExactParticipantProfit_a - BaseParticipantProfit_a

ParticipantProfitPool = floor((sum(ProfitBase_a) × S) + 0.5)

RemainderProfitCents =
  ParticipantProfitPool - sum(BaseParticipantProfit_a)

ParticipantProfit_a = BaseParticipantProfit_a
  + 1 cent for the first RemainderProfitCents allocations ordered by:
      FractionProfit_a DESC,
      allocation_id ASC

CTGProfit_a = ProfitBase_a - ParticipantProfit_a

ParticipantSettlement_a =
  EligibleCapitalRecovery_a + ParticipantProfit_a
```

Required conservation identities:

```text
sum(ParticipantProfit_a) = ParticipantProfitPool
sum(ParticipantProfit_a + CTGProfit_a) = sum(ProfitBase_a)
```

Required interpretation:

- `FINANCED_CAPITAL_COST` is **not** deducted again in `D_a`; doing so would double-count the same cost.
- Profit is zero until the allocation's recoverable capital has been exhausted by the waterfall.
- `EligibleCapitalRecovery_a` can be less than `K_a` when realized economics are insufficient.
- `UnrecoveredCapital_a` is an economic loss/shortfall, not a debt owed by the participant and not an automatic debt owed by CTG.
- No negative settlement credit, negative participant wallet, or automatic capital call is created.
- Largest-remainder ties are deterministic by `allocation_id ASC` after the fractional remainder.
- No UI, agreement or report may describe principal or return as guaranteed.

### Current runtime gap that must be closed before approval becomes operational

The existing settlement implementation predates this final business decision and must not be treated as authoritative for a loss/shortfall case. Before the first real settlement, runtime logic and tests must be changed so `capital_recovery_cents` is calculated by the approved waterfall rather than assumed to equal committed capital, source-category attribution conserves every lot-level cent, negative economics cannot create an implicit or unreconciled money obligation, and participant-profit cents conserve the lot-level pool under the pinned half-up/largest-remainder rules.

### Approval required

- [ ] APPROVE BR-002 as written
- [ ] APPROVE WITH CHANGES
- [ ] REJECT

## BR-003 — Loss treatment

### Recommended closed-beta rule

A documented lot loss affects a participant only when all of the following are true:

1. the loss is attributable to the specific lot/allocation;
2. the loss is supported by an auditable inventory/financial event and evidence;
3. the approved formula/contract classifies it as participant-borne; and
4. it has not already been recognized through a lower realized disposition value or another deduction.

Safeguards:

- losses are append-only events; historical values are not rewritten;
- participant downside is capped at `K_a` for the allocation unless a separate signed agreement expressly says otherwise;
- no automatic capital call or negative wallet balance;
- damaged, expired, stolen, recalled or returned inventory retains reason/evidence and genealogy;
- fraud, willful misconduct, gross negligence, or an expressly CTG-borne event must not be silently passed through to participants;
- insurance, supplier recovery, salvage proceeds or later reversals are subsequent auditable entries and reduce the economic shortfall when contractually attributable;
- a single loss cannot reduce settlement twice through both inventory value and a duplicate financial deduction.

### Approval required

- [ ] APPROVE BR-003 as written
- [ ] APPROVE WITH CHANGES
- [ ] REJECT

## BR-004 — Deterministic lot-closing rule

### Recommended closed-beta rule

Every externally funded closed-beta lot must pin at creation:

- `longStopDate`; and
- `extensionDays = 30` for the closed-beta formula/contract version.

The dates may not be retroactively changed after external capital is committed except through an auditable amendment accepted under the applicable agreement rules.

A lot is eligible to enter settlement when **all** serialized eligible inventory has a documented terminal economic disposition and sales/returns/financial facts reconcile.

Timeline:

1. **Before `longStopDate`:** normal commercialization continues.
2. **At `longStopDate`:** if all inventory is terminal, the lot may proceed to settlement; otherwise one automatic operational extension of exactly **30 calendar days** begins. This extension does not guarantee any value for remaining inventory.
3. **During the extension:** remaining inventory may be sold, discounted, transferred to an authorized channel, returned/resolved, or optionally repurchased by CTG only as an actual separately authorized transaction.
4. **At `longStopDate + 30 calendar days`:** no further extension is permitted for this closed-beta version. Every remaining eligible unit must receive a terminal disposition under BR-005 before settlement can finalize.

Reaching a date alone never fabricates revenue or marks inventory sold.

### Approval required

- [ ] APPROVE BR-004 as written
- [ ] APPROVE WITH CHANGES
- [ ] REJECT

## BR-005 — Unsold inventory terminal treatment

### Recommended closed-beta rule

Unsold inventory creates **no automatic CTG repurchase guarantee**.

Disposition waterfall:

1. normal commercialization through `longStopDate`;
2. one non-renewable 30-calendar-day extension under BR-004;
3. during the extension, document any sale, discount, channel transfer, liquidation, return or CTG repurchase at actual realized economics;
4. CTG repurchase is valid only if separately authorized, documented at an explicit price/methodology and completed as a real transaction before the extension expires;
5. at the end of the extension, any eligible unit still lacking realized disposition is mandatorily recorded as a documented terminal write-off for participant settlement purposes, with **zero realized proceeds for that unit**, unless an actual authorized repurchase/disposition transaction has already been recorded;
6. any later salvage/recovery proceeds after settlement are handled only through the contractually authorized post-settlement adjustment/recovery mechanism; historical settlement facts are never silently rewritten.

The write-off rule is deliberately deterministic for the closed-beta version so a lot cannot remain economically open indefinitely. It must receive explicit business/legal approval before real-money use.

### Approval required

- [ ] APPROVE BR-005 as written
- [ ] APPROVE WITH CHANGES
- [ ] REJECT

## Required propagation after explicit approval

Approval of the prose alone is insufficient. Before a real settlement is allowed, the approved rules must be propagated into:

- `BUSINESS_MODEL.md` as authoritative business rules;
- `FINANCIAL_MODEL.md` with source-category attribution, the exact capital waterfall, half-up/largest-remainder cent reconciliation and double-count prevention;
- `LOT_STATE_MACHINE.md` / inventory rules for long-stop and terminal disposition;
- the versioned agreement/legal configuration;
- PostgreSQL settlement logic and schema fields needed to pin the long-stop/extension/formula facts;
- Golden Path financial tests covering attribution-cent edge cases, full recovery, partial recovery, zero recovery, positive profit, half-cent rounding, loss, unsold write-off and no-negative-wallet cases;
- operator/release evidence tooling.

Until this propagation is merged, tested, deployed and verified, existing real-money settlement must remain operationally blocked.

## Closed-beta execution controls

Before accepting the first real participant into the operating-evidence cycle:

- [ ] BR-001..BR-005 have explicit approval and are propagated into authoritative docs/formula/runtime controls.
- [ ] Legal instrument/tax/regulatory review has authorized the real-money closed-beta transaction; repository documentation alone is not legal approval.
- [ ] Participant identity/KYC is VERIFIED.
- [ ] Current investment agreement has been explicitly accepted and version/effective terms are retained.
- [ ] Funding is manually verified using the controlled payment-verification workflow.
- [ ] The lot has complete persisted economics; no fallback values.
- [ ] The lot has a defined physical quantity, serialization/inventory plan, long-stop date and pinned extension period.
- [ ] Public registration and public funding remain disabled.
- [ ] Settlement and withdrawal remain human-controlled/manual for the pilot.
- [ ] Custom SMTP production delivery hardening (#254) is completed before relying on public-scale signup/recovery email.
- [ ] Raw operating evidence remains private; only the `production-redacted` evidence pipeline may create release-review artifacts.

## Evidence completion criterion

The closed-beta cycle is complete only when the redacted evidence pipeline can demonstrate, without participant identifiers or secrets:

- external funding equals allocated capital;
- production and serialized inventory reconcile;
- documented sales/returns/dispositions reconcile to physical units;
- realized financial entries reconcile to the deterministic settlement waterfall;
- settlement is finalized under a pinned formula/contract version;
- at least one subsequent approved reinvestment or confirmed withdrawal is recorded;
- human review marks every production-evidence control true.

Completion of this cycle makes the evidence **eligible for release review**. It does not automatically promote the product to LIVE.

## Promotion boundary

After BR-001..BR-005 are approved, propagated and one real cycle is successfully reconciled, issue #219 still requires explicit human LIVE approval. Only after that approval should maintainers consider changing any public-registration, public-funding, automatic-settlement or automatic-withdrawal flags.
