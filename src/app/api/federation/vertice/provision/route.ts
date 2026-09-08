import { NextResponse } from 'next/server';

import { federationSecretState } from '@/lib/federation/vertice';
import { createAdminClient, isSupabaseConfigured } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const APP_ID = 'vertice';
const MAX_BODY_BYTES = 8 * 1024;
const VERIFIED_CONTACT_LEVEL = 2;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ProvisionBody = {
  provider_subject?: unknown;
  ctg_subject?: unknown;
  email?: unknown;
  email_verified?: unknown;
  assurance_level?: unknown;
};

function noStoreJson(body: unknown, status: number) {
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

function normalizeBody(value: unknown): {
  providerSubject: string;
  ctgSubject: string | null;
  email: string;
  assuranceLevel: number;
} | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const body = value as ProvisionBody;
  const providerSubject = typeof body.provider_subject === 'string' ? body.provider_subject.trim() : '';
  const ctgSubject = typeof body.ctg_subject === 'string' && body.ctg_subject.trim()
    ? body.ctg_subject.trim()
    : null;
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const assuranceLevel = typeof body.assurance_level === 'number' ? body.assurance_level : -1;

  if (
    !UUID_PATTERN.test(providerSubject)
    || (ctgSubject !== null && !UUID_PATTERN.test(ctgSubject))
    || !EMAIL_PATTERN.test(email)
    || email.length > 320
    || body.email_verified !== true
    || !Number.isInteger(assuranceLevel)
    || assuranceLevel < 0
    || assuranceLevel > 4
  ) return null;

  return { providerSubject, ctgSubject, email, assuranceLevel };
}

async function createDashboardMagicLink(
  admin: ReturnType<typeof createAdminClient>,
  email: string,
): Promise<string | null> {
  const publicOrigin = process.env.NEXT_PUBLIC_SITE_URL || 'https://ctgone.com';
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo: `${publicOrigin}/dashboard` },
  });
  if (error) return null;
  return data.properties?.action_link ?? null;
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return noStoreJson({ error: 'FEDERATION_UNAVAILABLE' }, 503);
  }

  const secretState = federationSecretState(request);
  if (secretState === 'unconfigured') {
    return noStoreJson({ error: 'FEDERATION_SECRET_NOT_CONFIGURED' }, 503);
  }
  if (secretState !== 'authorized') {
    return noStoreJson({ error: 'UNAUTHORIZED' }, 401);
  }

  let rawText = '';
  try {
    rawText = await request.text();
  } catch {
    return noStoreJson({ error: 'INVALID_REQUEST_BODY' }, 400);
  }
  if (new TextEncoder().encode(rawText).byteLength > MAX_BODY_BYTES) {
    return noStoreJson({ error: 'PAYLOAD_TOO_LARGE' }, 413);
  }

  let raw: unknown;
  try {
    raw = JSON.parse(rawText);
  } catch {
    return noStoreJson({ error: 'INVALID_JSON' }, 400);
  }

  const body = normalizeBody(raw);
  if (!body) return noStoreJson({ error: 'INVALID_PROVISION_REQUEST' }, 400);
  if (!body.ctgSubject && body.assuranceLevel < VERIFIED_CONTACT_LEVEL) {
    return noStoreJson({ error: 'VERIFIED_IDENTITY_REQUIRED' }, 403);
  }

  const admin = createAdminClient();
  const { data: existingLink, error: existingLinkError } = await admin
    .from('ecosystem_identity_links')
    .select('id, ctg_user_id, status, assurance_level')
    .eq('app_id', APP_ID)
    .eq('external_user_id', body.providerSubject)
    .maybeSingle();

  if (existingLinkError) return noStoreJson({ error: 'ECOSYSTEM_LINK_LOOKUP_FAILED' }, 503);
  if (existingLink?.status === 'suspended' || existingLink?.status === 'revoked') {
    return noStoreJson({ error: 'ECOSYSTEM_LINK_INACTIVE' }, 403);
  }

  let ctgUserId = existingLink?.ctg_user_id as string | undefined;
  let createdUserId: string | null = null;
  let linkState: 'existing' | 'linked' | 'created' = existingLink ? 'existing' : 'linked';

  if (!ctgUserId && body.ctgSubject) {
    const { data: ctgUserData, error: ctgUserError } = await admin.auth.admin.getUserById(body.ctgSubject);
    const ctgEmail = ctgUserData.user?.email?.trim().toLowerCase() ?? '';
    const confirmed = Boolean(ctgUserData.user?.email_confirmed_at);
    if (ctgUserError || !ctgUserData.user || !confirmed || ctgEmail !== body.email) {
      return noStoreJson({ error: 'INVALID_CTG_SUBJECT' }, 409);
    }
    ctgUserId = ctgUserData.user.id;
  }

  if (!ctgUserId) {
    const { data: profileCollision, error: collisionError } = await admin
      .from('profiles')
      .select('id')
      .eq('email', body.email)
      .maybeSingle();

    if (collisionError) return noStoreJson({ error: 'CTG_ACCOUNT_LOOKUP_FAILED' }, 503);
    if (profileCollision) {
      return noStoreJson({
        error: 'FEDERATION_LINK_REQUIRED',
        message: 'Ya existe una cuenta CTG One con este correo. Inicia sesión en CTG One para vincularla explícitamente.',
      }, 409);
    }

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: body.email,
      email_confirm: true,
      user_metadata: {
        provisioned_from: APP_ID,
        federation_assurance_level: body.assuranceLevel,
      },
    });

    if (createError || !created.user) {
      return noStoreJson({ error: 'FEDERATION_LINK_REQUIRED' }, 409);
    }

    ctgUserId = created.user.id;
    createdUserId = created.user.id;
    linkState = 'created';
  }

  if (!existingLink) {
    const { error: linkError } = await admin.from('ecosystem_identity_links').insert({
      ctg_user_id: ctgUserId,
      app_id: APP_ID,
      external_user_id: body.providerSubject,
      status: 'linked',
      assurance_level: body.assuranceLevel,
      provisioning_source: body.ctgSubject ? 'ctg_one' : 'vertice',
      last_login_at: new Date().toISOString(),
      metadata: { email_at_link: body.email },
    });

    if (linkError) {
      if (createdUserId) await admin.auth.admin.deleteUser(createdUserId).catch(() => undefined);
      return noStoreJson({ error: 'ECOSYSTEM_LINK_CREATE_FAILED' }, 503);
    }
  } else {
    const nextAssurance = Math.max(Number(existingLink.assurance_level ?? 0), body.assuranceLevel);
    const { error: updateError } = await admin
      .from('ecosystem_identity_links')
      .update({ last_login_at: new Date().toISOString(), assurance_level: nextAssurance })
      .eq('id', existingLink.id);
    if (updateError) return noStoreJson({ error: 'ECOSYSTEM_LINK_UPDATE_FAILED' }, 503);
  }

  // Issue the CTG One session only for the CTG user bound to the explicit link.
  // Never trust a product-provided email as the final session target.
  const { data: authoritativeUser, error: authoritativeUserError } = await admin.auth.admin.getUserById(ctgUserId);
  const canonicalEmail = authoritativeUser.user?.email?.trim().toLowerCase() ?? '';
  if (authoritativeUserError || !authoritativeUser.user || !authoritativeUser.user.email_confirmed_at || !canonicalEmail) {
    return noStoreJson({ error: 'CTG_IDENTITY_NOT_SESSION_ELIGIBLE' }, 403);
  }

  const redirectUrl = await createDashboardMagicLink(admin, canonicalEmail);
  if (!redirectUrl) return noStoreJson({ error: 'CTG_SESSION_ISSUE_FAILED' }, 503);

  return noStoreJson({ status: linkState, app: APP_ID, redirect_url: redirectUrl }, linkState === 'created' ? 201 : 200);
}
