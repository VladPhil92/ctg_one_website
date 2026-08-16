# CTG One Ecosystem Technology Map

## Purpose

This document defines how CTG One maps technology maturity across its operating business ecosystem.

The public `/ecosystem` page is not a marketing inventory. It is a maturity map that distinguishes implemented systems from partial work, active development, and future architecture.

## Maturity states

- `LIVE`: verifiable implementation exists and is operating in the repository/product context.
- `PARTIAL`: some implementation exists, but the capability is incomplete or not consolidated as a shared platform capability.
- `IN DEVELOPMENT`: active product or architecture work exists, but production maturity has not been demonstrated.
- `ROADMAP`: strategically relevant target capability without sufficient current implementation evidence.

A capability must not be promoted because of business intent alone.

## Mapping model

Each unit is described through five dimensions:

1. **Business context** — what the operating unit does.
2. **Operating problem** — the real process or coordination problem technology may address.
3. **Verified current state** — what can be responsibly claimed today.
4. **Capabilities** — specific technology functions, each with its own maturity state.
5. **CTG One OS modules** — shared architectural modules relevant to that business context.

A module association does not imply that the module is already deployed in that unit. It describes architectural relevance. Capability status is the source of truth for maturity.

## Current strongest evidence

### CTG One Technology — LIVE

The central platform layer has verifiable implementation around:

- Next.js / React / TypeScript application engineering;
- Supabase and PostgreSQL;
- authentication and protected sessions;
- Row Level Security patterns;
- shared security controls;
- GitHub Actions CI;
- Render production deployment;
- health and baseline observability infrastructure.

The general AI runtime remains `IN DEVELOPMENT`.

### CTG Craft Beer — LIVE

CTG Craft Beer Investment is the strongest applied-technology case in the current ecosystem. Verifiable implementation includes specialized data models and interfaces around production batches, allocations, inventory, ledger concepts, participant/admin experiences, and controlled investment workflows.

Automatic settlement and real money-moving capabilities must remain governed by feature flags and maturity evidence.

### Partial and development units

CTG One Design and PISÁO have partial digital/system capabilities. Nvet Care, Vantage Libranza Plus, and Guest Logistics Concierge are represented as `IN DEVELOPMENT` based on their current product direction and repository context. Other units remain `ROADMAP` until code and operational evidence justify promotion.

## Promotion rule

Before moving a capability to `LIVE`, verify at minimum:

- production code exists;
- authorization boundaries are defined;
- required data models exist;
- sensitive configuration fails closed;
- critical paths have appropriate tests;
- production behavior can be observed;
- documentation reflects the implemented state;
- the public claim can be demonstrated without relying on aspiration.

## Governance

`src/data/ecosystem-technology.ts` is the canonical public maturity map.

Updates to this file should accompany the implementation PR that changes the underlying capability whenever possible. Marketing-only maturity promotions are not allowed.

## Relationship to CTG One OS

CTG One OS is the shared architectural layer. The ecosystem map demonstrates where that architecture is relevant and where it is progressively becoming real.

The long-term differentiation is not that every company uses identical software. It is that reusable identity, data, security, transaction, automation, integration, AI, analytics, and infrastructure capabilities can be deployed across multiple real operating environments without rebuilding the foundational layer from zero.
