-- Post-purchase details and Google Business Profile connection
alter table businesses
  add column if not exists service_area text[],
  add column if not exists services text[],
  add column if not exists year_founded int,
  add column if not exists payment_methods text[],
  add column if not exists google_refresh_token_enc text,   -- AES-GCM, key = APP_SECRET
  add column if not exists google_account_email text,
  add column if not exists google_location_name text,
  add column if not exists details_completed_at timestamptz;

alter table orders add column if not exists completion_report_sent_at timestamptz;
