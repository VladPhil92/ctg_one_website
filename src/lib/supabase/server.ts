import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient, type User } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export const isSupabaseConfigured =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll called from a Server Component — safe to ignore when
            // middleware is also refreshing the session on every request.
          }
        },
      },
    }
  );
}

const MAX_BEARER_BYTES = 8192;

export type AuthenticatedRequestContext = {
  supabase: ReturnType<typeof createSupabaseClient> | Awaited<ReturnType<typeof createClient>>;
  user: User;
  transport: 'bearer' | 'cookie';
};

function parseBearerToken(request: Request): { present: boolean; token: string | null } {
  const header = request.headers.get('authorization');
  if (!header) return { present: false, token: null };
  if (Buffer.byteLength(header, 'utf8') > MAX_BEARER_BYTES) return { present: true, token: null };

  const match = /^Bearer\s+([^\s]+)$/i.exec(header.trim());
  if (!match?.[1]) return { present: true, token: null };
  return { present: true, token: match[1] };
}

/**
 * Resolve the canonical CTG One user for browser-cookie or native/PWA bearer
 * transports. If an Authorization header is present but invalid, this fails
 * closed and never falls back to a cookie session (avoids confused-deputy
 * identity mixing).
 *
 * The bearer client uses the public anon key plus the validated user JWT, so
 * all subsequent table queries execute under the user's normal RLS context.
 * Service-role is deliberately excluded from this read/authentication path.
 */
export async function createAuthenticatedRequestContext(
  request: Request,
): Promise<AuthenticatedRequestContext | null> {
  if (!isSupabaseConfigured) return null;

  const bearer = parseBearerToken(request);
  if (bearer.present) {
    if (!bearer.token) return null;

    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
        global: {
          headers: { Authorization: `Bearer ${bearer.token}` },
        },
      },
    );

    const { data, error } = await supabase.auth.getUser(bearer.token);
    if (error || !data.user) return null;

    return { supabase, user: data.user, transport: 'bearer' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return { supabase, user: data.user, transport: 'cookie' };
}

// Admin-only client using the service role key, which bypasses Row Level
// Security entirely. Only ever use this after independently verifying the
// caller is an authenticated admin or inside a server-only trust boundary.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}