# ADR-004: No Hard Deletes for Financial Data

## Status
Accepted

## Decision
`investment_ledger_entries`, `investment_settlements`, `investment_withdrawal_requests`,
`investment_reinvestment_requests`, and `investment_audit_log` never support
hard delete from any application code path or admin UI. Correction happens
through lifecycle states (`CANCELLED`, `REJECTED`) or explicit `REVERSAL`
ledger entries that reference what they reverse. This mirrors the existing
CTG One deposits system, which already never lets `admin_audit_log` be
edited or deleted.

## Consequences
Storage grows monotonically; this is an accepted cost of auditability. No
soft-delete `deleted_at` column either — a cancelled/rejected record is still
a true historical fact and stays fully visible to admins/auditors.
