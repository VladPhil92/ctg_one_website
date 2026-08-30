# Manual COP top-up — Saldo CTG

## Decision

The first CTG One Wallet COP funding rail uses the approved static Bancolombia/Bre-B QR plus authenticated payment-proof submission. It deliberately does **not** require a Bancolombia API, dynamic QR generation, PSE, crypto on-ramp, P2P transfer, or automatic bank reconciliation.

## User flow

1. The user authenticates with the canonical CTG One identity.
2. KYC must be `verified`.
3. `/dashboard/depositos` displays the approved static Bre-B QR and key.
4. The user transfers COP from their bank.
5. The user records the paid amount, the bank reference, and uploads the proof from the authenticated session.
6. `POST /api/wallet/deposits` binds the claim to the authenticated canonical user. The browser cannot choose another `user_id`.
7. The proof is hashed and stored privately. The claim is `submitted`; no balance is credited.
8. An administrator independently checks the real Bancolombia/Bre-B movement and marks the claim `verified`.
9. A different administrator reconciles the verified claim. Only this step credits the authoritative COP compatibility balance.
10. Wallet V2 exposes the new canonical balance/activity to CTG One and CTG-Wallet clients.

## Financial authority

`public.wallets.balance_cents` remains the authoritative compatibility balance during this phase. The Wallet V2 journal remains shadow/non-authoritative until a separate cutover is reviewed.

A payment proof is evidence, not money. The following must remain true:

- the client never writes `public.wallets.balance_cents`;
- the client never inserts an approved financial transaction;
- a duplicate rail/reference cannot be credited twice;
- an exact submission retry is idempotent;
- uploading a proof never credits balance;
- verification never credits balance;
- reconciliation is the only top-up step that credits balance;
- the verifier cannot reconcile the same claim;
- every privileged action remains attributable through the audit log.

## Product boundary for this MVP

`Saldo CTG` is the user-facing name for the reconciled internal COP balance. This implementation does not add unrestricted bank withdrawals, user-to-user COP transfers, open-loop merchant payments, interest, or yield. Investment and Web3 positions remain separate domains and must not be collapsed into the Saldo CTG figure.

Any later withdrawal, P2P, on/off-ramp, or open-loop payment capability requires a separate architecture/security/legal review and must not be inferred from the existence of a Saldo CTG balance.

## Static QR provenance

The approved QR payload is already stored as an immutable, scan-validated module matrix in `src/lib/investment/payment-qr.ts`. The Wallet route renders that same matrix at `/api/wallet/payment-qr`; no bank credential, private API key, mutable third-party asset URL, or dynamic QR provider is involved.

## Operations

The admin queue at `/admin/depositos` works directly from `wallet_topup_claims`:

- `submitted` → verify the real bank movement or reject;
- `verified` → a second administrator reconciles and credits Saldo CTG, or rejects if a discrepancy is found;
- `reconciled` and `rejected` leave the active queue but remain in the database/audit history.

For a real-money canary, confirm production migrations through 0083, Supabase/storage configuration, KYC, admin permissions, the QR scan destination, and successful CI before sending funds.
