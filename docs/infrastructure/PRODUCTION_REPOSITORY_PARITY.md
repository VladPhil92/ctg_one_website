# Production ↔ Repository Parity

Status: **OPERATIONAL RUNBOOK**

This document defines how CTG One verifies that the public website, the deployed Render service and the GitHub repository describe the same system. It does not replace runtime authorities defined in `docs/architecture/SYSTEM_STATE.md`.

## What parity means

Production is considered coherent with the repository only when all four layers below agree:

1. **Commit parity** — the Render deployment serving `ctgone.com` identifies the same commit SHA that is expected from the release branch (`main`).
2. **Runtime parity** — `/api/health` and Admin System Health report a runtime/schema state compatible with the release expected by the repository.
3. **Public capability parity** — maturity labels and public product claims are derived from `src/data/technology-proof.ts` when a canonical capability exists.
4. **Documentation parity** — README and operational documentation point to authoritative sources instead of copying mutable runtime facts into prose.

A green deployment alone is not enough. A page can be built from the correct commit while still publishing a stale or manually duplicated capability claim.

## Canonical authorities

| Concern | Authority |
|---|---|
| Git release identity | GitHub `main` commit SHA |
| Deployed identity | Render deployment commit SHA + deployment identity exposed through observability |
| Runtime/schema compatibility | `/api/health`, Admin System Health and `src/lib/observability/schema-version.ts` |
| Public capability maturity | `src/data/technology-proof.ts` |
| Public directory navigation/descriptions | `src/config/dashboard-services.ts` |
| Public CTGO technical claim boundary | `web3` capability evidence in `src/data/technology-proof.ts` |
| CI contract | `.github/workflows/ci.yml` + `package.json` |

`src/config/dashboard-services.ts` may define navigation, descriptions and non-technical UX states such as `ACCOUNT`, but it must not independently override the maturity of Investment, CTGO/Web3, CTG Knowledge or any other capability already represented in `technology-proof.ts`.

## Audit snapshot — 2026-09-07

At the beginning of this audit:

- GitHub `main`: `b91fe57ebb6d17c575bc0788e6c59d31f6a7e360`.
- Render production: latest deployment was `live` and referenced the same commit.
- Therefore **commit parity was correct**.

The public homepage, however, contained maturity drift:

| Surface | Public UI before correction | Canonical technical state |
|---|---|---|
| CTG Craft Beer Investment | `LIVE` | `BETA` |
| CTG Knowledge | `PILOT` | `BETA` |
| CTGO/Web3 | `CONSOLIDATION` | `ROADMAP` |

The homepage also stated that CTGO had already been deployed on Polygon, while the canonical Web3 evidence explicitly said that no verified production contract/network evidence had been published. That claim was therefore not evidence-safe.

The correction makes the overlapping dashboard/public-directory statuses derive from `getCapabilityProof(...)` + `getPublicProofStatus(...)` and changes the CTGO homepage showcase to the evidence-bounded ROADMAP narrative.

## Required verification before merge

Run the repository contract from a clean install:

```bash
npm ci
npm test
npm run lint
npx tsc --noEmit
npm run build
```

The test suite includes `scripts/test-public-maturity-coherence-invariants.mjs`, which prevents the three audited maturity states from being manually reintroduced and rejects the unverified CTGO Polygon deployment statement.

## Required verification after merge/deploy

1. Read GitHub `main` SHA.
2. Read the latest Render production deployment SHA and require exact equality.
3. Confirm the Render deployment is `live`.
4. Check `/api/health` and the runtime schema compatibility signal.
5. Open `/technology/status` and the homepage.
6. Confirm the public directory shows:
   - Investment: `BETA`;
   - CTG Knowledge: `BETA`;
   - CTGO/Web3: `ROADMAP`.
7. Confirm no public CTGO surface claims a verified production contract/network unless `src/data/technology-proof.ts` has first been promoted with traceable evidence.

## Promotion discipline

A maturity promotion must occur in this order:

```text
real evidence
→ canonical proof update
→ invariant/test update
→ dependent public surfaces inherit the new status
→ CI
→ merge
→ deploy
→ production parity verification
```

Do not promote a product by editing a homepage badge, marketing paragraph or dashboard registry first. Public presentation is downstream of evidence.

## Failure handling

If production SHA differs from `main`, do not describe production as synchronized. Identify the release that is actually serving traffic and reconcile deployment state first.

If SHA parity is correct but public claims differ from the canonical registry, treat it as **semantic drift**: fix the duplicated presentation source and add an invariant so the contradiction cannot silently return.

If runtime schema compatibility fails, treat the deployment as unhealthy even when Render reports the process as live. Database-first deployment orchestration and migration/runbook rules remain authoritative.
