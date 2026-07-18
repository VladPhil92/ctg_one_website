// Supabase client for use in Client Components ('use client').
import { createBrowserClient } from '@supabase/ssr';

// Lets pages that don't strictly need Supabase (marketing pages, or this
// project before a real project/env vars exist) render normally instead
// of throwing — check this before calling createClient().
export const isSupabaseConfigured =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
