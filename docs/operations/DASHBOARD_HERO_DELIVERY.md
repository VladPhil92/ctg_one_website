# Dashboard hero image delivery

The authenticated dashboard hero is served by `GET /api/dashboard/hero` from a verified WebP payload assembled from text-safe repository fragments. This avoids binary corruption in connector-based repository writes while keeping the source image at 1920×1080.

The integrity helper `scripts/test-dashboard-hero-image-invariants.mjs` validates the RIFF/WEBP signature, VP8 frame header, Full HD dimensions and a minimum decoded byte size. The browser-facing constant in `src/data/dashboardHeroImage.ts` uses a versioned endpoint URL so existing cached failures are bypassed after a release.
