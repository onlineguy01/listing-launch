-- Package tiers, per-line billing status and the 30-day guarantee
alter table orders
  add column if not exists package_tier text,
  add column if not exists stripe_payment_intent_id text,
  add column if not exists refunded_cents int not null default 0;

alter table order_items drop constraint if exists order_items_action_check;
alter table order_items add constraint order_items_action_check check (action in ('create', 'correct', 'verify', 'review'));

create type billing_status as enum ('charged', 'verified', 'refunded', 'substituted');
alter table submission_jobs
  add column if not exists action text not null default 'create',
  add column if not exists price_cents int not null default 0,
  add column if not exists billing_status billing_status not null default 'charged',
  add column if not exists verified_at timestamptz,
  add column if not exists verified_by text,          -- scanner | owner | ops
  add column if not exists refunded_at timestamptz,
  add column if not exists stripe_refund_id text,
  add column if not exists refund_note text;
