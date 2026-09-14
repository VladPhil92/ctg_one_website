# CTG One Account Activation & Personal OS v2

## Objective

Turn `/dashboard` from a navigation directory into an authenticated activation engine.

Personal OS v2 must answer a different question for each signed-in user:

> Given the account state that CTG One can verify right now, what is the most useful next action?

The answer must be derived from authoritative account read models rather than generic marketing recommendations.

## Authoritative contexts used

Personal OS v2 reads only capabilities that already exist:

- CTG One profile and KYC status;
- Wallet existence, balance and account activity;
- CTG Craft Beer Investment allocations;
- Education OS entitlements, pending orders and learning progress;
- authenticated transaction history.

Education is read through the existing authenticated `/api/education/library` boundary. Personal OS does not query education tables directly from the browser.

## Activation hierarchy

The recommendation engine follows a deterministic hierarchy:

1. complete the minimum account profile;
2. resolve rejected identity verification;
3. submit or finish KYC when required;
4. establish the Wallet context after verified identity;
5. resume an existing learning experience when real learning progress exists;
6. review existing investment allocations before suggesting new investment;
7. review existing account activity before opening another acquisition flow;
8. resolve pending education activity;
9. expose Education OS as a low-friction first-value experience;
10. fall back to ecosystem discovery only when no stronger state-backed recommendation exists.

Investment is never presented as a mandatory account-activation step.

## Product principles

### State before promotion

An existing entitlement, course, transaction or allocation takes priority over a generic acquisition CTA.

### One primary action

Personal OS exposes one dominant next action. Secondary actions remain available but must not compete equally for attention.

### Failure is not absence

When an account read model cannot be loaded, Personal OS must not interpret the failure as proof that the user has no activity in that domain.

### No new financial authority

This phase does not change KYC, Wallet authority, ledger settlement, investment economics or transaction write paths.

### Education as a first-value path

Education OS is available as an account-value experience without requiring a user to make a financial investment. Existing learning progress outranks new discovery.

## Funnel instrumentation

Personal OS records:

- `dashboard_viewed` once per mounted authenticated dashboard session;
- `first_service_used` when the user follows a state-backed activation action whose service maps to an existing funnel service key.

Analytics failure must never interrupt navigation.

## Public/private boundary

Personal OS v2 is an authenticated private experience. It does not change the public maturity claims of CTG Rewards, CTGO or other roadmap products.

## Non-goals

This phase does not:

- create Rewards or points;
- create a new database migration;
- activate Web3 capabilities;
- make investment compulsory;
- infer user interests from sensitive data;
- add autonomous financial actions;
- replace the existing domain-specific Wallet, Investment, KYC or Education applications.

Personal OS orchestrates those bounded contexts; it does not absorb their authority.

## Success condition

A newly authenticated account should move from sign-in to a first meaningful action with less ambiguity, while a returning account should be routed toward the strongest existing state signal rather than being shown the same generic dashboard as every other user.
