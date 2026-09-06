# Phase 3 — Privilege Boundary Hardening

## Scope

This phase narrows high-impact CTG One administrative mutations to a server-only trust boundary while preserving the canonical end-user session as the actor identity.

Protected operations in this slice:

- Wallet top-up verification
- Wallet top-up independent reconciliation
- Wallet top-up rejection
- KYC approval
- KYC rejection

## Authorization chain

1. The API route resolves the authenticated user through the normal cookie-backed Supabase client.
2. The route checks `public.is_admin()` under the user's RLS/JWT context.
3. Only after that check does the route instantiate `createAdminClient()`.
4. The service-role client invokes a dedicated `*_server` RPC and passes the authenticated `user.id` as `p_actor_user_id`.
5. The server RPC independently revalidates that actor against the canonical `public.profiles.role = 'admin'` source.
6. The server RPC binds the validated actor to the delegated legacy RPC so existing audit trails and verifier/reconciler separation remain intact.

## Database privilege contract

The five `*_server` RPCs:

- are `SECURITY DEFINER` with `SET search_path = ''`;
- are not executable by `public`, `anon`, or `authenticated`;
- are executable only by `service_role`;
- never trust an arbitrary caller-provided role claim.

## Rollout strategy

Migration 0111 is additive. The legacy authenticated RPC grants remain temporarily available until the application version using the server-only routes is deployed and verified. A subsequent privilege-contraction migration will revoke direct `authenticated` execution of the legacy administrative RPCs. This avoids a deployment-order outage while still converging toward a single privileged mutation boundary.
