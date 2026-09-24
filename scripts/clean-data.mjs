/**
 * Extracts clean data from the source Excel into supabase/seed/*.json.
 * Run: node scripts/clean-data.mjs
 */
import * as XLSX from "xlsx";
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = "/Users/user/Downloads/302Valencia_TenantSystem_Advanced.xlsx";

const wb = XLSX.read(readFileSync(SRC));
const num = (v) => (Number.isFinite(Number(v)) && v !== "" && v !== undefined ? Number(v) : null);
// Excel serial → ISO date
const iso = (v) => {
  if (typeof v !== "number") return null;
  const d = new Date(Math.round((v - 25569) * 86400000));
  return isNaN(d) ? null : d.toISOString().slice(0, 10);
};
const str = (v) => (v === undefined || v === null ? null : String(v).trim() || null);

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const monthDate = (year, month) => {
  const m = MONTHS.indexOf(str(month));
  return m >= 0 && year ? `${year}-${String(m + 1).padStart(2, "0")}-01` : null;
};

// ---- Tenants (real rows only: template filler has no Status)
const tenants = XLSX.utils.sheet_to_json(wb.Sheets["TenantMaster"])
  .filter((r) => r["Status"] === "Active" || r["Status"] === "Exited")
  .map((r) => ({
    code: str(r["Tenant ID"]),
    full_name: str(r["Full Name"]),
    phone: str(r["Phone"]),
    email: str(r["Email"]),
    emergency_contact: str(r["Emergency Contact"]),
    entry_date: iso(r["Date of Entry"]),
    monthly_rent: num(r["Monthly Rent (AED)"]),
    status: str(r["Status"])?.toLowerCase() ?? null,
    space_type: str(r["Space Type"]),
  }))
  .filter((t) => t.code && t.full_name);

// ---- Payments (RentTracking: skip rows without tenant name or amount)
const payments = XLSX.utils.sheet_to_json(wb.Sheets["RentTracking"])
  .filter((r) => str(r["Tenant Name"]) && num(r["Amount Paid (AED)"]) > 0)
  .map((r) => ({
    year: num(r["Year"]),
    month: str(r["Month"]),
    tenant_name: str(r["Tenant Name"]),
    amount: num(r["Amount Paid (AED)"]),
    date: iso(r["Payment Date"]) ?? monthDate(num(r["Year"]), r["Month"]),
    method: str(r["Payment Method"]) ?? "Cash",
    status: str(r["Status"]) ?? "Paid",
  }))
  .filter((p) => p.amount > 0);

// ---- Expenses & landlord rent (category "Landlord Rent" → landlord_payments)
const allExpenses = XLSX.utils.sheet_to_json(wb.Sheets["Expenses"])
  .filter((r) => num(r["Amount (AED)"]) > 0)
  .map((r) => ({
    year: num(r["Year"]),
    month: str(r["Month"]),
    date: monthDate(num(r["Year"]), r["Month"]),
    category: str(r["Category"]) ?? "Other",
    description: str(r["Description"]),
    amount: num(r["Amount (AED)"]),
    method: str(r["Payment Method"]) ?? "Cash",
    notes: str(r["Notes"]),
  }));

const landlord_payments = allExpenses
  .filter((e) => e.category === "Landlord Rent")
  .map((e) => ({ year: e.year, month: e.month, date: e.date, amount: e.amount, method: e.method, note: e.description }));

const expenses = allExpenses.filter((e) => e.category !== "Landlord Rent");

const OUT = join(ROOT, "supabase", "seed");
mkdirSync(OUT, { recursive: true });
for (const [name, rows] of [["tenants", tenants], ["payments", payments], ["expenses", expenses], ["landlord_payments", landlord_payments]]) {
  writeFileSync(join(OUT, `${name}.json`), JSON.stringify(rows, null, 2));
  const total = rows.reduce((s, r) => s + (r.amount ?? r.monthly_rent ?? 0), 0);
  console.log(`${name}: ${rows.length} rows | total AED ${total.toLocaleString()}`);
}
