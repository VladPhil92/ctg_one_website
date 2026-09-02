# Main provenance recovery — PR #362

PR #362 aligned the local Supabase migration filename with the version already registered in production, but it was squash-merged. The Investment BR merged-main provenance contract intentionally accepts only verified two-parent merge commits.

This marker exists solely to create a recovery PR that must be merged with GitHub's regular **merge** method. It does not change application logic, database DDL, investment business rules, or deployment configuration.
