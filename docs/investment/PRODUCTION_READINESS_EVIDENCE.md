# Investment Production Readiness Evidence

Status: **REPOSITORY IMPLEMENTED; REAL OPERATING EVIDENCE STILL REQUIRED**

## Purpose

Phase 18 closes the gap between deterministic CI evidence and deployment-level verification for CTG Craft Beer Investment without mutating production.

Phase 17 proves the economic and operational loop against a clean PostgreSQL database. Phase 18 verifies that the exact Git revision deployed to Render exposes a schema-compatible Investment runtime and the canonical `/inversion` surface while preserving the controlled `PARTIAL` / `BETA` maturity state.

This phase does not promote Investment to LIVE and does not claim that real participant money, real production inventory, real settlement or real payout operations have been exercised in production.

## Runtime readiness endpoint

`GET /api/investment/readiness` is a public-safe, read-only deployment probe. It exposes only non-sensitive release/readiness metadata:

- canonical Investment capability identifier;
- technical maturity from `src/data/technology-proof.ts`;
- public release stage from the same canonical registry;
- Render deployment identity;
- expected migration identity and runtime schema compatibility;
- explicit evidence boundary between CI certification, deployment readiness and real operating evidence.

It does not query participant, KYC, order, allocation, ledger, inventory, settlement or payout rows and contains no write path.

## Post-deploy canary

`scripts/verify-investment-production-readiness.mjs` runs after the existing deployment-health verifier in the `Post-Deploy Health Canary` workflow.

The verifier fails closed unless all of the following are true:

1. the readiness endpoint is healthy;
2. the deployed Render commit exactly equals the workflow target SHA;
3. the deployed branch is `main`;
4. the runtime database schema matches the repository migration contract;
5. Investment remains technically `PARTIAL` and publicly `BETA`;
6. CI Operational Golden Journey evidence is marked `certified`;
7. real production operating evidence remains marked `pending`;
8. the canary is explicitly `read-only`;
9. `https://ctgone.com/inversion` resolves successfully as the canonical HTML surface.

The canary uses only public HTTPS GET requests. It introduces no service-role key, database password, provider credential, mutation command or paid third-party dependency.

## Evidence classes

### CI operational evidence

Phase 17's clean-database Operational Golden Journey proves the repository implementation can conserve the modeled economic loop across funding, payment, production, serialization, inventory, sale/return, settlement, reinvestment and confirmed payout.

This is deterministic test evidence, not proof that the same sequence has occurred with production participants or production inventory.

### Deployment readiness evidence

A successful Phase 18 canary proves that the expected Git revision is live on Render, its runtime schema is compatible, its Investment release stage remains correctly represented and its public Investment surface is reachable.

### Production operating evidence

Production operating evidence requires separately reviewed real-world evidence from actual authorized operations. Examples may include appropriately redacted evidence of real lot funding, production/inventory progression, documented sales/returns, settlement and participant liquidity actions.

No such evidence is synthesized by this phase. Absence of real operating evidence must continue to block any LIVE promotion.

## Safety boundary

The readiness system is intentionally observational:

- HTTP methods are GET only;
- no participant authentication is impersonated;
- no domain command RPC is invoked;
- no money movement is initiated or confirmed;
- no lot state is changed;
- no KYC record is read or changed;
- no inventory unit is changed;
- no production secret is required by the canary;
- no readiness result can automatically change capability maturity.

## Promotion rule

`src/data/technology-proof.ts` remains the sole capability-maturity authority. A successful deployment canary is necessary operational evidence for release readiness, but it is not sufficient for LIVE promotion.

Investment stays `PARTIAL` / `BETA` until the product's remaining business/legal decisions and real operating-evidence gates are explicitly satisfied and reviewed.
