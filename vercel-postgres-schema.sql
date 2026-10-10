-- Yazkap Properties — Vercel Postgres schema
-- Run this in Vercel Dashboard → Storage → your DB → Query

-- Users table (replaces Supabase auth + profiles)
CREATE TABLE IF NOT EXISTS users (
  id               SERIAL PRIMARY KEY,
  email            TEXT UNIQUE NOT NULL,
  password_hash    TEXT NOT NULL,
  role             TEXT NOT NULL DEFAULT 'tenant' CHECK (role IN ('tenant','admin','landlord','employee')),
  full_name        TEXT,
  phone            TEXT,
  emirates_id      TEXT,
  employer         TEXT,
  job_title        TEXT,
  photo_url        TEXT,
  approved         BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Tenants roster
CREATE TABLE IF NOT EXISTS tenants (
  id               SERIAL PRIMARY KEY,
  code             TEXT UNIQUE NOT NULL,
  full_name        TEXT NOT NULL,
  phone            TEXT,
  email            TEXT,
  emergency_contact TEXT,
  entry_date       DATE,
  monthly_rent     NUMERIC(12,2),
  status           TEXT CHECK (status IN ('active','exited')),
  space_type       TEXT,
  photo_url        TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Units
CREATE TABLE IF NOT EXISTS units (
  id          SERIAL PRIMARY KEY,
  label       TEXT UNIQUE NOT NULL,
  type        TEXT NOT NULL,
  rent        NUMERIC(12,2),
  currency    TEXT NOT NULL DEFAULT 'AED',
  status      TEXT NOT NULL DEFAULT 'vacant' CHECK (status IN ('vacant','occupied','maintenance')),
  advertised  BOOLEAN NOT NULL DEFAULT false,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Tenancies
CREATE TABLE IF NOT EXISTS tenancies (
  id         SERIAL PRIMARY KEY,
  tenant_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  unit_id    INTEGER REFERENCES units(id) ON DELETE SET NULL,
  rent       NUMERIC(12,2),
  currency   TEXT NOT NULL DEFAULT 'AED',
  start_date DATE,
  end_date   DATE,
  status     TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','ended')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions
CREATE TABLE IF NOT EXISTS transactions (
  id          SERIAL PRIMARY KEY,
  tenancy_id  INTEGER REFERENCES tenancies(id) ON DELETE SET NULL,
  tenant_name TEXT,
  date        DATE,
  type        TEXT DEFAULT 'rent',
  amount      NUMERIC(12,2) NOT NULL,
  currency    TEXT NOT NULL DEFAULT 'AED',
  method      TEXT,
  status      TEXT NOT NULL DEFAULT 'Paid',
  note        TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id         SERIAL PRIMARY KEY,
  invoice_no TEXT UNIQUE NOT NULL,
  tenancy_id INTEGER REFERENCES tenancies(id) ON DELETE SET NULL,
  total      NUMERIC(12,2) NOT NULL,
  due_date   DATE,
  status     TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','overdue')),
  pdf_url    TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Announcements
CREATE TABLE IF NOT EXISTS announcements (
  id         SERIAL PRIMARY KEY,
  title      TEXT NOT NULL,
  body       TEXT,
  active     BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Expenses
CREATE TABLE IF NOT EXISTS expenses (
  id          SERIAL PRIMARY KEY,
  date        DATE,
  year        INTEGER,
  month       TEXT,
  category    TEXT NOT NULL DEFAULT 'Other',
  description TEXT,
  amount      NUMERIC(12,2) NOT NULL,
  method      TEXT,
  receipt_no  TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS receipt_no TEXT;

-- Landlord payments
CREATE TABLE IF NOT EXISTS landlord_payments (
  id         SERIAL PRIMARY KEY,
  date       DATE,
  year       INTEGER,
  month      TEXT,
  amount     NUMERIC(12,2) NOT NULL,
  method     TEXT,
  note       TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Maintenance
CREATE TABLE IF NOT EXISTS maintenance_requests (
  id            SERIAL PRIMARY KEY,
  unit_label    TEXT,
  tenant_name   TEXT,
  issue         TEXT NOT NULL,
  priority      TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  status        TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in-progress','done')),
  cost          NUMERIC(12,2),
  reported_date DATE DEFAULT CURRENT_DATE,
  resolved_date DATE,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Assets
CREATE TABLE IF NOT EXISTS assets (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  category      TEXT DEFAULT 'Other',
  location      TEXT,
  purchase_date DATE,
  value         NUMERIC(12,2),
  condition     TEXT CHECK (condition IN ('good','fair','poor','broken')),
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Consumables
CREATE TABLE IF NOT EXISTS consumables (
  id           SERIAL PRIMARY KEY,
  item         TEXT NOT NULL,
  category     TEXT DEFAULT 'Other',
  quantity     NUMERIC(12,2) DEFAULT 0,
  unit         TEXT DEFAULT 'pcs',
  unit_cost    NUMERIC(12,2),
  last_restock DATE,
  supplier     TEXT,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Deposits
CREATE TABLE IF NOT EXISTS deposits (
  id          SERIAL PRIMARY KEY,
  tenant_name TEXT NOT NULL,
  unit_label  TEXT,
  amount      NUMERIC(12,2) NOT NULL,
  currency    TEXT NOT NULL DEFAULT 'AED',
  status      TEXT NOT NULL DEFAULT 'held' CHECK (status IN ('held','partially-refunded','refunded','forfeited')),
  held_since  DATE,
  refund_date DATE,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Bank accounts
CREATE TABLE IF NOT EXISTS bank_accounts (
  id           SERIAL PRIMARY KEY,
  bank_name    TEXT NOT NULL,
  branch       TEXT,
  account_name TEXT,
  iban         TEXT,
  currency     TEXT DEFAULT 'AED',
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_transactions_date      ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_tenancy   ON transactions(tenancy_id);
CREATE INDEX IF NOT EXISTS idx_invoices_tenancy       ON invoices(tenancy_id);
CREATE INDEX IF NOT EXISTS idx_tenancies_tenant       ON tenancies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date          ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_landlord_payments_date ON landlord_payments(date);

-- Laundry / Washing Machine usage tracking
CREATE TABLE IF NOT EXISTS laundry_usage (
  id              SERIAL PRIMARY KEY,
  machine_id      TEXT NOT NULL,
  machine_label   TEXT,
  used_by_name    TEXT,
  used_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  unit_label      TEXT,
  date            DATE NOT NULL DEFAULT CURRENT_DATE,
  cycles          INTEGER NOT NULL DEFAULT 1,
  fee_per_cycle   NUMERIC(10,2) NOT NULL DEFAULT 5.00,
  total_fee       NUMERIC(10,2) GENERATED ALWAYS AS (cycles * fee_per_cycle) STORED,
  currency        TEXT NOT NULL DEFAULT 'AED',
  paid            BOOLEAN NOT NULL DEFAULT false,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_laundry_date    ON laundry_usage(date);
CREATE INDEX IF NOT EXISTS idx_laundry_machine ON laundry_usage(machine_id);
CREATE INDEX IF NOT EXISTS idx_laundry_user    ON laundry_usage(used_by_user_id);

-- Monthly coin counts for the shared washing machine (AED 3 per two-hour coin)
CREATE TABLE IF NOT EXISTS laundry_collections (
  id               SERIAL PRIMARY KEY,
  collection_month DATE NOT NULL UNIQUE CHECK (EXTRACT(DAY FROM collection_month) = 1),
  coin_count       INTEGER NOT NULL CHECK (coin_count >= 0),
  total_amount     NUMERIC(12,2) GENERATED ALWAYS AS (coin_count * 3.00) STORED,
  collected_by     TEXT,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tenant_adjustments (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('refund','discount')),
  amount          NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  currency        TEXT NOT NULL DEFAULT 'AED',
  effective_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  reason          TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','cancelled')),
  created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tenant_adjustments_user_date
  ON tenant_adjustments(user_id, effective_date DESC);

-- Extended user profile fields (run ALTER TABLE if DB already exists)
ALTER TABLE users ADD COLUMN IF NOT EXISTS nationality TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS passport_no TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS passport_expiry DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS joining_date DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS emergency_contact_relation TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS id_document_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS passport_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS work_contract_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS visa_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS unit_label TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS monthly_rent NUMERIC(12,2);

CREATE TABLE IF NOT EXISTS employee_permissions (
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, permission)
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint   TEXT NOT NULL UNIQUE,
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS push_reminder_deliveries (
  id              SERIAL PRIMARY KEY,
  subscription_id INTEGER NOT NULL REFERENCES push_subscriptions(id) ON DELETE CASCADE,
  invoice_id      INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  due_date        DATE NOT NULL,
  reminder_stage  TEXT NOT NULL CHECK (reminder_stage IN ('before_due','due_today','overdue')),
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (subscription_id, invoice_id, due_date, reminder_stage)
);

CREATE TABLE IF NOT EXISTS tenant_setup_invites (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash   TEXT NOT NULL UNIQUE,
  expires_at   TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  created_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tenant_setup_invites_user ON tenant_setup_invites(user_id, created_at DESC);

-- Tenant requests (maintenance, complaints, general)
CREATE TABLE IF NOT EXISTS tenant_requests (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL DEFAULT 'general',
  subject     TEXT NOT NULL,
  message     TEXT,
  status      TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in-progress','resolved','closed')),
  admin_reply TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- News, events, reminders posted by admin
CREATE TABLE IF NOT EXISTS tenant_events (
  id          SERIAL PRIMARY KEY,
  title       TEXT NOT NULL,
  body        TEXT,
  event_date  DATE,
  type        TEXT NOT NULL DEFAULT 'news' CHECK (type IN ('news','event','reminder','notice')),
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Private admin/employee team chat and tenant help knowledge base
CREATE TABLE IF NOT EXISTS messages (
  id          SERIAL PRIMARY KEY,
  sender_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL,
  channel     TEXT NOT NULL DEFAULT 'team',
  body        TEXT NOT NULL,
  is_alert    BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_messages_channel_created ON messages(channel, created_at);

CREATE TABLE IF NOT EXISTS chatbot_faqs (
  id         SERIAL PRIMARY KEY,
  question   TEXT NOT NULL,
  answer     TEXT NOT NULL,
  keywords   TEXT,
  active     BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Payment receipts (tenant requests, admin approves)
CREATE TABLE IF NOT EXISTS receipts (
  id             SERIAL PRIMARY KEY,
  receipt_no     TEXT UNIQUE NOT NULL,
  user_id        INTEGER REFERENCES users(id) ON DELETE SET NULL,
  tenant_name    TEXT NOT NULL,
  unit_label     TEXT,
  amount         NUMERIC(12,2) NOT NULL,
  currency       TEXT NOT NULL DEFAULT 'AED',
  payment_date   DATE NOT NULL,
  payment_method TEXT,
  description    TEXT,
  status         TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  approved_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  approved_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Tenant uploaded documents
CREATE TABLE IF NOT EXISTS tenant_documents (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  doc_type    TEXT NOT NULL,
  file_url    TEXT NOT NULL,
  file_name   TEXT,
  ocr_data    JSONB,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_requests_user ON tenant_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_receipts_user ON receipts(user_id);
CREATE INDEX IF NOT EXISTS idx_docs_user     ON tenant_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_events_date   ON tenant_events(event_date);
