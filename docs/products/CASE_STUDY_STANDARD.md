# CTG One Technology — Product Case Study Standard

## Purpose

Phase 3 converts technology claims into product evidence. A CTG One business unit does not become a public technology case study merely because it belongs to the ecosystem. A case study must be supported by implementation evidence.

## Required evidence

A public case study should be able to document:

1. **Operating problem** — the real business problem being solved.
2. **System boundary** — what the product owns and what remains outside its scope.
3. **Architecture** — application, data, security and infrastructure components.
4. **Operational flow** — how information and business events move through the system.
5. **Data model** — the principal entities or transactional structures.
6. **Authorization model** — roles, permissions and protected surfaces.
7. **Deployment evidence** — route, environment or production surface where appropriate.
8. **Maturity state** — LIVE, PARTIAL, IN DEVELOPMENT or ROADMAP.
9. **Known constraints** — feature flags, environment dependencies, operational gates or unresolved risks.
10. **Measured outcome** — only when real evidence is available. No invented metrics.

## Maturity vocabulary

- **LIVE** — implementation exists and can be verified in code/product architecture.
- **PARTIAL** — meaningful implementation exists, but the end-to-end capability is not complete or depends on operational configuration.
- **IN DEVELOPMENT** — active product direction with incomplete implementation.
- **ROADMAP** — intended capability without sufficient implementation evidence.

## CASE-001 — CTG Craft Beer Investment

CTG Craft Beer Investment is the first qualifying technology case study because the repository contains a dedicated bounded context covering public investment surfaces, participant/admin application areas, authentication dependencies, production batches, allocations, inventory, sales, ledger, settlements and withdrawals.

### Problem

Represent participation in physical beer production batches while connecting capital, production, inventory, sales, ledger events and settlement in a traceable application model.

### Verified architecture

- Next.js / React / TypeScript application layer.
- Supabase Auth and server-side session model.
- PostgreSQL / Supabase data layer.
- Row Level Security and protected application surfaces.
- Dedicated investment migrations and domain structures.
- Feature flags for operations that require additional production readiness.

### Operating flow

```text
Capital
  ↓
Batch
  ↓
Production
  ↓
Inventory
  ↓
Sale
  ↓
Ledger
  ↓
Settlement
```

### Public evidence

- `/inversion`
- `/inversion/lotes`
- `/inversion/como-funciona`
- `/inversion/simulador`
- protected participant and administrative areas

## Ecosystem rule

The remaining business units are treated as operating laboratories, not automatically as completed technology products. Each must cross the evidence threshold above before being promoted into `/products` as an additional numbered case study.

This protects CTG One from turning roadmap concepts into unsupported marketing claims and makes the Products section a progressively stronger record of actual engineering capability.
