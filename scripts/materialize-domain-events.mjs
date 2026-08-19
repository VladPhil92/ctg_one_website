import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Domain event materializer requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const client = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const limit = Number.parseInt(process.env.DOMAIN_EVENT_BATCH_SIZE ?? '25', 10);
const leaseSeconds = Number.parseInt(process.env.DOMAIN_EVENT_LEASE_SECONDS ?? '120', 10);

if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
  throw new Error('DOMAIN_EVENT_BATCH_SIZE must be an integer between 1 and 100.');
}
if (!Number.isInteger(leaseSeconds) || leaseSeconds < 30 || leaseSeconds > 900) {
  throw new Error('DOMAIN_EVENT_LEASE_SECONDS must be an integer between 30 and 900.');
}

const { data: events, error: claimError } = await client.rpc('claim_domain_events', {
  p_limit: limit,
  p_lease_seconds: leaseSeconds,
});

if (claimError) {
  throw claimError;
}

let materialized = 0;
let failed = 0;

for (const event of events ?? []) {
  const { error: materializeError } = await client.rpc('materialize_domain_event_work', {
    p_event_id: event.id,
    p_lease_token: event.lease_token,
  });

  if (!materializeError) {
    materialized += 1;
    continue;
  }

  failed += 1;
  const boundedMessage = String(materializeError.message ?? 'materialization failed').slice(0, 1000);
  const { error: failError } = await client.rpc('fail_domain_event_delivery', {
    p_event_id: event.id,
    p_lease_token: event.lease_token,
    p_error: boundedMessage,
    p_retry_after_seconds: 300,
  });

  if (failError) {
    console.error(JSON.stringify({
      event: 'domain_event_materialization_fail_record_error',
      event_id: event.id,
      error: String(failError.message ?? failError).slice(0, 1000),
    }));
  }
}

console.log(JSON.stringify({
  event: 'domain_event_materialization_complete',
  claimed: events?.length ?? 0,
  materialized,
  failed,
}));

if (failed > 0) {
  process.exitCode = 2;
}
