# World Makers public site contract

## Purpose

`worldmakers.ctgone.com` is the public product/brand surface for World Makers. It is served by the CTG One Next.js application but must read as a distinct World Makers property.

The direct application route is `/worldmakers`. On the World Makers hostname, `/` is rewritten internally to that route so the canonical public URL remains `https://worldmakers.ctgone.com`.

## Product-truth rules

Public copy must distinguish among:

1. **Concept/reference direction** — visual or gameplay intent that may exceed current runtime fidelity.
2. **Source-complete** — code/content contracts are present and pass repository-level validation.
3. **Native-certified** — Unreal Engine native build/automation has executed successfully in the locked native environment.
4. **Device-certified** — representative-device evidence exists for the target tablet tier.
5. **Publicly playable** — an actual user-accessible build or controlled test has been opened.

A lower level must never be presented as evidence of a higher level. In particular, green GitHub CI is not Unreal native certification or tablet certification.

## Current public experience

The site includes:

- first-person visual-direction hero;
- gameplay pillars: Explore, Experiment, Create, Care;
- interactive World Atlas for the Caribbean Rainforest vertical slice and Fantastic Learning Universe adventure candidates;
- Experience → Concept → Formalization learning architecture;
- science-mission interface concept;
- Maker archetypes and World Makers visual-identity statement;
- child-safety/product principles;
- roadmap-aligned public development status;
- interest/contact surfaces for families, educators and the development community.

## Content authority

For gameplay, curriculum and roadmap claims, the authoritative source is `VladPhil92/World-Makers-Game`, especially:

- `README.md`;
- `docs/roadmap.md`;
- `docs/fantastic-learning-universe.md`;
- `docs/visual-identity-animation-policy.md`.

The marketing site may simplify language for public comprehension but must not invent production status, certifications or released functionality.

## Canonical host and SEO

Canonical origin: `https://worldmakers.ctgone.com`

The World Makers route owns page-level metadata, OpenGraph/Twitter presentation and VideoGame JSON-LD. Concept images used as social preview must remain labeled or described as conceptual when fidelity is aspirational.

## Safety and conversion boundary

Until a real controlled beta exists, calls to action must use language such as **register interest**, **contact the team** or **follow development**. They must not imply that public Early Access, downloads or production accounts are available.

No child-directed payment flow, purchasable premium currency, paid randomness or third-party advertising may be introduced into World Makers child gameplay through this public surface.

## Release boundary

Code readiness and hostname readiness are separate:

- merge/deploy the Next.js implementation;
- attach `worldmakers.ctgone.com` to the production hosting service;
- configure/verify DNS and TLS;
- validate canonical host, OpenGraph metadata and root rewrite in production;
- only then treat the branded hostname as live.
