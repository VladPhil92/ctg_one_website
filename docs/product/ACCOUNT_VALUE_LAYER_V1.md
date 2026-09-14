# CTG One Account Value Layer v1

## Objective

Convert the CTG One account from a technical authentication boundary into an understandable user product without overstating maturity.

The account must answer, before registration, a simple question:

> What can I actually do with a CTG One account today?

## Current value contract

A CTG One account currently provides a shared identity for capabilities that are already implemented and enabled for the user, including:

- authenticated Personal OS / dashboard access;
- identity and KYC state;
- Wallet balance and activity surfaces when available for the profile;
- CTG Craft Beer Investment participation and related account access where enabled;
- education entitlements and private learning-library access;
- compatible federated or ecosystem services according to each product's maturity and authorization contract.

The account does **not** imply that every CTG One product is live or that every service is available to every user.

## Rewards truth boundary

CTG Rewards remains a roadmap capability.

Creating an account does not by itself:

- create reward points;
- grant cashback;
- accrue loyalty value;
- create an on-chain reward asset;
- activate cross-business redemption.

Those claims may only be introduced after a real earning ledger, redemption rules, participating businesses, operational controls and public maturity evidence exist.

## Product principles

1. **Value before friction.** Registration surfaces must explain current utility before asking for personal information.
2. **One identity, multiple bounded contexts.** Shared authentication must never be presented as shared authorization.
3. **No maturity inflation.** Roadmap capabilities cannot be described as active account benefits.
4. **Web3 is optional infrastructure.** Users should not need blockchain knowledge to understand the account's core value.
5. **Progressive compounding.** New ecosystem products may add account utility, but only after their integration is real and evidenced.

## Public UX introduced in v1

- Home includes an early `AccountValueSection` before product discovery.
- Registration explains currently available account utility and the Rewards boundary before the form fields.
- The final account CTA names concrete capabilities rather than generic ecosystem language.
- Automated invariants protect placement, core account-benefit copy and the non-live Rewards disclosure.

## Non-goals

This phase does not:

- create a Rewards ledger;
- issue CTG Points;
- change KYC rules;
- change Wallet authority or financial settlement;
- change investment economics;
- change authentication or authorization semantics;
- promote CTGO/Web3 maturity;
- create new database migrations.

## Next logical phase

After v1 is validated in production, the next product phase should be **Account Activation & Personal OS v2**: turn the dashboard into a personalized activation engine that recommends the next useful action based on verified account state, real entitlements and enabled services, while instrumenting conversion from account creation to first meaningful value.
