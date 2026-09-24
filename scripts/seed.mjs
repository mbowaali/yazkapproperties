/**
 * Uploads supabase/seed/*.json into your Supabase project.
 *
 * 1. Paste your real keys into .env.local (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)
 * 2. Run the schema first: supabase/schema.sql (Dashboard → SQL Editor)
 * 3. Then: node scripts/seed.mjs           (refuses to duplicate non-empty tables)
 *       or node scripts/seed.mjs --force   (wipes & re-seeds data tables)
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const force = process.argv.includes("--force");

// --- parse .env.local (no dotenv dependency needed)
const env = Object.fromEntries(
  readFileSync(join(ROOT, ".env.local"), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
);

const URL = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY || URL.includes("your-project-url") || KEY.includes("your-service-role-key")) {
  console.error("✗ Real Supabase credentials not found in .env.local");
  console.error("  Fill in SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY,");
  console.error("  run supabase/schema.sql in the SQL Editor, then retry this script.");
  process.exit(1);
}

const supabase = createClient(URL, KEY, { auth: { persistSession: false } });

const TABLES = [
  { file: "tenants.json", table: "tenants", unique: "code" },
  { file: "payments.json", table: "transactions", unique: null,
    // transactions has no year/month columns — `date` carries that; the DB
    // defaults fill in type ('rent') and currency ('AED')
    map: ({ year, month, ...tx }) => tx },
  { file: "expenses.json", table: "expenses", unique: null },
  { file: "landlord_payments.json", table: "landlord_payments", unique: null },
];

const CHUNK = 400;

for (const { file, table, unique, map } of TABLES) {
  const rows = (map ? JSON.parse(readFileSync(join(ROOT, "supabase", "seed", file), "utf8")).map(map) : JSON.parse(readFileSync(join(ROOT, "supabase", "seed", file), "utf8")));
  const { count, error: countErr } = await supabase.from(table).select("*", { count: "exact", head: true });
  if (countErr) { console.error(`✗ ${table}: ${countErr.message} — did you run supabase/schema.sql?`); process.exit(1); }

  if (count > 0) {
    if (!force && !unique) {
      console.log(`↷ ${table}: already has ${count} rows — skipped (use --force to wipe & re-seed)`);
      continue;
    }
    if (force) { await supabase.from(table).delete().neq("id", 0); console.log(`  wiped ${table} (${count} rows)`); }
  }

  let done = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    let q = supabase.from(table);
    q = unique ? q.upsert(rows.slice(i, i + CHUNK), { onConflict: unique }) : q.insert(rows.slice(i, i + CHUNK));
    const { error } = await q;
    if (error) { console.error(`✗ ${table}: ${error.message}`); process.exit(1); }
    done = Math.min(i + CHUNK, rows.length);
    process.stdout.write(`  ${table}: ${done}/${rows.length}\r`);
  }
  console.log(`✓ ${table}: ${rows.length} rows uploaded`);
}

console.log("\n🎉 Seed complete.");

// ---------- Owner admin account ----------
const ADMIN_EMAIL = env.ADMIN_EMAIL;
const ADMIN_PASSWORD = env.ADMIN_PASSWORD;
if (ADMIN_EMAIL && ADMIN_PASSWORD) {
  let adminId = null;
  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: "Yazid Ntulume" },
  });
  if (created?.user?.id) {
    adminId = created.user.id;
    console.log(`✓ admin auth user created: ${ADMIN_EMAIL}`);
  } else if (createErr?.message?.toLowerCase().includes("already")) {
    console.log(`↷ admin auth user already exists: ${ADMIN_EMAIL}`);
  } else if (createErr) {
    console.error(`✗ could not create admin user: ${createErr.message}`);
  }

  if (!adminId) {
    // Existing user: find the id so the profile can still be promoted
    const { data: listed } = await supabase.auth.admin.listUsers({ page: 1, perPage: 500 });
    adminId = listed?.users?.find((u) => u.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase())?.id ?? null;
  }

  if (adminId) {
    const { error: profErr } = await supabase.from("profiles").upsert({
      id: adminId, email: ADMIN_EMAIL, full_name: "Yazid Ntulume", phone: "+97150512276",
      role: "admin", approved: true,
    });
    if (profErr) console.error(`✗ admin profile: ${profErr.message}`);
    else console.log(`✓ admin profile ready (role=admin, approved)`);
  }
} else {
  console.log("ℹ No ADMIN_EMAIL/ADMIN_PASSWORD in .env.local — skipped admin creation.");
}
