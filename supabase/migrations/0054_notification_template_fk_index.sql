-- P2.4 post-deploy performance hardening.
-- Covers the composite FK used by system_notification_deliveries so template
-- version lookups/deletes do not require a full delivery-table scan.

create index system_notification_deliveries_template_idx
  on public.system_notification_deliveries(template_key, template_version);
