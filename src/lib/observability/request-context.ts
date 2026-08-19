const REQUEST_ID_HEADERS = ['x-request-id', 'x-correlation-id'] as const;
const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{8,128}$/;

function normalizeRequestId(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return REQUEST_ID_PATTERN.test(trimmed) ? trimmed : null;
}

export function resolveRequestId(headers: Headers): string {
  for (const header of REQUEST_ID_HEADERS) {
    const candidate = normalizeRequestId(headers.get(header));
    if (candidate) return candidate;
  }
  return crypto.randomUUID();
}

export type RequestObservabilityContext = {
  request_id: string;
  method?: string;
  pathname?: string;
};

export function getRequestObservabilityContext(request: Request): RequestObservabilityContext {
  const url = new URL(request.url);
  return {
    request_id: resolveRequestId(request.headers),
    method: request.method,
    pathname: url.pathname,
  };
}
