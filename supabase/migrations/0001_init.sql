-- Listing Launch: initial schema
-- Run with: supabase db push   (or paste into the Supabase SQL editor)

create extension if not exists "pgcrypto";

-- ---------- Enums ----------
create type discovery_method as enum ('api', 'search_fetch', 'none');
create type submission_method as enum ('api', 'form', 'manual', 'none');
create type finding_state as enum (
  'verified_accurate', 'incorrect', 'not_found',
  'possible_match', 'unable_to_verify', 'not_eligible'
);
create type scan_status as enum ('queued', 'running', 'complete', 'failed');
create type order_status as enum ('draft', 'paid', 'in_progress', 'complete', 'refunded');
create type submission_status as enum (
  'prepared', 'submitted', 'verification_required',
  'published', 'rejected', 'not_eligible', 'failed'
);
create type owner_task_type as enum ('email_confirm', 'sms_code', 'oauth', 'upload', 'review', 'other');
create type owner_task_status as enum ('open', 'done', 'skipped');

-- ---------- Canonical business record ----------
create table businesses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  owner_email text,
  google_place_id text,
  name text not null,
  street text,
  city text not null,
  state text not null,
  postal_code text,
  country text not null default 'US',
  phone_e164 text,
  website text,
  domain text,
  categories text[] not null default '{}',
  hours jsonb,                       -- {mon:[["08:00","17:00"]], ...}
  hide_address boolean not null default false,  -- home-based / service-area business
  description_short text,
  description_long text,
  logo_url text,
  lat double precision,
  lng double precision
);
create index businesses_phone_idx on businesses (phone_e164);

-- ---------- Directory registry ----------
create table directories (
  id text primary key,               -- 'yelp', 'yellowpages'
  name text not null,
  homepage text not null,
  domains text[] not null,           -- hosts to match listing URLs against
  tier text not null,                -- 'maps' | 'review' | 'general' | 'industry' | 'local'
  discovery discovery_method not null default 'search_fetch',
  submission submission_method not null default 'manual',
  owner_actions owner_task_type[] not null default '{}',
  eligible_categories text[],        -- null = all
  eligible_countries text[] not null default '{US}',
  allows_hidden_address boolean not null default true,
  external_fee_cents int not null default 0,
  base_price_cents int not null default 0,       -- our per-listing price component
  est_human_minutes int not null default 5,
  active boolean not null default true,
  notes text
);

-- ---------- Scans and findings ----------
create table scan_jobs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  status scan_status not null default 'queued',
  directories_total int not null default 0,
  directories_done int not null default 0,
  requester_ip inet,
  requester_email text,
  cost_cents numeric(10,4) not null default 0,
  error text
);

create table findings (
  id uuid primary key default gen_random_uuid(),
  scan_job_id uuid not null references scan_jobs(id) on delete cascade,
  business_id uuid not null references businesses(id) on delete cascade,
  directory_id text not null references directories(id),
  created_at timestamptz not null default now(),
  state finding_state not null,
  confidence numeric(4,3) not null default 0,     -- 0..1
  listing_url text,
  observed jsonb,                                  -- {name, phone, street, city, website, hours}
  diffs jsonb,                                     -- [{field, expected, observed}]
  evidence jsonb,                                  -- {queries:[], candidates:[], screenshot_path}
  reviewed_by text,
  reviewed_at timestamptz,
  unique (scan_job_id, directory_id)
);
create index findings_business_idx on findings (business_id);

-- ---------- Orders ----------
create table orders (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id),
  scan_job_id uuid references scan_jobs(id),
  created_at timestamptz not null default now(),
  status order_status not null default 'draft',
  package_name text not null,
  subtotal_cents int not null,
  fees_cents int not null default 0,
  total_cents int not null,
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  paid_at timestamptz,
  customer_email text,
  completion_report_sent_at timestamptz
);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  directory_id text not null references directories(id),
  finding_id uuid references findings(id),
  action text not null check (action in ('create', 'correct')),
  price_cents int not null,
  unique (order_id, directory_id)
);

-- ---------- Fulfillment ----------
create table submission_jobs (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references order_items(id) on delete cascade,
  business_id uuid not null references businesses(id),
  directory_id text not null references directories(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status submission_status not null default 'prepared',
  method submission_method not null,
  listing_url text,
  account_email text,
  assigned_to text,
  human_minutes int not null default 0,
  log jsonb not null default '[]',   -- [{at, event, detail}]
  error text
);

create table owner_tasks (
  id uuid primary key default gen_random_uuid(),
  submission_job_id uuid not null references submission_jobs(id) on delete cascade,
  business_id uuid not null references businesses(id),
  created_at timestamptz not null default now(),
  type owner_task_type not null,
  status owner_task_status not null default 'open',
  title text not null,
  instructions text,
  completed_at timestamptz
);

create table publication_checks (
  id uuid primary key default gen_random_uuid(),
  submission_job_id uuid not null references submission_jobs(id) on delete cascade,
  scheduled_for timestamptz not null,
  checked_at timestamptz,
  result finding_state,
  listing_url text,
  observed jsonb
);
create index publication_checks_due_idx on publication_checks (scheduled_for) where checked_at is null;

-- ---------- updated_at trigger ----------
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger submission_jobs_updated before update on submission_jobs
  for each row execute function set_updated_at();

-- ---------- Row level security (customers see only their own rows; service role bypasses) ----------
alter table businesses enable row level security;
alter table scan_jobs enable row level security;
alter table findings enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table submission_jobs enable row level security;
alter table owner_tasks enable row level security;
alter table directories enable row level security;

create policy "directories are public" on directories for select using (true);
create policy "own business" on businesses for select using (owner_email = auth.jwt() ->> 'email');
create policy "own scans" on scan_jobs for select
  using (exists (select 1 from businesses b where b.id = business_id and b.owner_email = auth.jwt() ->> 'email'));
create policy "own findings" on findings for select
  using (exists (select 1 from businesses b where b.id = business_id and b.owner_email = auth.jwt() ->> 'email'));
create policy "own orders" on orders for select
  using (exists (select 1 from businesses b where b.id = business_id and b.owner_email = auth.jwt() ->> 'email'));
create policy "own order items" on order_items for select
  using (exists (select 1 from orders o join businesses b on b.id = o.business_id
                 where o.id = order_id and b.owner_email = auth.jwt() ->> 'email'));
create policy "own submissions" on submission_jobs for select
  using (exists (select 1 from businesses b where b.id = business_id and b.owner_email = auth.jwt() ->> 'email'));
create policy "own tasks" on owner_tasks for select
  using (exists (select 1 from businesses b where b.id = business_id and b.owner_email = auth.jwt() ->> 'email'));
