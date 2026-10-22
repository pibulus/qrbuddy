-- Supporter perk: clean white-label pages for shared slideshows, mixtapes,
-- file download pages (/f/{code}), and dynamic QR splash/cover pages.
alter table public.destructible_files
  add column if not exists unbranded boolean not null default false;
alter table public.dynamic_qr_codes
  add column if not exists unbranded boolean not null default false;
