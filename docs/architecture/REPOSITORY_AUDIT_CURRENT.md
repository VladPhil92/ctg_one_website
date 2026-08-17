# CTG One Technology — Repository Audit Current

Date: 2026-08-16

## Executive summary

CTG One is a modular full-stack application, not a brochure site. The repository already contains authenticated user/admin areas, Supabase/PostgreSQL persistence, RLS, KYC, investment domain tables, production state machines, bottle serialization, inventory movements, lot-level financial facts, participant ledger, settlement logic, observability primitives, Knowledge/RAG code, and CI gates.

The next maturity gap is not visual polish. It is closing the operational loop, reducing business logic inside presentation components, increasing automated verification, and making the repository/documentation match production reality exactly.

## Current architecture

- Next.js 16.3.1 / React 19.2.8 / TypeScript
- App Router, server/client components and route handlers
- Supabase PostgreSQL, Auth, Storage and RLS
- Render production runtime
- GitHub Actions CI
- Modular-monolith investment bounded context
- Security-definer PostgreSQL RPCs for sensitive domain transitions
- Append-only participant ledger and immutable settlement design
- Unit-level bottle traceability and public serial lookup
- Basic structured logging / system-health capability
- CTG Knowledge pilot with OpenAI integration code

## Priority findings

### P0 — Operational integrity

1. **Closed loop is not yet complete as a first-class sales domain.** Bottle sales currently write unit status, inventory movement and lot revenue directly. There is no normalized `sales` / `sale_items` / `sales_channels` aggregate linking customer, channel, payment, tax and line items before financial recognition.
2. **Real-money end-to-end flow still needs automated verification.** Registration/KYC/order/payment/allocation/production/sale/settlement/withdrawal is not covered by E2E tests.
3. **Financial and operational writes need idempotency review.** RPC-level database constraints are strong in several places, but every future sale/payment/settlement command must have replay protection and explicit reference uniqueness where applicable.
4. **Production migration application remains an external operational dependency.** Repository migrations 0009–0012 exist and production was manually verified; deploy automation still does not prove database migration state automatically.

### P1 — Architecture and maintainability

1. `src/app/admin/operations/page.tsx` is ~23 KB and mixes orchestration, form state, calculations and UI. Split by domain capability before further expansion.
2. `src/components/sections/AIPlatformSection.tsx`, `AboutSection.tsx`, and `ServicesSection.tsx` are very large public components. They should be decomposed into reusable presentation blocks without altering public claims.
3. `InvestmentCheckoutClient.tsx` is ~16 KB. Checkout state/validation/server commands should be separated from presentation.
4. Data access is split between hooks, direct Supabase calls, route handlers and `src/lib/investment/queries.ts`; define a clearer query/command boundary.
5. The capability maturity model is documented but not yet a single typed registry consumed consistently by public pages, status pages and documentation.

### P1 — Testing

CI currently runs critical invariants, npm production dependency audit, TypeScript and Next.js build. This is a meaningful gate but not sufficient for financial/authorization workflows.

Required next layers:
- unit tests for economics/state calculations;
- integration tests for RPC/RLS boundaries;
- authorization matrix tests;
- Playwright E2E for auth/KYC/investment/production/sales/settlement;
- regression fixtures for largest-remainder settlement and ledger balance.

### P1 — Security / reliability

- Add explicit rate limiting to sensitive public/authenticated endpoints.
- Introduce tested CSP after asset/source inventory.
- Verify backup/restore and document RPO/RTO.
- Add incident-response runbook.
- Expand dependency/security scanning and secret-scanning policy.
- Add transactional request correlation/idempotency identifiers for sensitive commands.

### P1 — Repository hygiene

- README dependency versions had drifted from `package.json` (Next 14/React 18 vs actual Next 16/React 19).
- README migration list stopped at 0006 although repository currently contains 0001–0012.
- `tsconfig.tsbuildinfo` was tracked despite being generated build state.
- Static `public/robots.txt` and `public/sitemap.xml` coexisted with canonical Next Metadata routes, creating two sources of truth.

### P2 — Product system

- Formalize Beer Style master data rather than hard-coding style options in UI.
- Make lot-code sequencing database-authoritative instead of frontend-derived only.
- Add Sales OS and customer/channel entities.
- Add Document OS for participant and lot artifacts.
- Add Notification OS driven by domain events.
- Add an operational event/outbox model before introducing external asynchronous infrastructure.

### P2 — Observability

Current logger/health primitives are useful. Extend them with:
- build/commit identity;
- domain operation name;
- request ID;
- latency;
- auth failure classification;
- financial command failures;
- incident persistence and admin Incident Center.

### P3 — AI / Web3

- CTG Knowledge is a legitimate pilot and should continue under evidence/citation/access controls.
- First operational AI should be read-only CTG Operations Intelligence over authorized structured data.
- AI must never become authoritative for KYC approval, financial ledger writes or settlement.
- CTGO/Web3 remains ROADMAP until deployment, verified contracts, utility, security and legal evidence exist.

## Architecture rule for the next phases

Use a modular monolith. Do not introduce microservices, event brokers or distributed infrastructure until a concrete scaling/failure-isolation requirement justifies them.

Presentation components collect input and render state. Domain services/RPCs validate commands and enforce invariants. PostgreSQL remains authoritative for financial and operational facts.

## Recommended execution order

1. Closed Loop Gap Analysis and repository cleanup.
2. Domain service boundaries and typed command/query layer.
3. Beer Style Master Data + database-authoritative lot code generation.
4. Production OS component decomposition.
5. Inventory state derivation hardening.
6. Sales OS.
7. Finance/ledger linkage to Sales OS.
8. End-to-end investment flow test.
9. Settlement/withdrawal validation.
10. User/Admin OS consolidation.
11. Automated test expansion.
12. Observability/Incident Center.
13. Security hardening and backup/restore verification.
14. Document/Notification OS.
15. Read-only operational AI.

## Definition of success

A complete operation must be reconstructible from database evidence:

identity → KYC → order → payment → allocation → production lot → bottle serial → inventory movements → sale → lot financial entries → participant ledger → settlement → withdrawal.

No step should depend on an editable UI number when it can be derived from authoritative facts.
