-- Supporter perk: hosted note/locker pages drop the QRBuddy CTA when the
-- bucket was created with a valid supporter pass.
alter table public.file_buckets
  add column if not exists unbranded boolean not null default false;
