// Shared by every post-login "next" redirect on the site (main sign-in,
// the Supabase auth callback, and the Nvet Care sign-in form). Runtime
// agnostic — no `window`, no Node-only APIs — so it works in both Client
// Components and Route Handlers.
//
// A naive `value.startsWith('/') && !value.startsWith('//')` check is not
// enough: for a "special" scheme like http/https, the WHATWG URL parser
// treats `\` the same as `/`, so `/\evil.example` starts with a single
// `/` (passing that check) but still resolves to `https://evil.example/`
// when the browser navigates to it — a real open-redirect bypass, not a
// theoretical one. Resolving through `URL` against a fixed placeholder
// base and checking the resolved origin didn't change is what actually
// matches how the browser will interpret the value, instead of guessing
// at it with string prefixes.
export function safeRedirectPath(value: string | null | undefined, fallback: string): string {
  if (!value) return fallback;
  const base = 'http://safe-redirect-base.invalid';
  try {
    const url = new URL(value, base);
    if (url.origin !== base) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
