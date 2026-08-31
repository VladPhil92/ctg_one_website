import 'server-only';

import { createHash, timingSafeEqual } from 'node:crypto';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';

// Must stay aligned with Nvet-Care-App's canonical-superadmin.ts. The raw
// Supabase subject UUID is intentionally not stored in source control.
const CANONICAL_SUPERADMIN_SUBJECT_SHA256 =
  '4446b482e61fff7f0fcfc15f44983c2362e7f64aa32abd6c47b82e57f2d2de08';

function matchesCanonicalSubject(subject: string): boolean {
  const actual = createHash('sha256').update(subject, 'utf8').digest();
  const expected = Buffer.from(CANONICAL_SUPERADMIN_SUBJECT_SHA256, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/**
 * Returns true only for the one CTG One account pinned as Nvet root.
 * Supabase `auth.getUser()` validates the current cookie-backed session with
 * the auth server; no browser-supplied user id or role is trusted here.
 */
export async function isCanonicalNvetSuperadminSession(): Promise<boolean> {
  if (!isSupabaseConfigured) return false;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user?.id) return false;
    return matchesCanonicalSubject(data.user.id);
  } catch {
    return false;
  }
}
