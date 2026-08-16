# CTG One — Advanced Differentiation

## Purpose

Phase 7 turns technical maturity into public, inspectable evidence without overstating capabilities.

CTG One differentiates through three public evidence surfaces:

1. **Technology Status** (`/technology/status`) — canonical public maturity registry.
2. **CTG One Labs** (`/labs`) — experimentation framework that separates hypothesis, prototype, pilot and production.
3. **Technical Changelog** (`/changelog`) — material architecture/security/capability milestones.

## Source-of-truth rule

`Technology Status` is the only public surface that determines maturity labels.

A changelog entry, Labs experiment, roadmap document, UI concept or commercial statement MUST NOT promote a capability to `LIVE`.

Promotion requires sufficient evidence, normally including:

- production code;
- controlled authorization;
- relevant data model;
- automated validation/testing;
- deployment evidence;
- operating evidence appropriate to the capability;
- documented limitations and known risks.

## Labs publication standard

A Labs experiment should not be published as an active experiment until it has:

- explicit problem and hypothesis;
- verifiable code or technical artifact;
- authorized data and privacy boundaries;
- evaluation criteria defined in advance;
- documented failures/negative results where relevant;
- a disposition: discard, iterate, pilot or promote.

## Public proof model

The canonical registry lives in `src/data/technology-proof.ts`.

Allowed states:

- `LIVE`
- `PARTIAL`
- `IN DEVELOPMENT`
- `ROADMAP`

Claims such as uptime, users, holders, transaction volumes, performance, security certification or adoption MUST NOT be published unless backed by a verifiable source.

## Design intent

The proof layer follows the CTG One dark/gold technical design system while remaining deliberately restrained. Evidence should be easier to inspect than marketing copy.

## Future extensions

Potential later additions, only when data exists:

- automatically generated deployment/release history;
- externally monitored uptime and incident history;
- signed build provenance;
- public ADR excerpts;
- experiment registry with reproducible artifacts;
- open-source components;
- technical papers.
