import { NextResponse } from 'next/server';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!isSupabaseConfigured) {
    return NextResponse.json(
      { error: 'player_state_unavailable' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json(
      { error: 'authentication_required' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const displayName =
    typeof user.user_metadata?.full_name === 'string' && user.user_metadata.full_name.trim()
      ? user.user_metadata.full_name.trim()
      : 'Maker';

  return NextResponse.json(
    {
      schemaVersion: 1,
      player: {
        id: user.id,
        displayName,
        emailVerified: Boolean(user.email_confirmed_at),
      },
      synchronization: {
        identity: 'connected',
        gameRuntime: 'not_connected',
        cloudSave: 'not_connected',
      },
      saves: [],
      missions: [],
      discoveries: [],
      achievements: [],
      capabilities: {
        cloudSave: false,
        missionSync: false,
        discoverySync: false,
        achievementSync: false,
      },
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
