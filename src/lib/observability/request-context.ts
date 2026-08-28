const REQUEST_ID_HEADERS = ['x-request-id', 'x-correlation-id'] as const;
const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{8,128}$/;
const TRACEPARENT_PATTERN = /^00-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/i;

function normalizeRequestId(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return REQUEST_ID_PATTERN.test(trimmed) ? trimmed : null;
}

function randomTraceId() {
  return crypto.randomUUID().replaceAll('-', '').toLowerCase();
}

function randomSpanId() {
  return crypto.randomUUID().replaceAll('-', '').slice(0, 16).toLowerCase();
}

function isNonZeroHex(value: string) {
  return !/^0+$/.test(value);
}

export function resolveRequestId(headers: Headers): string {
  for (const header of REQUEST_ID_HEADERS) {
    const candidate = normalizeRequestId(headers.get(header));
    if (candidate) return candidate;
  }
  return crypto.randomUUID();
}

export type TraceContext = {
  trace_id: string;
  span_id: string;
  parent_span_id?: string;
  trace_flags: string;
};

export function resolveTraceContext(headers: Headers): TraceContext {
  const incoming = headers.get('traceparent')?.trim() ?? '';
  const match = TRACEPARENT_PATTERN.exec(incoming);

  if (match) {
    const traceId = match[1].toLowerCase();
    const parentSpanId = match[2].toLowerCase();
    const traceFlags = match[3].toLowerCase();

    if (isNonZeroHex(traceId) && isNonZeroHex(parentSpanId)) {
      return {
        trace_id: traceId,
        span_id: randomSpanId(),
        parent_span_id: parentSpanId,
        trace_flags: traceFlags,
      };
    }
  }

  return {
    trace_id: randomTraceId(),
    span_id: randomSpanId(),
    trace_flags: '01',
  };
}

export function formatTraceparent(context: TraceContext) {
  return `00-${context.trace_id}-${context.span_id}-${context.trace_flags}`;
}

export type RequestObservabilityContext = TraceContext & {
  request_id: string;
  method?: string;
  pathname?: string;
};

export function getRequestObservabilityContext(request: Request): RequestObservabilityContext {
  const url = new URL(request.url);
  return {
    request_id: resolveRequestId(request.headers),
    ...resolveTraceContext(request.headers),
    method: request.method,
    pathname: url.pathname,
  };
}