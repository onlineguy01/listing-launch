-- Website intake niche + niche directory discovery
alter table businesses add column if not exists niche text;

create table if not exists niche_sites (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  niche text not null,
  name text not null,
  host text not null,
  url text not null,
  kind text not null check (kind in ('directory','marketplace','profile','association')),
  who text not null check (who in ('we','you','manual')),
  note text,
  status text not null default 'suggested' check (status in ('suggested','approved','rejected')),
  probe jsonb,
  source text not null default 'web_search',
  unique (niche, host)
);
create index if not exists niche_sites_niche_idx on niche_sites (niche, status);
