# Closed Beta Decision Pack — CTG Craft Beer Inversión

Status: **PROPOSED FOR EXPLICIT BUSINESS/LEGAL APPROVAL — NOT YET AUTHORITATIVE**

This document converts the remaining BR-001..BR-005 release blockers into an explicit approval package for the first real closed-beta operating cycle. Nothing in this file enables public funding, automatic settlement, withdrawals, or LIVE status. Until the decisions below are explicitly approved and then propagated into the authoritative business/financial documentation and runtime rules, `BUSINESS_MODEL.md` remains controlling and the BR items remain pending.

## Operating objective

The first closed-beta cycle must exercise one real, fully reconciled lot through:

`verified participant → agreement acceptance → manually verified funding → lot allocation → production → serialization/inventory → documented sales/returns → finalized settlement → approved reinvestment or confirmed withdrawal → redacted evidence review`.

The cycle is deliberately supervised. Public registration/funding automation and automatic money movement remain fail-closed.

## Decision principles

The recommended baseline below follows five constraints already present in the repository:

1. calculations must be reproducible from versioned, persisted facts;
2. no guaranteed-return or guaranteed-capital language;
3. costs and losses must be attributable, evidenced and auditable at lot level;
4. a participant must never acquire an unbounded negative balance or capital-call obligation by default;
5. unresolved legal classification must not be inferred by software.

## BR-001 — Cost scope

### Recommended closed-beta rule

Eligible lot costs should include only **documented, directly attributable costs of producing and commercially realizing the specific lot/allocation**:

- brewing ingredients and consumables;
- direct production/processing costs that are measured for the lot;
- bottles, caps, labels, cases and other lot packaging;
- lot-specific quality/compliance inputs;
- lot-specific transport, fulfillment or distribution expense;
- sales-channel/commercial fees that are directly attributable to recognized lot revenue;
- authorized lot-specific adjustments supported by first-party evidence.

The following should be excluded unless a future contract/formula version expressly includes and allocates them:

- unrelated corporate overhead;
- general office/admin costs;
- unrelated rent or payroll;
- financing costs;
- general brand marketing not attributable to the lot;
- penalties, owner distributions or unrelated liabilities.

Taxes remain a separate financial category and must not be double-counted as eligible costs.

### Approval required

- [ ] APPROVE BR-001 as written
- [ ] APPROVE WITH CHANGES
- [ ] REJECT

## BR-002 — Capital recovery

### Recommended closed-beta rule

Capital recovery should be **economic recovery from realized lot proceeds, not a guaranteed repayment obligation**.

For each allocation:

1. determine the allocation's share of realized eligible lot economics;
2. calculate recoverable capital up to the participant's eligible deployed capital;
3. only positive Net Distributable Lot Profit remaining under the applicable formula version is profit-shareable;
4. participant profit share remains the versioned percentage currently intended as 50%;
5. no UI, agreement or report may describe principal or return as guaranteed.

The authoritative settlement formula must define `EligibleCapitalRecovery` precisely enough that a finalized settlement is reproducible and cannot exceed the economic amount supported by the lot's realized facts.

### Approval required

- [ ] APPROVE BR-002 as written
- [ ] APPROVE WITH CHANGES
- [ ] REJECT

## BR-003 — Loss treatment

### Recommended closed-beta rule

A documented lot loss should reduce the economic value available for capital recovery and/or profit **only to the extent it is attributable to that lot/allocation and is recognized under the approved formula**.

Recommended safeguards:

- losses are recorded through auditable financial/inventory events, never by editing historical values;
- a participant's economic downside is capped at the capital attributable to the allocation unless a separate signed agreement expressly says otherwise;
- no automatic capital call or negative wallet balance;
- damaged, expired, stolen, recalled or returned inventory must retain reason/evidence and genealogy;
- losses caused by fraud, willful misconduct, gross negligence or an explicitly excluded CTG-controlled event should not be silently passed through to participants; legal/business review must determine treatment;
- reversals and insurance/recovery proceeds must be recorded as subsequent auditable entries rather than rewriting the original loss.

### Approval required

- [ ] APPROVE BR-003 as written
- [ ] APPROVE WITH CHANGES
- [ ] REJECT

## BR-004 — Lot closing rule

### Recommended closed-beta rule

A lot may become economically closeable when either:

1. all serialized eligible inventory has reached a documented terminal disposition (sold, returned/resolved, damaged/write-off, otherwise contractually disposed), **or**
2. the lot reaches its contractual long-stop closing date.

A long-stop date does not erase unsold inventory. If inventory remains at that date, BR-005 must be applied and the lot cannot finalize settlement until the residual inventory treatment is recorded and financially reconciled.

For the first closed-beta lot, the long-stop date should be explicitly recorded at lot creation and should not be retroactively changed after external capital is committed except through an auditable, authorized amendment.

### Approval required

- [ ] APPROVE BR-004 as written
- [ ] APPROVE WITH CHANGES
- [ ] REJECT

## BR-005 — Unsold inventory

### Recommended closed-beta rule

Unsold inventory should **not** create an automatic CTG repurchase guarantee.

Recommended disposition waterfall:

1. continue commercialization through an explicitly bounded extension window where commercially reasonable;
2. document any channel transfer, discount, return, liquidation or other disposition at actual realized economics;
3. if inventory becomes unsellable, record a documented write-off/loss under BR-003;
4. CTG repurchase is permitted only if separately authorized, documented at a defined price/methodology and recorded as an actual transaction — never implied as a participant guarantee;
5. final settlement uses the resulting realized/reconciled facts.

### Approval required

- [ ] APPROVE BR-005 as written
- [ ] APPROVE WITH CHANGES
- [ ] REJECT

## Closed-beta execution controls

Before accepting the first real participant into the operating-evidence cycle:

- [ ] BR-001..BR-005 have explicit approval and are propagated into authoritative docs/formula/runtime controls where required.
- [ ] Legal instrument/tax/regulatory review has authorized the real-money closed-beta transaction; repository documentation alone is not legal approval.
- [ ] Participant identity/KYC is VERIFIED.
- [ ] Current investment agreement has been explicitly accepted and version/effective terms are retained.
- [ ] Funding is manually verified using the controlled payment-verification workflow.
- [ ] The lot has complete persisted economics; no fallback values.
- [ ] The lot has a defined physical quantity, serialization/inventory plan and long-stop date.
- [ ] Public registration and public funding remain disabled.
- [ ] Settlement and withdrawal remain human-controlled/manual for the pilot.
- [ ] Custom SMTP production delivery hardening (#254) is completed before relying on public-scale signup/recovery email.
- [ ] Raw operating evidence remains private; only the `production-redacted` evidence pipeline may create release-review artifacts.

## Evidence completion criterion

The closed-beta cycle is complete only when the redacted evidence pipeline can demonstrate, without participant identifiers or secrets:

- external funding equals allocated capital;
- production and serialized inventory reconcile;
- documented sales/returns/dispositions reconcile to physical units;
- realized financial entries reconcile to settlement;
- settlement is finalized under a pinned formula version;
- at least one subsequent approved reinvestment or confirmed withdrawal is recorded;
- human review marks every production-evidence control true.

Completion of this cycle makes the evidence **eligible for release review**. It does not automatically promote the product to LIVE.

## Promotion boundary

After BR-001..BR-005 are approved and one real cycle is successfully reconciled, issue #219 still requires explicit human LIVE approval. Only after that approval should maintainers consider changing any public-registration, public-funding, automatic-settlement or automatic-withdrawal flags.