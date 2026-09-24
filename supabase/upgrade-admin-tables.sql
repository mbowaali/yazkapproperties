-- ============================================================
-- Yazkap Properties — admin pages upgrade
-- Run this ONCE in Supabase Dashboard → SQL Editor → New query → Run
-- Creates the 5 tables behind the new admin pages:
--   maintenance_requests, assets, consumables, deposits, bank_accounts
-- (The original schema.sql must already be applied — it defines is_admin())
-- ============================================================

-- ---------- Maintenance jobs (🛠 Maintenance page) ----------
create table if not exists public.maintenance_requests (
  id            serial primary key,
  unit_label    text,
  tenant_name   text,
  issue         text not null,
  priority      text not null default 'medium' check (priority in ('low','medium','high','urgent')),
  status        text not null default 'open' check (status in ('open','in-progress','done')),
  cost          numeric(12,2),
  reported_date date default current_date,
  resolved_date date,
  notes         text,
  created_at    timestamptz default now()
);

-- ---------- Assets (🛏 Assets page) ----------
create table if not exists public.assets (
  id            serial primary key,
  name          text not null,
  category      text default 'Other',
  location      text,
  purchase_date date,
  value         numeric(12,2),
  condition     text check (condition in ('good','fair','poor','broken')),
  notes         text,
  created_at    timestamptz default now()
);

-- ---------- Consumables stock (🧴 Consumables page) ----------
create table if not exists public.consumables (
  id           serial primary key,
  item         text not null,
  category     text default 'Other',
  quantity     numeric(12,2) default 0,
  unit         text default 'pcs',
  unit_cost    numeric(12,2),
  last_restock date,
  supplier     text,
  notes        text,
  created_at   timestamptz default now()
);

-- ---------- Security deposits (💰 Deposits page) ----------
create table if not exists public.deposits (
  id          serial primary key,
  tenant_name text not null,
  unit_label  text,
  amount      numeric(12,2) not null,
  currency    text not null default 'AED',
  status      text not null default 'held' check (status in ('held','partially-refunded','refunded','forfeited')),
  held_since  date,
  refund_date date,
  notes       text,
  created_at  timestamptz default now()
);

-- ---------- Bank accounts directory (🏦 Banks/Branches page) ----------
create table if not exists public.bank_accounts (
  id           serial primary key,
  bank_name    text not null,
  branch       text,
  account_name text,
  iban         text,
  currency     text default 'AED',
  notes        text,
  created_at   timestamptz default now()
);

-- ---------- Indexes ----------
create index if not exists idx_maintenance_reported on public.maintenance_requests(reported_date);
create index if not exists idx_maintenance_status    on public.maintenance_requests(status);
create index if not exists idx_assets_purchase_date on public.assets(purchase_date);
create index if not exists idx_consumables_restock  on public.consumables(last_restock);
create index if not exists idx_deposits_held_since  on public.deposits(held_since);

-- ---------- Row Level Security: owner/admin only ----------
alter table public.maintenance_requests enable row level security;
alter table public.assets            enable row level security;
alter table public.consumables       enable row level security;
alter table public.deposits          enable row level security;
alter table public.bank_accounts     enable row level security;

create policy "admin manages maintenance" on public.maintenance_requests for all using (public.is_admin());
create policy "admin manages assets"     on public.assets            for all using (public.is_admin());
create policy "admin manages consumables" on public.consumables      for all using (public.is_admin());
create policy "admin manages deposits"   on public.deposits          for all using (public.is_admin());
create policy "admin manages banks"      on public.bank_accounts     for all using (public.is_admin());
