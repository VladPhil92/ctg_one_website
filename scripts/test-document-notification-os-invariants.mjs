import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile('supabase/migrations/0052_document_notification_os.sql', 'utf8');
const worker = await readFile('scripts/materialize-domain-events.mjs', 'utf8');

for (const table of [
  'system_notification_templates',
  'system_notification_deliveries',
  'system_notification_delivery_attempts',
  'system_document_jobs',
]) {
  assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`, 'i'));
  assert.match(migration, new RegExp(`revoke all on table public\\.${table} from public, anon, authenticated, service_role`, 'i'));
}

for (const fn of [
  'materialize_domain_event_work',
  'claim_notification_deliveries',
  'complete_notification_delivery',
  'fail_notification_delivery',
  'claim_document_jobs',
  'complete_document_job',
  'fail_document_job',
]) {
  assert.match(migration, new RegExp(`grant execute on function public\\.${fn}\\(`, 'i'));
  assert.match(migration, new RegExp(`to service_role`, 'i'));
}

assert.match(migration, /unique \(domain_event_id, recipient_user_id, channel, template_key, template_version\)/i);
assert.match(migration, /unique \(domain_event_id, document_type, owner_type, owner_id\)/i);
assert.match(migration, /notification template versions are immutable/i);
assert.match(migration, /perform public\.complete_domain_event_delivery\(v_event\.id, p_lease_token\)/i);

assert.match(migration, /'IN_APP'/);
assert.doesNotMatch(migration, /'EMAIL'\s*,\s*'Pago conciliado'/i);
assert.doesNotMatch(migration, /'WHATSAPP'\s*,\s*'Pago conciliado'/i);

assert.match(worker, /SUPABASE_SERVICE_ROLE_KEY/);
assert.match(worker, /claim_domain_events/);
assert.match(worker, /materialize_domain_event_work/);
assert.match(worker, /fail_domain_event_delivery/);
assert.doesNotMatch(worker, /sendgrid|twilio|resend|whatsapp|nodemailer/i);

console.log('Document/Notification OS invariants: PASS');
