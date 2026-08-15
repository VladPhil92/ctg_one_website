-- Same anti-duplicate principle as the external_reference index in
-- 0001_init.sql (which only covers bank_transfer/pse/bre_b_qr), applied
-- to crypto deposits: catches a user submitting the same on-chain
-- transaction hash twice.

create unique index transactions_crypto_tx_hash_key
  on public.transactions (crypto_tx_hash)
  where crypto_tx_hash is not null;
