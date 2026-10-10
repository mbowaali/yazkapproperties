/**
 * Import old seed data into Neon DB
 * Run: node scripts/import-old-data.mjs
 */
import { readFileSync } from "fs";
import { createRequire } from "module";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
const __dirname = dirname(fileURLToPath(import.meta.url));

const require = createRequire(import.meta.url);
const { neon } = require("@neondatabase/serverless");

const sql = neon(process.env.POSTGRES_URL);

const tenants = JSON.parse(readFileSync(join(__dirname, "../supabase/seed/tenants.json"), "utf8"));
const payments = JSON.parse(readFileSync(join(__dirname, "../supabase/seed/payments.json"), "utf8"));
const expenses = JSON.parse(readFileSync(join(__dirname, "../supabase/seed/expenses.json"), "utf8"));
const landlordPayments = JSON.parse(readFileSync(join(__dirname, "../supabase/seed/landlord_payments.json"), "utf8"));

async function run() {
  console.log("🚀 Starting data import...\n");

  // ── 1. Tenants ──────────────────────────────────────────────────────────────
  console.log(`📋 Importing ${tenants.length} tenants...`);
  let tCount = 0;
  for (const t of tenants) {
    // Skip tenants with no usable email (can't be unique key)
    const email = t.email?.includes("/") ? null : t.email?.trim() || null;
    try {
      await sql`
        INSERT INTO tenants (code, full_name, phone, email, emergency_contact, entry_date, monthly_rent, status, space_type)
        VALUES (
          ${t.code}, ${t.full_name}, ${t.phone || null}, ${email},
          ${t.emergency_contact || null},
          ${t.entry_date || null},
          ${t.monthly_rent || null},
          ${t.status || "exited"},
          ${t.space_type || null}
        )
        ON CONFLICT (code) DO UPDATE SET
          full_name = EXCLUDED.full_name,
          phone = EXCLUDED.phone,
          email = EXCLUDED.email,
          emergency_contact = EXCLUDED.emergency_contact,
          entry_date = EXCLUDED.entry_date,
          monthly_rent = EXCLUDED.monthly_rent,
          status = EXCLUDED.status,
          space_type = EXCLUDED.space_type
      `;
      tCount++;
    } catch (e) {
      console.warn(`  ⚠️  Tenant ${t.code} (${t.full_name}): ${e.message}`);
    }
  }
  console.log(`  ✅ ${tCount} tenants imported\n`);

  // ── 2. Payments → transactions ───────────────────────────────────────────────
  console.log(`💵 Importing ${payments.length} payment records...`);
  let pCount = 0;
  for (const p of payments) {
    try {
      await sql`
        INSERT INTO transactions (tenant_name, date, type, amount, currency, method, status, note)
        VALUES (
          ${p.tenant_name}, ${p.date}, 'rent',
          ${p.amount}, 'AED',
          ${p.method || "Cash"},
          ${p.status || "Paid"},
          ${p.month ? `${p.month} ${p.year}` : null}
        )
      `;
      pCount++;
    } catch (e) {
      console.warn(`  ⚠️  Payment ${p.tenant_name} ${p.date}: ${e.message}`);
    }
  }
  console.log(`  ✅ ${pCount} transactions imported\n`);

  // ── 3. Expenses ──────────────────────────────────────────────────────────────
  console.log(`🧾 Importing ${expenses.length} expense records...`);
  let eCount = 0;
  for (const e of expenses) {
    try {
      await sql`
        INSERT INTO expenses (date, year, month, category, description, amount, method, notes)
        VALUES (
          ${e.date}, ${e.year}, ${e.month},
          ${e.category || "Other"}, ${e.description || null},
          ${e.amount}, ${e.method || "Cash"}, ${e.notes || null}
        )
      `;
      eCount++;
    } catch (e2) {
      console.warn(`  ⚠️  Expense ${e.description}: ${e2.message}`);
    }
  }
  console.log(`  ✅ ${eCount} expenses imported\n`);

  // ── 4. Landlord payments ─────────────────────────────────────────────────────
  console.log(`🏠 Importing ${landlordPayments.length} landlord payment records...`);
  let lCount = 0;
  for (const lp of landlordPayments) {
    try {
      await sql`
        INSERT INTO landlord_payments (date, year, month, amount, method, note)
        VALUES (
          ${lp.date}, ${lp.year}, ${lp.month},
          ${lp.amount}, ${lp.method || "Bank Transfer"}, ${lp.note || null}
        )
      `;
      lCount++;
    } catch (e) {
      console.warn(`  ⚠️  Landlord payment ${lp.date}: ${e.message}`);
    }
  }
  console.log(`  ✅ ${lCount} landlord payments imported\n`);

  // ── 5. Summary ───────────────────────────────────────────────────────────────
  const [{ count: txTotal }] = await sql`SELECT COUNT(*) as count FROM transactions`;
  const [{ count: expTotal }] = await sql`SELECT COUNT(*) as count FROM expenses`;
  const [{ count: lpTotal }] = await sql`SELECT COUNT(*) as count FROM landlord_payments`;
  const [{ count: tenTotal }] = await sql`SELECT COUNT(*) as count FROM tenants`;

  console.log("📊 Database totals after import:");
  console.log(`   Tenants:           ${tenTotal}`);
  console.log(`   Transactions:      ${txTotal}`);
  console.log(`   Expenses:          ${expTotal}`);
  console.log(`   Landlord payments: ${lpTotal}`);
  console.log("\n✅ Import complete!");
}

run().catch(err => { console.error("❌ Import failed:", err); process.exit(1); });
