# World Makers · Original master manifest

This manifest records the exact user-supplied visual masters accepted on 2026-09-11 for the public World Makers experience.

## Non-negotiable delivery contract

- The source bytes are authoritative.
- Do **not** recompress, resize, convert to WebP/AVIF, sharpen, recolor or re-export these masters for the production page.
- Production rendering must use a native `<img>` path or equivalent pass-through delivery. It must not traverse the Next.js image optimizer.
- CSS may scale the rendered box responsively, but it must preserve the source aspect ratio and must not crop character sheets.
- A production asset is considered certified only when its byte size and SHA-256 match this manifest.
- The upload filenames end in `.png`, but the supplied byte streams are JPEG/JFIF. Production storage should use `image/jpeg` and may use a `.jpg` object name without re-encoding the bytes.

| Role | Supplied file | Dimensions | Bytes | SHA-256 |
| --- | --- | ---: | ---: | --- |
| Character · Nature Guardian | `1000791175.png` | 1152×1536 | 196478 | `00d169452ea01f5fb0cd1377e9b5c43900b9259639d9b049e838331652c9f047` |
| Character · Luna Explorer | `1000791176.png` | 1152×1536 | 189710 | `ab344e25e23fc5867e1ab5a0b80b1d2004fb8449b16f46682dac90a3382ff5a9` |
| Character · Scientist Inventor | `1000791147.png` | 1024×1536 | 200023 | `78906a36f49023a5b5ae8728665123f467d9e78b801700c4eb7a76631dba8e7f` |
| Character · Curious Explorer | `1000791142.png` | 1152×1536 | 179503 | `325b193410e77b919d757d304de4329e0c214a2e57420fa875d849b7234294ae` |
| Gameplay · Overview | `1000790978.png` | 1536×1024 | 560369 | `ab6fc9a69a23877ea522c11214f6a3239fad6d09208826db840f2b02ce093f41` |
| Gameplay · Science | `1000790945.png` | 1536×864 | 504939 | `40d9682d2356e2448e8c53bf78b8c47919c5860924721297a74286f0dcb00eeb` |
| Gameplay · Build | `1000790916.png` | 1536×864 | 485601 | `2f20f377da6e644509b13ca81046706392a0af72ffd548ccd640a77efa27cce1` |
| Hero | `1000790884.png` | 1536×864 | 474516 | `a12f866edf5c066317dd76156ed66bffc03a7025cf895c750f1b859935403fe3` |
| Logo | `1000790709.png` | 1536×768 | 177729 | `af31b91516cba7f2f4990062f98a49db887d29b1a664c53263ddab2d69683d58` |
| Universe · Editorial vertical | `1000790054.png` | 1024×1536 | 653003 | `a8b3ae0aad25cdd301677f8e4b521baaf1f5522b67223775c7d8da4ae5027a68` |

## Production URL contract

The public site accepts the following Render environment variables as immutable master URLs:

- `WORLDMK_ASSET_LOGO_URL`
- `WORLDMK_ASSET_HERO_URL`
- `WORLDMK_ASSET_GAMEPLAY_OVERVIEW_URL`
- `WORLDMK_ASSET_GAMEPLAY_SCIENCE_URL`
- `WORLDMK_ASSET_GAMEPLAY_BUILD_URL`
- `WORLDMK_ASSET_UNIVERSE_URL`
- `WORLDMK_ASSET_CHARACTER_01_URL` — Curious Explorer
- `WORLDMK_ASSET_CHARACTER_02_URL` — Scientist Inventor
- `WORLDMK_ASSET_CHARACTER_03_URL` — Nature Guardian
- `WORLDMK_ASSET_CHARACTER_04_URL` — Luna Explorer

Until a URL is configured, legacy repository derivatives are retained only as a temporary fallback for continuity. A fallback must never be labelled as an original master in the UI.
