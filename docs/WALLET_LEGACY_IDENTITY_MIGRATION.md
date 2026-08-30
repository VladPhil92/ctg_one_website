# CTG One Wallet — legacy Privy identity migration runbook

Status: guarded operator tooling / no money movement / no automatic wallet creation.

This runbook prepares the server-only `wallet_legacy_migration_evidence` required by `linkMode=legacy_preserve`. The evidence import does not link a wallet by itself. It only records immutable provenance that the later trusted identity-link endpoint must independently match against a signed Privy identity token.

## Safety model

The import must stop when any of these conditions is observed:

- a canonical CTG user is missing from `profiles`;
- one canonical CTG user appears more than once in the source artifact;
- one Privy user id appears more than once;
- one EVM address appears more than once, case-insensitively;
- existing immutable migration evidence differs from the artifact being reviewed;
- a Privy identity is already linked or evidenced for another CTG user;
- an EVM address is already linked or evidenced for another CTG user;
- the canonical CTG user already has a different active primary EVM wallet.

Never resolve one of these conditions by creating another wallet, changing the historical address, deleting evidence, or using `linkMode=new` as a fallback.

## Source artifact

Keep real migration artifacts outside Git. The repository already ignores `.private-evidence/`; a recommended local path is:

```text
.private-evidence/wallet/legacy-privy-export.json
```

Required schema:

```json
{
  "schema_version": "ctg-wallet-legacy-evidence-v1",
  "captured_at": "2026-08-30T18:30:00.000Z",
  "source": "privy-authoritative-export:<operator reference>",
  "records": [
    {
      "canonical_user_id": "11111111-1111-4111-8111-111111111111",
      "privy_user_id": "did:privy:example",
      "wallet_address": "0x1111111111111111111111111111111111111111",
      "wallet_type": "privy_embedded"
    }
  ]
}
```

Rules:

1. `canonical_user_id` must be the canonical Supabase/CTG One UUID, not the Privy user id.
2. `privy_user_id` must come from authoritative Privy tenant/admin export or equivalent trusted provider tooling.
3. `wallet_address` must be the historical embedded EVM wallet. Preserve the observed representation in the file; comparison is case-insensitive.
4. `wallet_type` must be exactly `privy_embedded` in this migration phase.
5. `captured_at` must include an explicit timezone.
6. `source` must identify the authoritative export/process sufficiently for operator review without embedding credentials.
7. Do not add passwords, access tokens, private keys, seed phrases, service-role keys, JWTs or KYC documents to this artifact.

The importer hashes the exact source bytes with SHA-256. That digest is persisted in every imported evidence row, so changing whitespace or reserializing the JSON creates a different provenance artifact.

## Credentials

Run the importer only from a trusted operator environment.

Preferred current server credential:

```text
SUPABASE_SECRET_KEY=sb_secret_...
```

Legacy compatibility is supported only for an actual service-role JWT:

```text
SUPABASE_SERVICE_ROLE_KEY=...
```

The script rejects publishable keys and verifies that a legacy JWT decodes to `role=service_role`. Never put either privileged credential in `NEXT_PUBLIC_*`, browser storage, a mobile build, Git, screenshots, issue comments or the evidence JSON.

Set the project URL with either:

```text
SUPABASE_URL=https://<project>.supabase.co
```

or the existing server environment `NEXT_PUBLIC_SUPABASE_URL`.

## Step 1 — deterministic local validation and database preflight

Run without `--apply` first:

```bash
node scripts/import-wallet-legacy-evidence.mjs \
  --input .private-evidence/wallet/legacy-privy-export.json
```

Expected successful outcome:

```text
Legacy wallet evidence dry-run:
  digest: <64 hex chars>
  records: N
  inserts: N
  already present: 0
  conflicts: 0
DRY_RUN_OK — no database writes were attempted.
```

The dry-run validates the file and then reads the relevant canonical profiles, legacy evidence, identity links and external wallet accounts. It does not insert, update, upsert or delete anything.

If `conflicts` is non-zero, stop. Preserve the artifact and investigate the mapping. Do not proceed to `--apply`.

## Step 2 — reviewed apply with digest confirmation

After an operator independently reviews the dry-run output, repeat the exact SHA-256 digest:

```bash
node scripts/import-wallet-legacy-evidence.mjs \
  --input .private-evidence/wallet/legacy-privy-export.json \
  --apply \
  --confirm-digest <exact-sha256-from-dry-run>
```

The apply phase:

- reruns the full database preflight;
- requires the confirmation digest to match the exact file bytes;
- inserts only previously absent evidence rows;
- treats exact existing provenance as an idempotent no-op;
- never updates, upserts or deletes existing evidence;
- remains protected by the database uniqueness constraints and immutable-evidence trigger.

A successful write reports:

```text
APPLY_OK — inserted N immutable legacy migration evidence row(s).
```

## Step 3 — controlled legacy account verification

Importing evidence does **not** link the wallet. For one reviewed canary account, the subsequent product flow must still complete all of the following:

1. canonical Supabase login;
2. Privy custom/JWT authentication for that same CTG user;
3. signed Privy identity token available;
4. client submits `POST /api/wallet/identity/link` with `linkMode=legacy_preserve` only;
5. server verifies canonical user + rate limit + migration evidence + Privy token;
6. server-side `link_verified_wallet_identity(...)` succeeds atomically;
7. `GET /api/wallet/overview` is refetched;
8. exactly one verified primary Privy EVM account is returned;
9. its address equals the historical evidence address;
10. only then may the client signer become available.

Any provider/address mismatch, ambiguous account, revoked state or duplicate ownership remains a stop condition requiring operator review.

## Production activation gate

Do not enable broad legacy identity linking until:

- `ctg_one_website` CI and Wallet Trusted Identity Boundary are green on the importer change;
- CTG-Wallet CI can execute its normal runner steps and passes web/Android/iOS gates;
- Privy issuer/audience/JWT verification configuration is verified in the target environment;
- the target Wallet origin is allow-listed in CTG One CORS;
- the real legacy inventory has been independently reviewed and hashed;
- at least one canary legacy account has preserved its exact historical address end to end;
- no collision or ambiguity remains unresolved.

This runbook does not authorize COP funding, withdrawal, blockchain transfer, Investment settlement or any other money movement.
