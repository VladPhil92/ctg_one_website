export type KnowledgeChunk = {
  index: number;
  content: string;
  tokenEstimate: number;
};

const DEFAULT_MAX_CHARS = 1800;
const DEFAULT_OVERLAP_CHARS = 240;

function normalizeWhitespace(value: string) {
  return value
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function estimateTokens(value: string) {
  return Math.ceil(value.length / 4);
}

export function chunkKnowledgeText(
  raw: string,
  maxChars = DEFAULT_MAX_CHARS,
  overlapChars = DEFAULT_OVERLAP_CHARS
): KnowledgeChunk[] {
  const text = normalizeWhitespace(raw);
  if (!text) return [];
  if (maxChars < 400) throw new Error('maxChars must be at least 400');
  if (overlapChars < 0 || overlapChars >= maxChars) {
    throw new Error('overlapChars must be >= 0 and < maxChars');
  }

  const chunks: KnowledgeChunk[] = [];
  let start = 0;

  while (start < text.length) {
    let end = Math.min(start + maxChars, text.length);

    if (end < text.length) {
      const paragraphBreak = text.lastIndexOf('\n\n', end);
      const sentenceBreak = Math.max(
        text.lastIndexOf('. ', end),
        text.lastIndexOf('? ', end),
        text.lastIndexOf('! ', end)
      );
      const wordBreak = text.lastIndexOf(' ', end);
      const preferredBreak = Math.max(paragraphBreak, sentenceBreak, wordBreak);

      if (preferredBreak > start + Math.floor(maxChars * 0.55)) {
        end = preferredBreak + (preferredBreak === paragraphBreak ? 2 : 1);
      }
    }

    const content = text.slice(start, end).trim();
    if (content) {
      chunks.push({ index: chunks.length, content, tokenEstimate: estimateTokens(content) });
    }

    if (end >= text.length) break;
    start = Math.max(end - overlapChars, start + 1);
  }

  return chunks;
}
