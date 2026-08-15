-- 0001_init.sql only ever moves profiles.kyc_status to 'verified' or
-- 'rejected' (via approve_kyc/reject_kyc). Nothing moved it to 'pending'
-- when a user actually submits — without this, a user's dashboard would
-- keep showing the upload form after submitting (since it branches on
-- profiles.kyc_status), and RLS doesn't stop them from creating a second
-- pending kyc_submissions row in the meantime.

create function public.handle_new_kyc_submission()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  update public.profiles set kyc_status = 'pending' where id = new.user_id;
  return new;
end;
$$;

create trigger on_kyc_submission_created
  after insert on public.kyc_submissions
  for each row execute function public.handle_new_kyc_submission();

-- Belt-and-suspenders: the well-behaved UI won't offer the upload form
-- again while a submission is pending, but RLS alone doesn't stop a
-- second pending row from being inserted directly against the API. This
-- makes "one pending submission per user" a real DB-level guarantee.
create unique index kyc_submissions_one_pending_per_user
  on public.kyc_submissions (user_id)
  where status = 'pending';
