# CTG One Security Model

## Scope

This document records controls that are verifiable in the repository. It does not claim SOC 2, ISO 27001, PCI DSS or any other certification.

## Current controls

- Supabase authentication and server-side session handling.
- PostgreSQL Row Level Security for protected data domains.
- Server-side authorization for administrative and participant surfaces.
- Zod/input validation patterns in transactional flows.
- Fail-closed investment feature flags: sensitive capabilities remain disabled unless explicitly set to `true`.
- Fail-closed payment instructions: production top-up instructions remain unavailable while any required value is pending configuration.
- Baseline HTTP security headers: nosniff, frame denial, referrer policy, permissions policy, COOP, DNS-prefetch disablement, cross-domain policy denial and HSTS.
- Secrets are environment configuration and must never be returned by public health/status surfaces.
- Structured application logging redacts common credential/token fields before serialization.
- CI now validates critical safety invariants before typecheck and build.

## Dependency risk

At Phase 5 entry, `npm ci` reported 7 dependency advisories: 2 moderate and 5 high. They are tracked as remediation work; `npm audit fix --force` is intentionally not run automatically because forced upgrades can introduce breaking changes. CI blocks newly detected **critical** production dependency vulnerabilities via `npm audit --omit=dev --audit-level=critical`.

## Not yet claimed as complete

- Strict Content Security Policy (CSP).
- Centralized rate limiting.
- WAF/bot protection.
- SAST/secret scanning beyond platform defaults.
- Automated backup-restore verification.
- Penetration testing.
- Centralized security event monitoring.

## Next controls

1. Inventory all script/style/connect origins and introduce CSP in report-only mode before enforcement.
2. Remediate high-severity dependency advisories through reviewed version upgrades.
3. Add route-level rate limiting to authentication, KYC and financial mutation endpoints.
4. Add centralized error monitoring and alert thresholds.
5. Define and test database backup/restore and incident-response procedures.
