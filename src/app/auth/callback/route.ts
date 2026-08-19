import { NextRequest, NextResponse } from 'next/server';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';

function safeRelativePath(value: string | null, fallback: string) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return fallback;
  return value;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = safeRelativePath(requestUrl.searchParams.get('next'), '/dashboard');

  if (!isSupabaseConfigured || !code) {
    return NextResponse.redirect(new URL('/iniciar-sesion?error=auth_callback_invalid', requestUrl.origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL('/iniciar-sesion?error=auth_callback_failed', requestUrl.origin));
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
