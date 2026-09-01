import 'server-only';

import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/observability/logger';
import {
  type FunnelEventName,
  type FunnelServiceKey,
  isAnalyticsAnonymousId,
  isAnalyticsSourcePath,
} from './funnel';

type RecordFunnelEventInput = {
  eventName: FunnelEventName;
  anonymousId: string;
  userId?: string | null;
  sourcePath: string;
  serviceKey?: FunnelServiceKey | null;
};

export async function recordFunnelEvent(input: RecordFunnelEventInput): Promise<boolean> {
  if (!isAnalyticsAnonymousId(input.anonymousId) || !isAnalyticsSourcePath(input.sourcePath)) {
    return false;
  }

  const authenticatedMilestone = [
    'email_verified',
    'first_login',
    'dashboard_viewed',
    'first_service_used',
  ].includes(input.eventName);

  if (authenticatedMilestone && !input.userId) return false;
  if (input.eventName === 'first_service_used' && !input.serviceKey) return false;
  if (input.eventName !== 'first_service_used' && input.serviceKey) return false;

  try {
    const admin = createAdminClient();
    const { error } = await admin.from('product_analytics_events').insert({
      event_name: input.eventName,
      anonymous_id: input.anonymousId,
      user_id: input.userId ?? null,
      source_path: input.sourcePath,
      service_key: input.serviceKey ?? null,
    });

    if (!error) return true;

    // User milestones are intentionally idempotent through a partial unique index.
    if (error.code === '23505') return true;

    logger.warn('product_analytics_write_failed', {
      eventName: input.eventName,
      errorCode: error.code,
    });
    return false;
  } catch (error) {
    logger.warn('product_analytics_write_failed', {
      eventName: input.eventName,
      error: error instanceof Error ? { name: error.name, message: error.message } : String(error),
    });
    return false;
  }
}
