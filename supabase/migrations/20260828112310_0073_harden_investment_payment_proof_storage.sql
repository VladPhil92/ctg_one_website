-- CTG Craft Beer Inversion — harden payment-proof Storage boundary
--
-- Payment evidence must enter through the server route that validates order
-- ownership/state, rate limits, MIME + binary signature, size and SHA-256.
-- Authenticated clients therefore do not receive direct INSERT access to the
-- private bucket. service_role uploads continue to bypass Storage RLS.

update storage.buckets
set public = false,
    file_size_limit = 8388608,
    allowed_mime_types = array[
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf'
    ]::text[]
where id = 'payment-proofs';

-- Remove the legacy direct-browser upload path. All new evidence is uploaded
-- by /api/investment/orders/:orderId/payment-proof after server validation.
drop policy if exists payment_proofs_storage_insert on storage.objects;

-- Keep proofs private while allowing the participant to read their own
-- evidence and Finance to review it. Generic platform-admin status is not
-- sufficient: investment finance permission is the explicit boundary.
drop policy if exists payment_proofs_storage_select on storage.objects;
create policy payment_proofs_storage_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'payment-proofs'
  and (
    auth.uid()::text = (storage.foldername(name))[1]
    or public.has_investment_permission('finance.manage')
  )
);
