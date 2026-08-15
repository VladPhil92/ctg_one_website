# ADR-012: Style Isolation

## Status
Accepted

## Decision
No new global CSS rules, no edits to `tailwind.config.ts`, no edits to
`src/app/globals.css`. `/inversion` reuses the existing dark/gold design
tokens (`bg-primary`, `bg-secondary`, `accent #c9a962`, `text-*`, `border*`)
and existing primitives (`Button`, `Card`, `Badge`, `Container`,
`FadeInSection`) exactly as the rest of the site does — the existing gold
accent already reads as an amber/beer tone, so no new palette is introduced.
`/inversion` gets its own route-scoped layout
(`src/app/inversion/layout.tsx`) that renders its own internal nav/footer;
it does not inject anything into the root layout or the existing
`Navbar`/`Footer` components.

## Consequences
Zero risk of the investment app's styling bleeding into existing pages.
Some intentional duplication of "a nav bar" and "a footer" between the main
site and `/inversion` — acceptable, matches the "isolated bounded context"
goal (ADR-000) more than a shared-chrome approach would.
