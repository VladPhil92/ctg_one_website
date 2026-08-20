// @ts-check

const MIN_SAFE_INTEGER_BIGINT = BigInt(Number.MIN_SAFE_INTEGER);
const MAX_SAFE_INTEGER_BIGINT = BigInt(Number.MAX_SAFE_INTEGER);

/**
 * Extract unique numeric citation identifiers from bracket citations such as
 * [1], [2], [1, 3], [0], [-1] or arbitrarily large integer identifiers.
 * Non-numeric markdown brackets are ignored.
 *
 * Safe integer identifiers are normalized to numbers. Integers outside the
 * JavaScript safe range are retained verbatim as strings so they can never be
 * lost through floating-point coercion before the fail-closed validation step.
 *
 * @param {string} answer
 * @returns {Array<number | string>}
 */
export function extractCitationIdentifiers(answer) {
  const citations = [];
  const seen = new Set();
  const pattern = /\[\s*([+-]?\d+(?:\s*,\s*[+-]?\d+)*)\s*\]/g;

  for (const match of answer.matchAll(pattern)) {
    for (const raw of match[1].split(',')) {
      const token = raw.trim();
      const integer = BigInt(token);
      const citation =
        integer >= MIN_SAFE_INTEGER_BIGINT && integer <= MAX_SAFE_INTEGER_BIGINT
          ? Number(integer)
          : token;
      const key = typeof citation === 'number' ? `number:${citation}` : `string:${citation}`;

      if (seen.has(key)) continue;
      seen.add(key);
      citations.push(citation);
    }
  }

  return citations;
}

/**
 * A generated answer is considered grounded only when it contains at least one
 * numeric citation identifier and every identifier points to a source that was
 * actually supplied to the model for this request.
 *
 * Allowed source identifiers are always positive safe integers. Non-positive
 * identifiers and values outside the JavaScript safe-integer domain are
 * therefore retained by the parser and rejected rather than silently discarded.
 *
 * This deliberately does not attempt to judge semantic correctness. It is a
 * deterministic post-generation integrity gate that prevents unsupported or
 * fabricated source references from being surfaced as grounded output.
 *
 * @param {string} answer
 * @param {number[]} allowedCitations
 * @returns {{ grounded: boolean, citations: Array<number | string>, invalidCitations: Array<number | string>, hasCitations: boolean }}
 */
export function validateGroundedAnswer(answer, allowedCitations) {
  const allowed = new Set(
    allowedCitations.filter((citation) => Number.isSafeInteger(citation) && citation > 0),
  );
  const citations = extractCitationIdentifiers(answer);
  const invalidCitations = citations.filter(
    (citation) =>
      typeof citation !== 'number' ||
      !Number.isSafeInteger(citation) ||
      citation <= 0 ||
      !allowed.has(citation),
  );
  const hasCitations = citations.length > 0;

  return {
    grounded: hasCitations && invalidCitations.length === 0,
    citations,
    invalidCitations,
    hasCitations,
  };
}
