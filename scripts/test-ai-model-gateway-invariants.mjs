import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const gateway = readFileSync('src/lib/ai/model-gateway.ts', 'utf8');
const openai = readFileSync('src/lib/ai/openai.ts', 'utf8');
const route = readFileSync('src/app/api/knowledge/query/route.ts', 'utf8');
const envExample = readFileSync('.env.local.example', 'utf8');

assert.match(gateway, /CTG_AI_PROVIDER/, 'AI provider selection must be centralized in the model gateway.');
assert.match(gateway, /CTG_AI_CONFIG_VERSION/, 'AI runtime must expose an explicit configuration version.');
assert.match(
  gateway,
  /configuredProvider !== 'openai'/,
  'Unsupported AI providers must fail closed instead of silently falling back.',
);
assert.match(
  gateway,
  /isKnowledgeAIConfigured = configuredProvider === 'openai' && isOpenAIConfigured/,
  'Knowledge AI readiness must require both an allowlisted provider and configured provider credentials.',
);

assert.match(
  openai,
  /AbortSignal\.timeout\(REQUEST_TIMEOUT_MS\)/,
  'Provider calls must have an enforced request timeout.',
);
assert.match(openai, /OPENAI_REQUEST_TIMEOUT_MS/, 'Provider timeout must be operator-configurable.');
assert.match(openai, /OPENAI_MAX_ATTEMPTS/, 'Provider retry attempts must be operator-configurable.');
assert.match(openai, /status === 429/, 'Rate-limit responses must be explicitly retryable.');
assert.match(openai, /status >= 500/, 'Transient provider server failures must be retryable.');
assert.match(openai, /attempt === MAX_ATTEMPTS/, 'Retries must remain bounded.');
assert.match(openai, /providerRequestId/, 'Provider request identifiers must be captured for diagnostics.');
assert.match(openai, /inputTokens/, 'Input-token usage must be captured.');
assert.match(openai, /outputTokens/, 'Output-token usage must be captured.');
assert.match(openai, /totalTokens/, 'Total-token usage must be captured.');
assert.match(openai, /store: false/, 'Knowledge response generation must remain provider-storage disabled.');

assert.match(
  route,
  /from '@\/lib\/ai\/model-gateway'/,
  'Knowledge query execution must depend on the shared model gateway rather than a provider module.',
);
assert.match(
  route,
  /getRequestObservabilityContext\(request\)/,
  'Knowledge queries must participate in request correlation.',
);
assert.match(route, /embedding: embedding\.telemetry/, 'Embedding telemetry must be logged without source content.');
assert.match(route, /generation: generation\.telemetry/, 'Generation telemetry must be logged without answer text.');
assert.match(route, /'X-Request-ID': requestId/, 'Knowledge responses must return the correlated request ID.');

assert.match(envExample, /CTG_AI_PROVIDER=openai/, 'The model gateway provider must be documented for operators.');
assert.match(envExample, /OPENAI_REQUEST_TIMEOUT_MS=15000/, 'The bounded timeout default must be documented.');
assert.match(envExample, /OPENAI_MAX_ATTEMPTS=2/, 'The bounded retry default must be documented.');
assert.doesNotMatch(
  envExample,
  /NEXT_PUBLIC_OPENAI/i,
  'AI provider credentials/configuration must never be documented as browser-public variables.',
);

console.log('CTG One AI model gateway invariants passed.');
