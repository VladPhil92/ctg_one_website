# CTG One Wallet — Canonical Identity Attestation V1

## Purpose

Provide the Wallet client with a read-only, server-derived proof that the currently authenticated canonical CTG user is bound to exactly one verified Privy principal and exactly one verified primary embedded EVM wallet.

This phase does not sign, broadcast, transfer, settle, top up, or mutate any financial state.

## Endpoint

`GET /api/wallet/identity/proof`

Authentication is resolved by the canonical CTG One request context. The request supplies no user ID, Privy principal, wallet address, migration mode, or financial payload.

The server reads the trusted identity link and verified primary Privy EVM account, validates their relationship and legacy-preservation semantics, then returns a bounded proof.

## Response contract

```json
{
  "proof": {
    "version": "ctg-wallet-identity-proof-v1",
    "status": "verified",
    "canonicalUserId": "<canonical CTG UUID>",
    "walletAddress": "0x...",
    "linkMode": "new | legacy_preserve",
    "legacyPreserved": true,
    "verifiedAt": "<identity verification timestamp>",
    "walletVerifiedAt": "<wallet verification timestamp>",
    "principalBindingDigestSha256": "<64 lowercase hex>"
  }
}
```

The raw Privy `provider_user_id` is never returned.

## Principal-binding digest

The server computes SHA-256 over the UTF-8 bytes of the following NUL-delimited sequence:

1. `ctg-wallet-identity-proof-v1`
2. canonical CTG user ID
3. trusted Privy provider user ID
4. normalized primary EVM wallet address
5. identity link mode
6. identity verification timestamp

The Wallet client may recompute the same digest using its active Privy principal. Equality proves that the active signing principal is the same principal linked by the trusted CTG One server without exposing that server-held identifier in the API response.

The digest is an opaque binding value, not an authentication credential or authorization token.

## Fail-closed conditions

The route refuses attestation when any of the following is true:

- canonical authentication is missing;
- the trusted identity link is absent, pending, revoked, malformed, or ambiguous;
- the verified primary Privy EVM wallet is missing or ambiguous;
- the wallet does not belong to the trusted identity link;
- the account is not the embedded Privy EVM account;
- wallet-address format is invalid;
- `legacy_preserve` provenance and the account's `legacy_preserved` flag disagree;
- trusted database reads are unavailable.

## Safety boundary

- GET/read-only only.
- No request body.
- No browser-supplied wallet provenance.
- No raw Privy principal disclosure.
- No database mutation.
- No broadcast enablement.
- No real-money canary activation.
- `VITE_CANONICAL_WALLET_BROADCAST_ENABLED` remains false until a separately reviewed and explicitly authorized production canary phase.
