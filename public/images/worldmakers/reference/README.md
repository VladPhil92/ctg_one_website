# World Makers web reference assets

This directory is reserved for web-quality derivatives made from the approved original World Makers image-generation outputs. Do not populate this surface from the documentation thumbnails in `World-Makers-Game/docs/visual-reference/world-makers-v1`: those files are intentionally tiny documentation derivatives and are not suitable for website presentation.

Required files:

| File | Display dimensions | SHA-256 |
| --- | ---: | --- |
| `gameplay-overview.avif` | 1080×720 | `30327ec27475b3e12087564e90451436a35e4bd8acabc3dbf8cdd5015deec8ab` |
| `visual-identity.avif` | 720×1080 | `dd16e118f7fdb623dbaa74115ccaeb07c5231b6dcbf42d15adf37fa9b27c293c` |
| `forms-style-animation.avif` | 960×877 | `739420c1e0cf417b7965e99af9839979466a2a32e5547c068018d6da1882a51e` |
| `character-01.avif` | 720×900 | `e5346189fef392dec57c07fac31919d3ccb7cdf96c84a6413dec0ab2842d3695` |
| `character-02.avif` | 720×900 | `055f021dc48188d752ad6d6a8bf58f510d926e188c18674b3789ceae8ca0f264` |
| `character-03.avif` | 720×900 | `2085dd50ee887768b551311adbd67732321e6a985923ca099f23c0885acb6fac` |
| `character-04.avif` | 720×865 | `48ec430ce801d1361a7a70a2703d66df69fa6318bd6477f07937391172423487` |

Presentation contract:

- Preserve the complete composition; do not use destructive `object-fit: cover` on design sheets.
- Do not upscale documentation thumbnails.
- Use `next/image` quality 90 for these prominent visual references.
- Character sheets are presented in a two-column desktop / one-column mobile layout so poses, expressions and accessories remain legible.
- Gameplay is landscape and may occupy the full content width.
