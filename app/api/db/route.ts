import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth";

const ALLOWED_TABLES: Record<string, "admin" | "tenant"> = {
  tenants: "admin",
  units: "tenant",
  profiles: "admin",
  tenancies: "tenant",
  transactions: "tenant",
  invoices: "tenant",
  announcements: "tenant",
  expenses: "admin",
  landlord_payments: "admin",
  maintenance_requests: "admin",
  assets: "admin",
  consumables: "admin",
  deposits: "admin",
  bank_accounts: "admin",
  users: "admin",
  laundry_usage: "admin",
  tenant_requests: "tenant",
  tenant_events: "tenant",
  receipts: "tenant",
  tenant_documents: "tenant",
};

// Tables tenants can write to (their own rows only)
const TENANT_WRITABLE = ["tenant_requests", "tenant_documents"];

function isValidIdentifier(s: string) {
  return /^[a-z_][a-z0-9_]*$/.test(s);
}

function addTenantFilter(table: string, userId: number): { clause: string; value: number | null } {
  const map: Record<string, string> = {
    transactions: "tenancy_id IN (SELECT id FROM tenancies WHERE tenant_id = $1)",
    invoices: "tenancy_id IN (SELECT id FROM tenancies WHERE tenant_id = $1)",
    tenancies: "tenant_id = $1",
    announcements: "active = true",
    tenant_events: "active = true",
    tenant_requests: "user_id = $1",
    receipts: "user_id = $1",
    tenant_documents: "user_id = $1",
  };
  const clause = map[table] ?? "";
  const needsId = clause.includes("$1");
  return { clause, value: needsId ? userId : null };
}

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const table = searchParams.get("table");
  const select = searchParams.get("select") || "*";
  const orderBy = searchParams.get("orderBy");
  const orderAsc = searchParams.get("orderAsc") === "true";
  const limit = Math.min(Number(searchParams.get("limit") || 2000), 5000);

  if (!table || !ALLOWED_TABLES[table] || !isValidIdentifier(table))
    return NextResponse.json({ error: "Invalid table" }, { status: 400 });

  if (ALLOWED_TABLES[table] === "admin" && session.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const safeCols = select === "*" ? "*" : select.split(",").filter(c => isValidIdentifier(c.trim())).join(",");
  let query = `SELECT ${safeCols} FROM ${table}`;
  const values: any[] = [];

  if (session.role === "tenant") {
    const { clause, value } = addTenantFilter(table, session.id);
    if (clause) {
      query += ` WHERE ${clause}`;
      if (value !== null) values.push(value);
    }
  }

  if (orderBy && isValidIdentifier(orderBy))
    query += ` ORDER BY ${orderBy} ${orderAsc ? "ASC" : "DESC"}`;

  query += ` LIMIT ${limit}`;

  const result = await sql.query(query, values);
  return NextResponse.json({ data: result.rows, error: null });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { table, payload } = await req.json();
  if (!table || !ALLOWED_TABLES[table] || !isValidIdentifier(table))
    return NextResponse.json({ error: "Invalid table" }, { status: 400 });

  // Tenants can only write to TENANT_WRITABLE tables, and only for themselves
  if (session.role !== "admin") {
    if (!TENANT_WRITABLE.includes(table))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    payload.user_id = session.id; // force own user_id
  }

  const keys = Object.keys(payload).filter(isValidIdentifier);
  const values = keys.map((k) => payload[k]);
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");

  const result = await sql.query(
    `INSERT INTO ${table} (${keys.join(", ")}) VALUES (${placeholders}) RETURNING *`,
    values
  );
  return NextResponse.json({ data: result.rows[0], error: null });
}

export async function PUT(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { table, id, payload } = await req.json();
  if (!table || !ALLOWED_TABLES[table] || !isValidIdentifier(table))
    return NextResponse.json({ error: "Invalid table" }, { status: 400 });

  if (session.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const keys = Object.keys(payload).filter(isValidIdentifier);
  const values = keys.map((k) => payload[k]);
  const sets = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");
  values.push(id);

  const result = await sql.query(
    `UPDATE ${table} SET ${sets} WHERE id = $${values.length} RETURNING *`,
    values
  );
  return NextResponse.json({ data: result.rows[0], error: null });
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { table, id } = await req.json();
  if (!table || !ALLOWED_TABLES[table] || !isValidIdentifier(table))
    return NextResponse.json({ error: "Invalid table" }, { status: 400 });

  await sql.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
  return NextResponse.json({ error: null });
}
