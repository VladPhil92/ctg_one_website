# CTG Wallet — Privy Provider Readiness Production Runbook

## Purpose

The Wallet provider-readiness canary certifies that CTG One can reach the real Privy User Management API before any historical-wallet ownership preflight relies on it. The check is deliberately fail-closed: there is no local registry fallback, mock provider, synthetic success response, or bypass of the ownership boundary.

## Required production configuration

The Render service `ctg-one-website` must receive these runtime values directly from the production Privy application:

- `NEXT_PUBLIC_PRIVY_APP_ID` (or a server-side `PRIVY_APP_ID` accepted by the registry client)
- `PRIVY_APP_SECRET` — server-only; never expose it through a `NEXT_PUBLIC_*` variable, logs, artifacts, browser bundles, screenshots, issues, PRs, or chat transcripts.

`render.yaml` declares the production configuration slots with `sync: false`; source control intentionally contains no credential value.

## Recovery procedure for `PRIVY_USER_REGISTRY_NOT_CONFIGURED`

1. Open the production `ctg-one-website` service in Render.
2. Open **Environment**.
3. Confirm `NEXT_PUBLIC_PRIVY_APP_ID` contains the App ID of the same Privy application used by CTG One authentication.
4. Set `PRIVY_APP_SECRET` to that application's server-side App Secret directly in Render. Do not paste or commit the value anywhere else.
5. Save the environment changes and let Render redeploy the service.
6. Verify `GET /api/wallet/identity/provider-readiness` returns HTTP `200` with:
   - `version: ctg-wallet-provider-readiness-v1`
   - `ready: true`
   - `check.ready: true`
   - `check.code: PRIVY_USER_REGISTRY_READY`
7. Rerun **Wallet Provider Registry Production Canary**. The workflow must stay red until the real provider probe succeeds.

## Failure interpretation

- `PRIVY_USER_REGISTRY_NOT_CONFIGURED`: required runtime configuration is absent or empty.
- A provider-specific error code with HTTP `503`: configuration exists, but the real Privy request was rejected or unavailable. Inspect the bounded code and provider configuration; do not add a fallback.
- Transport/contract failure: inspect deployment health, network reachability and response contract before modifying Wallet code.

## Security constraints

- Never commit `PRIVY_APP_SECRET`.
- Never rename the secret to a browser-public prefix.
- Never change the readiness endpoint to return `200` while the provider check is false.
- Never replace the real provider probe with a database-only or local-registry success condition.
- Never bypass the authenticated provider-ownership preflight to make the canary green.
