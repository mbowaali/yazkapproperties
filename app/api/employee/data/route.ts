import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { employeeCanReadTable, employeeCanWriteTable } from "@/lib/permissions";

const TABLES: Record<string, { columns: string[]; insert: string[]; update: string[]; orderBy: string }> = {
  transactions: { columns: ["id", "date", "tenant_name", "amount", "currency", "type", "method", "status", "note"], insert: ["date", "tenant_name", "amount", "currency", "type", "method", "status", "note"], update: ["date", "tenant_name", "amount", "currency", "type", "method", "status", "note"], orderBy: "date" },
  expenses: { columns: ["id", "date", "year", "month", "category", "description", "amount", "method", "receipt_no", "notes"], insert: ["date", "year", "month", "category", "description", "amount", "method", "receipt_no", "notes"], update: ["date", "year", "month", "category", "description", "amount", "method", "receipt_no", "notes"], orderBy: "date" },
  invoices: { columns: ["id", "invoice_no", "total", "due_date", "status", "pdf_url"], insert: ["invoice_no", "total", "due_date", "status", "pdf_url"], update: ["total", "due_date", "status", "pdf_url"], orderBy: "due_date" },
  tenants: { columns: ["id", "code", "full_name", "phone", "email", "entry_date", "monthly_rent", "status", "space_type", "photo_url"], insert: ["code", "full_name", "phone", "email", "entry_date", "monthly_rent", "status", "space_type", "photo_url"], update: ["full_name", "phone", "email", "entry_date", "monthly_rent", "status", "space_type", "photo_url"], orderBy: "full_name" },
  units: { columns: ["id", "label", "type", "rent", "currency", "status", "advertised", "notes"], insert: ["label", "type", "rent", "currency", "status", "advertised", "notes"], update: ["label", "type", "rent", "currency", "status", "advertised", "notes"], orderBy: "label" },
  maintenance_requests: { columns: ["id", "unit_label", "tenant_name", "issue", "priority", "status", "reported_date", "resolved_date", "notes"], insert: ["unit_label", "tenant_name", "issue", "priority", "status", "reported_date", "notes"], update: ["status", "resolved_date", "notes"], orderBy: "reported_date" },
  tenant_requests: { columns: ["id", "user_id", "type", "subject", "message", "status", "admin_reply", "created_at", "updated_at"], insert: [], update: ["status", "admin_reply"], orderBy: "created_at" },
  receipts: { columns: ["id", "tenant_name", "unit_label", "amount", "currency", "payment_date", "payment_method", "description", "status", "receipt_no", "created_at"], insert: [], update: ["status"], orderBy: "created_at" },
  announcements: { columns: ["id", "title", "body", "active", "created_at"], insert: ["title", "body", "active"], update: ["title", "body", "active"], orderBy: "created_at" },
  tenant_events: { columns: ["id", "title", "body", "event_date", "type", "active", "created_at"], insert: ["title", "body", "event_date", "type", "active"], update: ["title", "body", "event_date", "type", "active"], orderBy: "event_date" },
  deposits: { columns: ["id", "tenant_name", "unit_label", "amount", "currency", "status", "held_since", "refund_date", "notes"], insert: [], update: [], orderBy: "held_since" },
  assets: { columns: ["id", "name", "category", "location", "purchase_date", "value", "condition", "notes"], insert: ["name", "category", "location", "purchase_date", "value", "condition", "notes"], update: ["name", "category", "location", "purchase_date", "value", "condition", "notes"], orderBy: "purchase_date" },
  laundry_collections: { columns: ["id", "collection_month", "coin_count", "total_amount", "collected_by", "notes"], insert: ["collection_month", "coin_count", "collected_by", "notes"], update: ["coin_count", "collected_by", "notes"], orderBy: "collection_month" },
  landlord_payments: { columns: ["id", "date", "year", "month", "amount", "method", "note"], insert: [], update: [], orderBy: "date" },
};

async function authorizedTable(table: string, action: "read" | "write") {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "employee")) return { session: null, config: null };
  if (session.role === "employee") {
    const { rows } = await sql`SELECT approved FROM users WHERE id = ${session.id} AND role = 'employee' LIMIT 1`;
    if (!rows.length || !rows[0].approved) return { session: null, config: null };
    const { rows: grants } = await sql`SELECT permission FROM employee_permissions WHERE user_id = ${session.id}`;
    const permissions = grants.map(row => String(row.permission));
    if (action === "read" ? !employeeCanReadTable(table, permissions) : !employeeCanWriteTable(table, permissions))
      return { session: null, config: null };
  }
  return { session, config: TABLES[table] ?? null };
}

export async function GET(req: Request) {
  const table = new URL(req.url).searchParams.get("table") ?? "";
  const auth = await authorizedTable(table, "read");
  if (!auth.session) return NextResponse.json({ error: "Permission denied" }, { status: 403 });
  if (!auth.config) return NextResponse.json({ error: "Table is not available in the employee portal" }, { status: 404 });

  const columns = auth.config.columns.join(", ");
  const result = await sql.query(`SELECT ${columns} FROM ${table} ORDER BY ${auth.config.orderBy} DESC LIMIT 2000`);
  return NextResponse.json({ data: result.rows });
}

export async function POST(req: Request) {
  const { table, payload } = await req.json();
  const auth = await authorizedTable(String(table ?? ""), "write");
  if (!auth.session) return NextResponse.json({ error: "Permission denied" }, { status: 403 });
  if (!auth.config || !auth.config.insert.length) return NextResponse.json({ error: "Create is not allowed for this module" }, { status: 403 });

  const entries = Object.entries(payload ?? {}).filter(([key, value]) => auth.config!.insert.includes(key) && value !== undefined);
  if (!entries.length) return NextResponse.json({ error: "No editable fields provided" }, { status: 400 });
  if (table === "laundry_collections") {
    const month = String(payload.collection_month ?? "");
    const count = Number(payload.coin_count);
    if (!/^\d{4}-\d{2}-01$/.test(month) || !Number.isInteger(count) || count < 0)
      return NextResponse.json({ error: "Choose a month and enter a whole-number coin count" }, { status: 400 });
    const { rows } = await sql`
      INSERT INTO laundry_collections (collection_month, coin_count, collected_by, notes)
      VALUES (${month}, ${count}, ${payload.collected_by ?? null}, ${payload.notes ?? null})
      ON CONFLICT (collection_month) DO UPDATE SET
        coin_count = EXCLUDED.coin_count, collected_by = EXCLUDED.collected_by,
        notes = EXCLUDED.notes, updated_at = NOW()
      RETURNING id, collection_month, coin_count, total_amount, collected_by, notes
    `;
    return NextResponse.json({ data: rows[0] });
  }
  const keys = entries.map(([key]) => key);
  const values = entries.map(([, value]) => value);
  const placeholders = keys.map((_, index) => `$${index + 1}`).join(", ");
  const { rows } = await sql.query(`INSERT INTO ${table} (${keys.join(", ")}) VALUES (${placeholders}) RETURNING *`, values);
  return NextResponse.json({ data: rows[0] });
}

export async function PUT(req: Request) {
  const { table, id, payload } = await req.json();
  const auth = await authorizedTable(String(table ?? ""), "write");
  if (!auth.session) return NextResponse.json({ error: "Permission denied" }, { status: 403 });
  if (!auth.config || !auth.config.update.length) return NextResponse.json({ error: "Edit is not allowed for this module" }, { status: 403 });
  const rowId = Number(id);
  if (!Number.isInteger(rowId)) return NextResponse.json({ error: "A valid record id is required" }, { status: 400 });

  if (table === "receipts") {
    const status = payload?.status;
    if (status !== "approved" && status !== "rejected") return NextResponse.json({ error: "Choose approved or rejected" }, { status: 400 });
    const { rows } = await sql`
      UPDATE receipts SET status = ${status}, approved_by = ${auth.session.id}, approved_at = NOW()
      WHERE id = ${rowId} RETURNING id, status
    `;
    if (!rows.length) return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
    return NextResponse.json({ data: rows[0] });
  }

  const entries = Object.entries(payload ?? {}).filter(([key, value]) => auth.config!.update.includes(key) && value !== undefined);
  if (!entries.length) return NextResponse.json({ error: "No editable fields provided" }, { status: 400 });
  const keys = entries.map(([key]) => key);
  const values = entries.map(([, value]) => value);
  const setters = keys.map((key, index) => `${key} = $${index + 1}`).join(", ");
  values.push(rowId);
  const { rows } = await sql.query(`UPDATE ${table} SET ${setters} WHERE id = $${values.length} RETURNING *`, values);
  if (!rows.length) return NextResponse.json({ error: "Record not found" }, { status: 404 });
  return NextResponse.json({ data: rows[0] });
}