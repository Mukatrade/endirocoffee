-- Neon (free tier). Run once: node tools/migrate.js (setup-crypto.sh does it for you).
create table if not exists crypto_orders (
  id text primary key,
  pickup text, name text, phone text, branch text, branch_name text, mode text, pickup_time text,
  lines jsonb not null,
  amount_ugx integer not null,
  amount_usd numeric(12,2) not null,
  ugx_per_usd numeric(12,4) not null,
  rate_source text,
  sandbox boolean not null default true,
  status text not null default 'PENDING',  -- PENDING, CONFIRMING, PAID, FAILED_UNDERPAID, EXPIRED, FAILED, REFUNDED
  gw_status text, gw_payment_id text, pay_currency text, pay_amount text, pay_address text, extra_id text,
  expires_at timestamptz, actually_paid text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
create index if not exists crypto_orders_status_idx on crypto_orders (status, created_at desc);
create table if not exists fx_rates (
  pair text primary key,
  rate numeric(12,4) not null,
  fetched_at timestamptz not null
);
