# ADR-004: Style Isolation, and Which Palette Wins

## Status
Accepted

## Context
`/inversion`'s ADR-012 reused the site's existing dark/gold "command
center" tokens, because the gold accent already read as an amber/beer
tone — no new palette needed.

`/nvetcareapp` made the opposite, already-accepted call for the
marketing page (per the user's explicit direction): it does not reuse
the dark theme. It has its own light, Poppins-driven, brand-kit-derived
identity, applied as page-scoped Tailwind arbitrary values in
`NvetCareAppSection.tsx` and a route-scoped font in
`src/app/nvetcareapp/layout.tsx` — no edits to `tailwind.config.ts` or
`src/app/globals.css`.

Separately, `Nvet-Care-App/dashboard/src/theme/tokens.ts` documents the
same official brand kit's hex values, with a comment noting it migrated
from an older sage-green/gold guess to the real ones:
`blueDeep #0D1B2A`, `greenPrimary #34B27A`, `greenLight #B7E4C7`,
`orangeAccent #FF8A3D`, `grayLight #F2F4F7`, `grayDark #333A40`. The
values already shipped in `NvetCareAppSection.tsx` were sampled with
Pillow from marketing renders rather than taken from a canonical source,
and drifted slightly: `#1E9C6C` (vs. `#34B27A`), `#FF8F2E` (vs.
`#FF8A3D`), `#0A1B2E` (vs. `#0D1B2A`).

## Decision
The dashboard extends the same identity the marketing page already
established, not the site's dark theme and not `Nvet-Care-App/dashboard`'s
own inline styles. Concretely:
- Reuse the exact local pattern from `NvetCareAppSection.tsx`: hardcoded
  hex in Tailwind arbitrary-value classes (`text-[#0D1B2A]`, never a
  template literal — Tailwind's JIT scanner needs static strings),
  `poppinsFont` inline style, the `NodeIcon`/`NvetPill`/`StatusPill`
  local components.
- Correct the three drifted values to the canonical hex
  (`#0D1B2A` / `#34B27A` / `#FF8A3D`) across both the marketing page and
  the new dashboard, so there's one source of truth instead of two
  close-but-different greens. This is a small, low-risk fix, sequenced
  as Phase 0 in `ROADMAP.md` — it doesn't need to wait for the rest of
  this plan.
- No edits to `tailwind.config.ts` or `src/app/globals.css`. The
  dashboard gets its own route-scoped layout
  (`src/app/nvetcareapp/dashboard/layout.tsx`) if it needs anything the
  marketing page's layout doesn't already provide.

## Consequences
The marketing page and the dashboard read as one product with two
surfaces, not two different-looking things that happen to share a URL
prefix. Zero risk of this bleeding into the rest of `ctgone.com`, same
guarantee ADR-012 gives `/inversion`.
