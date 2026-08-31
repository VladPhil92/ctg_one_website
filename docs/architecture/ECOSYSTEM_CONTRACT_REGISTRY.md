# CTG One Ecosystem Contract Registry

**Status:** canonical integration registry  
**Last review:** 2026-08-31

## Purpose

CTG One products may use different application frameworks and release cadences, but they must share explicit boundaries for identity, financial authority, capability availability, deployment evidence and presentation truth.

The goal is technological harmony without forcing every product into the same framework.

## Ecosystem topology

```text
                        CTG One Technology
                  identity · contracts · observability
                              │
              ┌───────────────┴───────────────┐
              │                               │
         CTG Wallet                      Nvet Care
   financial/signing client       veterinary domain platform
              │                               │
        blockchain/Privy                Nvet backend/mobile
```

## Canonical contracts

| Contract | Authority | Consumer | Rule |
| --- | --- | --- | --- |
| CTG One Identity | Supabase / CTG One | Wallet, Nvet web federation | One canonical CTG user; clients do not create a competing identity authority |
| Wallet Overview V2 | CTG One wallet BFF/domain | CTG-Wallet | Balance, KYC, identity, activity and capabilities fail closed when contract parsing fails |
| Saldo CTG | `ctg_ledger_v2` | CTG One Web + CTG-Wallet | Browser/client never mutates canonical COP |
| Wallet identity link | CTG One + verified Privy identity | CTG-Wallet | Verified primary wallet association; legacy conflicts fail closed |
| Wallet intents | CTG One | CTG-Wallet | Money movement requires durable server-created lifecycle and trusted reconciliation |
| Nvet identity exchange | CTG One BFF → Nvet backend | `ctgone.com/nvetcareapp` | Browser does not become bearer-token trust boundary |
| Nvet domain authority | Nvet backend / PostgreSQL | Nvet mobile + CTG One web surface | Appointments, veterinary roles, payments and service state remain Nvet-owned |
| Public maturity/evidence | CTG One technology proof + runtime health | Corporate web | A screen or dependency does not imply LIVE |

## Capability rule

A product capability must have an explicit runtime state. Recommended states:

- `enabled` — backed by an authoritative runtime contract;
- `controlled` — gated canary/beta with explicit guardrails;
- `read_only` — informational, quote or projection only;
- `unavailable` — UI may explain future scope but must not execute or simulate settlement.

Clients may make a capability stricter than the server contract. They must not make it more permissive.

## Wallet capability baseline

| Capability | Current product state |
| --- | --- |
| Saldo CTG read/activity | Authenticated canonical read model |
| COP top-up | Capability-driven; KYC + canonical handoff required |
| Receive crypto | Requires verified primary EVM account |
| Send crypto | Controlled canary only; not public money movement |
| Swap | Quote-only |
| Bank withdrawal | Unavailable |
| Third-party crypto purchase | Unavailable |

## Nvet federation baseline

Nvet Care remains an autonomous veterinary bounded context while reusing CTG One account federation for web access.

- CTG One owns CTG account identity/session.
- Nvet backend owns Nvet roles and veterinary domain authorization.
- `ctgone.com/nvetcareapp` is the canonical Nvet web surface.
- Nvet mobile/backend may evolve independently from CTG One's Next.js runtime.
- Shared harmony is enforced through contracts, observability, release compatibility and UX conventions rather than framework uniformity.

## Technology compatibility policy

Version equality across repositories is not required. Compatibility is required at boundaries.

Every cross-repository release that changes a contract should record:

1. producer repository and contract version;
2. consumer repository and minimum compatible version;
3. deployment order;
4. fail-closed behavior during partial rollout;
5. CI contract evidence;
6. runtime deployment SHA/schema evidence when production is claimed.

## Presentation truth

Public pages must distinguish:

- real runtime screenshot/evidence;
- conceptual architecture/mockup;
- controlled beta/canary;
- roadmap/future capability.

Marketing copy must never promote a provider SDK, prototype screen or local simulation as proof that a financial or veterinary workflow is live.

## Deployment evidence

A merge is not automatically a deployment. Production claims require provider/runtime evidence such as:

- Render deployment SHA + `/api/health` for `ctgone.com`;
- Railway/backend health and release evidence for Nvet;
- Vercel deployment metadata matching the intended CTG-Wallet `master` SHA for the Wallet PWA.

## Ownership

`docs/architecture/SYSTEM_STATE.md` remains the authoritative source registry for CTG One itself. This document governs cross-product integration boundaries and must be updated when Wallet/Nvet contract ownership changes.
