# World Makers — Phase 4: Community & Early Access Infrastructure

Status: implemented in source and production schema pending application release.

## Objective

Create an adult-only, privacy-minimized community layer that can collect real interest in World Makers and convert that interest into an operational selection pipeline without representing a public beta as already available.

## Public surface

- `/worldmakers/community` — persistent adult interest registration.
- `/worldmakers/privacy` — World Makers community-specific privacy notice.
- family and educator pages now route into the structured intake instead of relying only on email.
- the World Makers sitemap publishes both new canonical routes.

## Intake contract

The public form collects only:

- adult or institutional email;
- optional adult/professional display name;
- audience category;
- explicit interest preferences;
- adult attestation;
- privacy consent version and timestamps;
- bounded source path.

The intake explicitly does **not** request child identity, child email, date of birth, address, identity documents, payment data or gameplay telemetry. IP addresses are used only ephemerally for an in-process abuse guard and are not persisted.

## Selection pipeline

The operational states are intentionally distinct:

1. `registered`
2. `reviewing`
3. `shortlisted`
4. `ready_to_invite`
5. `contacted`
6. `paused`
7. `declined`
8. `withdrawn`

`registered` never means beta access. `ready_to_invite` means the team has identified a profile as operationally eligible for a future invitation; it does not claim an invitation was sent. `contacted` is reserved for a real human contact action.

## Security boundary

Database tables:

- `public.worldmakers_interest_profiles`
- `public.worldmakers_interest_status_events`

Both tables have Row Level Security enabled and no direct grants for `anon` or `authenticated`. Persistence happens through the server-only service-role boundary after payload validation. The admin read/update API requires both global `admin` profile role and `SUPER_ADMIN` investment role.

The status history table is written by a database trigger whenever the profile status changes.

## Abuse controls

The public endpoint implements:

- 6 KiB request bound;
- strict Zod schema;
- explicit audience and source-path allow-lists;
- normalized unique email identity;
- honeypot field;
- same-origin / canonical-origin validation;
- in-memory hashed-IP burst limiting with no IP persistence;
- idempotent re-registration by email.

## Production schema provenance

Migration `0131_worldmakers_community_early_access` was applied to the CTG One Supabase production project before merge, producing remote migration version `20260911113727`.

Repository migration:

`supabase/migrations/20260911113727_0131_worldmakers_community_early_access.sql`

The runtime schema contract advances to logical migration `0131`, count `131`.

## Admin operations

`/admin/worldmakers` is restricted to SUPER_ADMIN and provides:

- aggregate pipeline counts;
- audience and status filters;
- bounded recent-profile list;
- status transitions;
- internal notes;
- visible distinction between registration, selection readiness and actual contact.

## Non-goals of Phase 4

This phase does not:

- create child accounts;
- create a Parent Portal account system;
- send automated invitation emails;
- claim a beta or production game build exists;
- grant game access;
- merge World Makers community profiles with CTG One account identity;
- implement behavioral marketing profiles.

Those capabilities require separate product, privacy and release gates.
