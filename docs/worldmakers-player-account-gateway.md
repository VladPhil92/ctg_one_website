# World Makers Player Account Gateway

World Makers uses the existing CTG One Supabase identity as its web player-account boundary. The public game portal does not create or store a second password or duplicate identity.

## Public entry points

- `https://worldmakers.ctgone.com` exposes persistent **Iniciar sesión** and **Crear cuenta** controls.
- Sign-in is handled at `https://ctgone.com/iniciar-sesion?next=/worldmakers/account`.
- Registration is handled at `https://ctgone.com/registro?next=/worldmakers/account`.
- The authenticated player hub lives at `https://ctgone.com/worldmakers/account`.

Using the canonical CTG One auth origin avoids creating a second cross-subdomain authentication surface and keeps the existing Supabase callback allowlist and cookie/session boundary authoritative.

## Registration and confirmation

The registration form validates `next` with `safeRedirectPath`, carries the validated destination into `emailRedirectTo`, and the existing `/auth/callback` route exchanges the Supabase code server-side before redirecting to the requested internal destination.

## Player hub

`/worldmakers/account` is a server-rendered protected page. It validates the current identity with `supabase.auth.getUser()` and redirects unauthenticated visitors to the canonical CTG One sign-in page. User metadata is used only for display, never as an authorization source.

The current hub intentionally exposes identity/account readiness, World Makers discovery links, and future-player-feature placeholders. It does **not** claim that a public playable beta, persistent game progress, achievements, or multiplayer identity are already available.

## Future boundary

The separate World Makers Game backend may later own game-native profile/progression data. That integration should link to the canonical CTG One user identity through an explicit server-side trust contract rather than introducing a second end-user password system.
