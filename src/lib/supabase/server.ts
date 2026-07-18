import 'server-only';

// Supabase client for use in Server Components, Route Handlers, and
// Server Actions. Reads/writes the session via Next.js cookies — never
// import this from a Client Component.
import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

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

// Admin-only client using the service role key, which bypasses Row Level
// Security entirely. Only ever use this after independently verifying the
// caller is an authenticated admin (see is_admin()/SECURITY DEFINER
// functions in the DB — that's the real authorization boundary, this
// client is just for operations RLS can't express, like generating signed
// URLs for another user's private documents). Never import this into a
// Client Component or expose SUPABASE_SERVICE_ROLE_KEY to the browser.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
