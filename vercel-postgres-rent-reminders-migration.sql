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