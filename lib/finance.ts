// Yazkap Properties — finance calculations
// Pure functions: no Supabase, no React — easy to verify and reuse.
// Date handling uses string slicing (see the timezone note in AdminTable).

export type Tx = { date: string | null; amount: number; tenant_name: string | null; method?: string | null; status?: string | null };
export type Deposit = { tenant_name: string; amount: number; status: string; held_since?: string | null };
export type Tenant = { code: string; full_name: string; monthly_rent: number | null; entry_date: string | null; status: string | null; space_type?: string | null };
export type Invoice = { invoice_no: string; total: number; due_date: string | null; status: string };

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export const yearOf = (d: string | null | undefined) =>
  d && /^\d{4}-\d{2}-\d{2}/.test(d) ? Number(d.slice(0, 4)) : null;
export const monthOf = (d: string | null | undefined) =>
  d && /^\d{4}-\d{2}-\d{2}/.test(d) ? Number(d.slice(5, 7)) - 1 : null;

/** Months of a year a tenant is expected to pay rent, given entry date and status. */
export function monthsOccupied(tenant: Tenant, year: number): boolean[] {
  const active = tenant.status !== "exited";
  const entry = tenant.entry_date ? new Date(tenant.entry_date + "T00:00:00Z") : null;
  const entryYear = entry && !isNaN(entry.getTime()) ? entry.getUTCFullYear() : null;
  const entryMonth = entry && !isNaN(entry.getTime()) ? entry.getUTCMonth() : 0;
  return MONTHS.map((_, m) => {
    if (!active && entryYear !== null && year > entryYear) return false; // exited long ago
    if (entryYear !== null && year < entryYear) return false;
    if (entryYear === year && m < entryMonth) return false;
    return true;
  });
}

export interface MonthlyLine {
  month: string;
  expected: number;
  collected: number;
  variance: number;
}

export interface TenantStatement {
  tenant: Tenant;
  year: number;
  monthly: MonthlyLine[];
  expectedTotal: number;
  collectedTotal: number;
  balance: number; // > 0 arrears, < 0 credit
  deposits: Deposit[];
  depositHeld: number;
  payments: Tx[];
  invoices: Invoice[];
  invoiceDue: number;
}

/** Build a full-year statement for one tenant from raw rows. */
export function buildStatement(
  tenant: Tenant,
  year: number,
  allTx: Tx[],
  allDeposits: Deposit[],
  allInvoices: Invoice[]
): TenantStatement {
  const name = tenant.full_name.toLowerCase().trim();
  const payments = allTx
    .filter((t) => (t.tenant_name ?? "").toLowerCase().trim() === name)
    .filter((t) => yearOf(t.date) === year)
    .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
  const deposits = allDeposits.filter((d) => (d.tenant_name ?? "").toLowerCase().trim() === name);
  const invoices = allInvoices.filter((i) => (i as any).tenant_name === undefined).filter(() => false); // invoices link via tenancy; kept out unless joined upstream

  const occ = monthsOccupied(tenant, year);
  const rent = Number(tenant.monthly_rent ?? 0);

  const monthly: MonthlyLine[] = MONTHS.map((m, i) => {
    const expected = occ[i] ? rent : 0;
    const collected = payments
      .filter((p) => monthOf(p.date) === i)
      .reduce((s, p) => s + Number(p.amount), 0);
    return { month: m, expected, collected, variance: collected - expected };
  });

  const expectedTotal = monthly.reduce((s, r) => s + r.expected, 0);
  const collectedTotal = monthly.reduce((s, r) => s + r.collected, 0);

  return {
    tenant, year, monthly,
    expectedTotal, collectedTotal,
    balance: collectedTotal - expectedTotal,
    deposits,
    depositHeld: deposits.filter((d) => d.status === "held").reduce((s, d) => s + Number(d.amount), 0),
    payments,
    invoices,
    invoiceDue: 0,
  };
}

export interface ArrearsRow {
  code: string;
  tenant: string;
  monthlyRent: number;
  expected: number;
  collected: number;
  balance: number;
  status: string;
}

/** Rent roll + arrears for every tenant in the roster, one year. */
export function rentRoll(tenants: Tenant[], year: number, allTx: Tx[]): {
  rows: ArrearsRow[];
  expectedTotal: number;
  collectedTotal: number;
  arrearsTotal: number;
} {
  const rows: ArrearsRow[] = tenants.map((t) => {
    const occ = monthsOccupied(t, year);
    const rent = Number(t.monthly_rent ?? 0);
    const expected = occ.reduce((s, on) => s + (on ? rent : 0), 0);
    const name = t.full_name.toLowerCase().trim();
    const collected = allTx
      .filter((x) => (x.tenant_name ?? "").toLowerCase().trim() === name)
      .filter((x) => yearOf(x.date) === year)
      .reduce((s, x) => s + Number(x.amount), 0);
    return {
      code: t.code,
      tenant: t.full_name,
      monthlyRent: rent,
      expected,
      collected,
      balance: collected - expected,
      status: t.status ?? "active",
    };
  });
  return {
    rows: rows.sort((a, b) => a.balance - b.balance),
    expectedTotal: rows.reduce((s, r) => s + r.expected, 0),
    collectedTotal: rows.reduce((s, r) => s + r.collected, 0),
    arrearsTotal: rows.reduce((s, r) => s + Math.max(0, -r.balance), 0),
  };
}

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function threeDigits(n: number): string {
  const parts: string[] = [];
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  if (hundreds) parts.push(ONES[hundreds] + " Hundred");
  if (rest < 20) { if (rest) parts.push(ONES[rest]); }
  else parts.push(TENS[Math.floor(rest / 10)] + (rest % 10 ? "-" + ONES[rest % 10] : ""));
  return parts.join(" ");
}

/** "AED Two Thousand Three Hundred and Fifty Only" — for invoices/statements. */
export function amountInWords(amount: number, currency = "AED"): string {
  const n = Math.round(Math.abs(Number(amount) || 0));
  if (n === 0) return `${currency} Zero Only`;
  const groups: [number, string][] = [[1_000_000_000, "Billion"], [1_000_000, "Million"], [1_000, "Thousand"]];
  const words: string[] = [];
  let rest = n;
  for (const [value, label] of groups) {
    if (rest >= value) {
      words.push(threeDigits(Math.floor(rest / value)) + " " + label);
      rest %= value;
    }
  }
  if (rest) words.push(threeDigits(rest));
  return `${currency} ${words.join(" ")} Only`;
}
