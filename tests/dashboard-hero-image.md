Dashboard hero acceptance criteria:

- The authenticated dashboard requests `/api/dashboard/hero?v=20260908-fullhd-2`.
- The endpoint returns `image/webp`.
- The payload decodes to a 1920×1080 VP8 WebP image.
- Existing greeting, overlays and the phrase “La tecnología al servicio de una sociedad más humana” remain unchanged.
