import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth";

// Allowed tables and their tenant-visible columns (null = admin only)
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
};

function isValidIdentifier(s: string) {
  return /^[a-z_][a-z0-9_]*$/.test(s);
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
  const eqField = searchParams.get("eqField");
  const eqValue = searchParams.get("eqValue");

  if (!table || !ALLOWED_TABLES[table])
    return NextResponse.json({ error: "Invalid table" }, { status: 400 });

  const access = ALLOWED_TABLES[table];
  if (access === "admin" && session.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!isValidIdentifier(table))
    return NextResponse.json({ error: "Invalid table name" }, { status: 400 });

  // Build safe query — we can't use parameterized identifiers with @vercel/postgres
  // so we validate all identifiers strictly above
  let query = `SELECT ${select === "*" ? "*" : select.split(",").filter(c => isValidIdentifier(c.trim())).join(",")} FROM ${table}`;
  const values: any[] = [];

  if (eqField && eqValue && isValidIdentifier(eqField)) {
    // tenant filtering: tenants only see their own data
    if (session.role === "tenant" && table === "transactions") {
      query += ` WHERE tenancy_id IN (SELECT id FROM tenancies WHERE tenant_id = $1)`;
      values.push(session.id);
    } else if (session.role === "tenant" && table === "invoices") {
      query += ` WHERE tenancy_id IN (SELECT id FROM tenancies WHERE tenant_id = $1)`;
      values.push(session.id);
    } else if (session.role === "tenant" && table === "tenancies") {
      query += ` WHERE tenant_id = $1`;
      values.push(session.id);
    } else {
      values.push(eqValue);
      query += ` WHERE ${eqField} = $${values.length}`;
    }
  } else if (session.role === "tenant") {
    if (table === "transactions") {
      query += ` WHERE tenancy_id IN (SELECT id FROM tenancies WHERE tenant_id = $1)`;
      values.push(session.id);
    } else if (table === "invoices") {
      query += ` WHERE tenancy_id IN (SELECT id FROM tenancies WHERE tenant_id = $1)`;
      values.push(session.id);
    } else if (table === "tenancies") {
      query += ` WHERE tenant_id = $1`;
      values.push(session.id);
    } else if (table === "announcements") {
      query += ` WHERE active = true`;
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
  if (!session || session.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { table, payload } = await req.json();
  if (!table || !ALLOWED_TABLES[table] || !isValidIdentifier(table))
    return NextResponse.json({ error: "Invalid table" }, { status: 400 });

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
  if (!session || session.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { table, id, payload } = await req.json();
  if (!table || !ALLOWED_TABLES[table] || !isValidIdentifier(table))
    return NextResponse.json({ error: "Invalid table" }, { status: 400 });

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
