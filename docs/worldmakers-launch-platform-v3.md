# World Makers Launch Platform — Phase 3

## Purpose

Phase 3 turns the World Makers public site from a single product landing page into a navigable launch platform. The site should help families, educators, potential collaborators and the development community understand the game without overstating runtime maturity.

## Public surfaces

- `/worldmakers` — brand/product landing and interactive concept atlas.
- `/worldmakers/how-to-play` — core loop, Free World vs Adventures, Experience → Concept → Formalization.
- `/worldmakers/adventures` — Fantastic Learning Universe catalog.
- `/worldmakers/adventures/[slug]` — individual adventure concept sheets.
- `/worldmakers/development` — build-in-public roadmap, truth ladder and cached recent public GitHub activity.
- `/worldmakers/media` — visual-direction gallery and concept-art boundaries.
- `/worldmakers/families` — family-facing safety, privacy and Parent Portal direction.
- `/worldmakers/educators` — pedagogy, evidence and multidisciplinary mission contract.

The dedicated hostname supports clean aliases such as `https://worldmakers.ctgone.com/adventures`; direct CTG One preview paths under `/worldmakers/*` remain valid.

## Product-truth ladder

Public copy must preserve the following ordering:

1. **Concept** — visual direction, design candidate or narrative proposal.
2. **Source complete** — implementation/source tests exist, but runtime certification may still be pending.
3. **Native certified** — the locked Unreal environment has compiled and executed required native automation evidence.
4. **Device certified** — representative target-device evidence has passed.
5. **Publicly playable** — a release is actually accessible to intended users under stated conditions.

A lower level must never be presented as a higher level merely because CI is green or a visual mockup exists.

## Build-in-public feed

The Development page may query the public `VladPhil92/World-Makers-Game` GitHub commits endpoint with an hourly Next.js revalidation window. The integration must fail safely: if GitHub is unavailable or rate-limited, canonical roadmap information remains visible and the page must not fail to render.

Recent commits demonstrate development activity only. They are not proof of native Unreal execution, representative-device certification or public release.

## Adventure publishing rule

Adventure pages are public design/product documents. They expose premise, disciplines, player actions, concepts and intended learning evidence. Candidate pages do not imply that an adventure is currently packaged or playable.

The World Makers quality rule remains:

> If the academic idea can be removed without materially changing how the mission is played, the mission has not yet reached the World Makers quality bar.

## Family and educator communication

Until a durable production interest/CRM flow exists, the site must not label a mailto action as a completed automated registration or waitlist enrollment. Contact CTAs explicitly describe direct contact rather than silently implying persistence.

## SEO

Canonical World Makers URLs use `https://worldmakers.ctgone.com`. The global sitemap includes the public portal surfaces and adventure pages. Clean subdomain routes are rewritten internally to the `/worldmakers/*` application namespace.

## Release boundary

Phase 3 changes public content, routing, server-side public GitHub reads and presentation only. It does not change:

- Supabase schema;
- authentication;
- Wallet authority;
- payments;
- child gameplay runtime;
- Unreal certification state;
- multiplayer capability.
