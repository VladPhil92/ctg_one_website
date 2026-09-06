import ideas00 from '@/data/jpvalderrama-visuals/ideas-00';
import ideas01 from '@/data/jpvalderrama-visuals/ideas-01';
import ideas02 from '@/data/jpvalderrama-visuals/ideas-02';
import ideas03 from '@/data/jpvalderrama-visuals/ideas-03';
import ideas04 from '@/data/jpvalderrama-visuals/ideas-04';

/**
 * Canonical Valderrama Ideas artwork.
 *
 * Keep the repository-owned Base64 source for integrity validation, but serve
 * the visible artwork through the validated semantic asset endpoint. This
 * keeps Ideas cacheable, observable and consistent with the rest of the
 * JP Valderrama visual system instead of embedding a large data URI in HTML.
 */
export const IDEAS_VISUAL_BASE64 = [ideas00, ideas01, ideas02, ideas03, ideas04].join('');
export const IDEAS_VISUAL_SRC = '/api/jpvalderrama/assets/ideas-button';
