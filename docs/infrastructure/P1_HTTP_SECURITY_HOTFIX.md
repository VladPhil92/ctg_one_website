# P1.1 HTTP Security Hotfix

PR #94 was merged before production migration `0049_api_rate_limits.sql` was applied. Automated review identified two valid issues that were administratively resolved without corresponding code changes:

1. concurrent first-use rate-limit requests could race on insertion of the `(user_id, scope)` row;
2. development CSP did not allow the configured local Supabase HTTP/WebSocket origin.

This hotfix corrects both before migration 0049 is ever applied to production. Because production is still on migration 0048 at the time of this change, editing 0049 does not rewrite production migration history.

The rate limiter now performs `INSERT ... ON CONFLICT DO NOTHING` followed by `SELECT ... FOR UPDATE`, making row initialization concurrency-safe and serializing subsequent consumption. The CSP derives the configured Supabase origin only outside production and retains hosted Supabase origins in all environments.
