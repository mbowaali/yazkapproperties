-- ============================================================
-- Yazkap Properties — Supabase schema
-- Paste into Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================

-- ---------- Tenants roster (imported from Excel master) ----------
create table if not exists public.tenants (
  id               serial primary key,
  code             text unique not null,
  full_name        text not null,
  phone            text,
  email            text,
  emergency_contact text,
  entry_date       date,
  monthly_rent     numeric(12,2),
  status           text check (status in ('active','exited')),
  space_type       text,
  created_at       timestamptz default now()
);

-- ---------- Units (vacancy board on the homepage) ----------
create table if not exists public.units (
  id          serial primary key,
  label       text unique not null,
  type        text not null,                       -- studio | partition | bedspace | big-hall | ...
  rent        numeric(12,2),
  currency    text not null default 'AED',
  status      text not null default 'vacant' check (status in ('vacant','occupied','maintenance')),
  advertised  boolean not null default false,
  notes       text,
  created_at  timestamptz default now()
);

-- ---------- Portal profiles (auth users) ----------
create table if not exists public.profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  full_name         text,
  phone             text,
  email             text,
  emirates_id       text,
  employer          text,
  job_title         text,
  role              text not null default 'tenant' check (role in ('tenant','admin')),
  approved          boolean not null default false,
  id_document_url   text,
  work_contract_url text,
  created_at        timestamptz default now()
);

-- ---------- Tenancies (link a portal user to a unit) ----------
create table if not exists public.tenancies (
  id         serial primary key,
  tenant_id  uuid not null references public.profiles(id) on delete cascade,
  unit_id    integer references public.units(id) on delete set null,
  rent       numeric(12,2),
  currency   text not null default 'AED',
  start_date date,
  end_date   date,
  status     text not null default 'active' check (status in ('active','ended')),
  created_at timestamptz default now()
);

-- ---------- Transactions (rent payments; Excel history + portal) ----------
create table if not exists public.transactions (
  id          serial primary key,
  tenancy_id  integer references public.tenancies(id) on delete set null,
  tenant_name text,                                -- imported history may predate portal accounts
  date        date,
  type        text default 'rent',
  amount      numeric(12,2) not null,
  currency    text not null default 'AED',
  method      text,
  status      text not null default 'Paid',
  note        text,
  created_at  timestamptz default now()
);

-- ---------- Invoices ----------
create table if not exists public.invoices (
  id         serial primary key,
  invoice_no text unique not null,
  tenancy_id integer references public.tenancies(id) on delete set null,
  total      numeric(12,2) not null,
  due_date   date,
  status     text not null default 'pending' check (status in ('pending','paid','overdue')),
  pdf_url    text,
  created_at timestamptz default now()
);

-- ---------- Announcements ----------
create table if not exists public.announcements (
  id         serial primary key,
  title      text not null,
  body       text,
  active     boolean not null default true,
  created_at timestamptz default now()
);

-- ---------- Expenses (operating, excludes landlord rent) ----------
create table if not exists public.expenses (
  id          serial primary key,
  date        date,
  year        integer,
  month       text,
  category    text not null default 'Other',
  description text,
  amount      numeric(12,2) not null,
  method      text,
  notes       text,
  created_at  timestamptz default now()
);

-- ---------- Landlord payments (AED 5,800/mo to Ahmed Nady) ----------
create table if not exists public.landlord_payments (
  id         serial primary key,
  date       date,
  year       integer,
  month      text,
  amount     numeric(12,2) not null,
  method     text,
  note       text,
  created_at timestamptz default now()
);

-- ---------- Maintenance jobs (admin 🛠 page) ----------
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

-- ---------- Assets (admin 🛏 page) ----------
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

-- ---------- Consumables stock (admin 🧴 page) ----------
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

-- ---------- Security deposits (admin 💰 page) ----------
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

-- ---------- Bank accounts directory (admin 🏦 page) ----------
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
create index if not exists idx_transactions_date        on public.transactions(date);
create index if not exists idx_transactions_tenancy     on public.transactions(tenancy_id);
create index if not exists idx_invoices_tenancy         on public.invoices(tenancy_id);
create index if not exists idx_tenancies_tenant         on public.tenancies(tenant_id);
create index if not exists idx_expenses_date            on public.expenses(date);
create index if not exists idx_landlord_payments_date   on public.landlord_payments(date);
create index if not exists idx_maintenance_reported     on public.maintenance_requests(reported_date);
create index if not exists idx_maintenance_status       on public.maintenance_requests(status);
create index if not exists idx_assets_purchase_date     on public.assets(purchase_date);
create index if not exists idx_consumables_restock      on public.consumables(last_restock);
create index if not exists idx_deposits_held_since      on public.deposits(held_since);

-- ============================================================
-- Helper: is the current user an admin?
-- ============================================================
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.tenants           enable row level security;
alter table public.units             enable row level security;
alter table public.profiles          enable row level security;
alter table public.tenancies         enable row level security;
alter table public.transactions      enable row level security;
alter table public.invoices          enable row level security;
alter table public.announcements     enable row level security;
alter table public.expenses          enable row level security;
alter table public.landlord_payments enable row level security;
alter table public.maintenance_requests enable row level security;
alter table public.assets            enable row level security;
alter table public.consumables       enable row level security;
alter table public.deposits          enable row level security;
alter table public.bank_accounts     enable row level security;

-- tenants roster + financials: admin only
create policy "admin manages tenants"      on public.tenants           for all      using (public.is_admin());
create policy "admin manages expenses"     on public.expenses          for all      using (public.is_admin());
create policy "admin manages landlord"     on public.landlord_payments for all      using (public.is_admin());
create policy "admin manages maintenance"  on public.maintenance_requests for all   using (public.is_admin());
create policy "admin manages assets"       on public.assets            for all      using (public.is_admin());
create policy "admin manages consumables"  on public.consumables       for all      using (public.is_admin());
create policy "admin manages deposits"     on public.deposits          for all      using (public.is_admin());
create policy "admin manages banks"        on public.bank_accounts     for all      using (public.is_admin());

-- units: public read (homepage vacancy board), admin writes
create policy "public read units"          on public.units             for select   using (true);
create policy "admin manages units"        on public.units             for all      using (public.is_admin());

-- announcements: tenants read, admin writes
create policy "read announcements"         on public.announcements     for select   using (active or public.is_admin());
create policy "admin manages announcements" on public.announcements    for all      using (public.is_admin());

-- profiles: own row, or admin
create policy "read own profile"           on public.profiles          for select   using (id = auth.uid() or public.is_admin());
create policy "insert own profile"         on public.profiles          for insert   with check (id = auth.uid());
create policy "update own profile"         on public.profiles          for update   using (id = auth.uid() or public.is_admin());

-- tenancies: owner sees own, admin sees all
create policy "read own tenancy"           on public.tenancies         for select   using (tenant_id = auth.uid() or public.is_admin());
create policy "admin manages tenancies"    on public.tenancies         for all      using (public.is_admin());

-- transactions: owner via tenancy, admin all
create policy "read own transactions"      on public.transactions      for select
  using (tenancy_id in (select id from public.tenancies where tenant_id = auth.uid()) or public.is_admin());
create policy "admin manages transactions" on public.transactions      for all      using (public.is_admin());

-- invoices: owner via tenancy, admin all
create policy "read own invoices"          on public.invoices          for select
  using (tenancy_id in (select id from public.tenancies where tenant_id = auth.uid()) or public.is_admin());
create policy "admin manages invoices"     on public.invoices          for all      using (public.is_admin());

-- ============================================================
-- Storage: documents bucket (Emirates ID + work contract uploads)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('documents', 'documents', true)
on conflict (id) do nothing;

create policy "public read documents"      on storage.objects for select using (bucket_id = 'documents');
create policy "auth upload documents"      on storage.objects for insert with check (bucket_id = 'documents' and auth.role() = 'authenticated');
