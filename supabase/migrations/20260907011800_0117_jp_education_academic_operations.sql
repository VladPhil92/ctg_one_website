-- JP Valderrama Education Academic Operations V1
--
-- Adds a durable commercial/academic operations layer for custom education
-- services. A quote is never a payment and a scheduled session never grants an
-- entitlement. Fixed-price products continue to use education_orders and the
-- existing settlement boundary.

alter table public.education_advisory_requests
  add column request_kind text not null default 'institution';

update public.education_advisory_requests
set request_kind = 'family'
where institution_name = 'Familia / usuario individual';

alter table public.education_advisory_requests
  add constraint education_advisory_request_kind_check
  check (request_kind in ('institution', 'family', 'individual', 'project'));

create unique index education_advisory_requests_id_user_key
  on public.education_advisory_requests(id, user_id);

create table public.education_service_quotes (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  version integer not null default 1,
  title text not null,
  scope_summary text not null,
  status text not null default 'draft',
  currency text not null default 'COP',
  total_amount integer not null,
  valid_until timestamptz,
  sent_at timestamptz,
  accepted_at timestamptz,
  declined_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint education_service_quotes_request_user_fk
    foreign key (request_id, user_id)
    references public.education_advisory_requests(id, user_id)
    on delete cascade,
  constraint education_service_quotes_version_check check (version between 1 and 1000),
  constraint education_service_quotes_title_check check (char_length(btrim(title)) between 2 and 180),
  constraint education_service_quotes_scope_check check (char_length(btrim(scope_summary)) between 20 and 6000),
  constraint education_service_quotes_status_check
    check (status in ('draft', 'sent', 'accepted', 'declined', 'expired', 'cancelled')),
  constraint education_service_quotes_currency_check check (currency ~ '^[A-Z]{3}$'),
  constraint education_service_quotes_total_check check (total_amount >= 0),
  constraint education_service_quotes_sent_state_check
    check ((status = 'draft' and sent_at is null) or status <> 'draft'),
  constraint education_service_quotes_accepted_state_check
    check ((status = 'accepted' and accepted_at is not null) or status <> 'accepted'),
  constraint education_service_quotes_declined_state_check
    check ((status = 'declined' and declined_at is not null) or status <> 'declined'),
  constraint education_service_quotes_request_version_key unique (request_id, version),
  constraint education_service_quotes_id_user_key unique (id, user_id)
);

create index education_service_quotes_user_status_idx
  on public.education_service_quotes(user_id, status, updated_at desc);
create index education_service_quotes_request_idx
  on public.education_service_quotes(request_id, version desc);

create table public.education_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  request_id uuid,
  quote_id uuid,
  offering_id uuid references public.education_offerings(id) on delete set null,
  session_type text not null,
  title text not null,
  status text not null default 'scheduled',
  modality text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  timezone text not null default 'America/Bogota',
  meeting_url text,
  location_label text,
  participant_note text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint education_sessions_request_user_fk
    foreign key (request_id, user_id)
    references public.education_advisory_requests(id, user_id)
    on delete cascade,
  constraint education_sessions_quote_user_fk
    foreign key (quote_id, user_id)
    references public.education_service_quotes(id, user_id)
    on delete restrict,
  constraint education_sessions_type_check
    check (session_type in ('diagnostic', 'tutoring', 'class', 'advisory', 'project', 'conference', 'other')),
  constraint education_sessions_title_check check (char_length(btrim(title)) between 2 and 180),
  constraint education_sessions_status_check
    check (status in ('scheduled', 'completed', 'cancelled', 'no_show')),
  constraint education_sessions_modality_check check (modality in ('virtual', 'in_person', 'hybrid')),
  constraint education_sessions_window_check check (ends_at > starts_at),
  constraint education_sessions_timezone_check check (char_length(btrim(timezone)) between 3 and 80),
  constraint education_sessions_meeting_url_check
    check (meeting_url is null or (meeting_url like 'https://%' and char_length(meeting_url) <= 2000)),
  constraint education_sessions_location_check
    check (location_label is null or char_length(btrim(location_label)) between 2 and 500),
  constraint education_sessions_note_check
    check (participant_note is null or char_length(participant_note) <= 2000),
  constraint education_sessions_origin_check
    check (request_id is not null or offering_id is not null)
);

create index education_sessions_user_schedule_idx
  on public.education_sessions(user_id, starts_at desc);
create index education_sessions_request_idx
  on public.education_sessions(request_id, starts_at desc)
  where request_id is not null;
create index education_sessions_quote_idx
  on public.education_sessions(quote_id)
  where quote_id is not null;

alter table public.education_service_quotes enable row level security;
alter table public.education_sessions enable row level security;

revoke all on table public.education_service_quotes from public, anon, authenticated;
revoke all on table public.education_sessions from public, anon, authenticated;
grant select on table public.education_service_quotes to authenticated;
grant select on table public.education_sessions to authenticated;

create policy education_service_quotes_owner_read
  on public.education_service_quotes
  for select
  to authenticated
  using (user_id = (select auth.uid()) and status <> 'draft');

create policy education_sessions_owner_read
  on public.education_sessions
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.accept_education_service_quote(p_quote_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_user_id uuid := auth.uid();
  v_request_id uuid;
  v_status text;
  v_valid_until timestamptz;
  v_now timestamptz := clock_timestamp();
begin
  if v_user_id is null then raise exception 'EDUCATION_QUOTE_UNAUTHENTICATED'; end if;
  if p_quote_id is null then raise exception 'EDUCATION_QUOTE_ID_REQUIRED'; end if;

  select q.request_id, q.status, q.valid_until
    into v_request_id, v_status, v_valid_until
  from public.education_service_quotes q
  where q.id = p_quote_id and q.user_id = v_user_id
  for update;

  if not found then raise exception 'EDUCATION_QUOTE_NOT_FOUND'; end if;
  if v_status = 'accepted' then
    return jsonb_build_object('quoteId', p_quote_id, 'status', 'accepted', 'replayed', true);
  end if;
  if v_status <> 'sent' then raise exception 'EDUCATION_QUOTE_NOT_ACTIONABLE'; end if;
  if v_valid_until is not null and v_valid_until <= v_now then
    update public.education_service_quotes set status = 'expired', updated_at = v_now where id = p_quote_id;
    raise exception 'EDUCATION_QUOTE_EXPIRED';
  end if;

  update public.education_service_quotes
     set status = 'accepted', accepted_at = v_now, declined_at = null, updated_at = v_now
   where id = p_quote_id;
  update public.education_advisory_requests
     set status = 'won', updated_at = v_now
   where id = v_request_id and user_id = v_user_id;

  return jsonb_build_object('quoteId', p_quote_id, 'status', 'accepted', 'replayed', false);
end;
$function$;

create or replace function public.decline_education_service_quote(p_quote_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_user_id uuid := auth.uid();
  v_request_id uuid;
  v_status text;
  v_now timestamptz := clock_timestamp();
begin
  if v_user_id is null then raise exception 'EDUCATION_QUOTE_UNAUTHENTICATED'; end if;
  if p_quote_id is null then raise exception 'EDUCATION_QUOTE_ID_REQUIRED'; end if;

  select q.request_id, q.status
    into v_request_id, v_status
  from public.education_service_quotes q
  where q.id = p_quote_id and q.user_id = v_user_id
  for update;

  if not found then raise exception 'EDUCATION_QUOTE_NOT_FOUND'; end if;
  if v_status = 'declined' then
    return jsonb_build_object('quoteId', p_quote_id, 'status', 'declined', 'replayed', true);
  end if;
  if v_status <> 'sent' then raise exception 'EDUCATION_QUOTE_NOT_ACTIONABLE'; end if;

  update public.education_service_quotes
     set status = 'declined', declined_at = v_now, accepted_at = null, updated_at = v_now
   where id = p_quote_id;
  update public.education_advisory_requests
     set status = 'closed', updated_at = v_now
   where id = v_request_id and user_id = v_user_id;

  return jsonb_build_object('quoteId', p_quote_id, 'status', 'declined', 'replayed', false);
end;
$function$;

revoke all on function public.accept_education_service_quote(uuid) from public, anon;
revoke all on function public.decline_education_service_quote(uuid) from public, anon;
grant execute on function public.accept_education_service_quote(uuid) to authenticated;
grant execute on function public.decline_education_service_quote(uuid) to authenticated;

comment on table public.education_service_quotes is
  'Versioned custom-service proposals. Acceptance records commercial intent only; it does not verify payment or grant entitlements.';
comment on table public.education_sessions is
  'Academic/service schedule owned by the canonical CTG One user. Scheduling never grants entitlements.';
