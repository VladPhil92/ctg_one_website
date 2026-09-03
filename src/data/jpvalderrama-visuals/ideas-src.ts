import ideas00 from '@/data/jpvalderrama-visuals/ideas-00';
import ideas01 from '@/data/jpvalderrama-visuals/ideas-01';
import ideas02 from '@/data/jpvalderrama-visuals/ideas-02';
import ideas03 from '@/data/jpvalderrama-visuals/ideas-03';
import ideas04 from '@/data/jpvalderrama-visuals/ideas-04';

/**
 * Canonical Valderrama Ideas artwork.
 *
 * Keep the visible Ideas identity independent from the dynamic asset endpoint:
 * the browser receives the complete, repository-owned WebP in the rendered
 * markup instead of depending on a second HTTP request to /api/.../ideas-button.
 */
export const IDEAS_VISUAL_BASE64 = [ideas00, ideas01, ideas02, ideas03, ideas04].join('');
export const IDEAS_VISUAL_SRC = `data:image/webp;base64,${IDEAS_VISUAL_BASE64}`;
