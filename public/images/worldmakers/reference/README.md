# World Makers web reference assets (unused — superseded)

This directory is no longer read by the application. It previously described a planned local AVIF derivative set (`gameplay-overview.avif`, `visual-identity.avif`, `forms-style-animation.avif`, `character-01.avif`…`character-04.avif`) that was never populated and that `src/app/worldmakers/visual-assets.ts` no longer references.

## Current pipeline

World Makers visual masters are committed, unmodified, in the `VladPhil92/World-Makers-Game` repository under `docs/visual-reference/world-makers-v2/`. They are served to this site through `src/app/api/worldmakers/visuals/[asset]/route.ts`, which proxies the exact bytes from `raw.githubusercontent.com` (no WebP/AVIF conversion, no quality reduction, no Next.js image optimization). `src/app/worldmakers/visual-assets.ts` defines the asset contract, with an optional `WORLDMK_ASSET_*_URL` Render environment variable per asset for swapping in a different production master without a code change.

Do not add AVIF derivatives to this directory to "fix" the old table above — that would reintroduce lossy re-encoding the current pipeline is designed to avoid. If this local directory is not needed for anything else, it can be removed in a future cleanup.
