import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth";

async function requireAdmin() {
  const session = await getSession();
  return session?.role === "admin" ? session : null;
}

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { rows } = await sql`
    SELECT a.id, a.user_id, a.adjustment_type, a.amount, a.currency, a.effective_date,
           a.reason, a.status, a.created_at, u.full_name AS tenant_name, u.unit_label
    FROM tenant_adjustments a JOIN users u ON u.id = a.user_id
    ORDER BY a.effective_date DESC, a.id DESC
  `;
  return NextResponse.json({ data: rows });
}

export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const userId = Number(body.user_id);
  const type = body.adjustment_type;
  const amount = Number(body.amount);
  const effectiveDate = String(body.effective_date ?? "");
  const reason = String(body.reason ?? "").trim().slice(0, 1000);
  const status = body.status ?? (type === "discount" ? "completed" : "pending");
  if (!Number.isInteger(userId) || !["refund", "discount"].includes(type) || !Number.isFinite(amount) || amount <= 0 ||
      !/^\d{4}-\d{2}-\d{2}$/.test(effectiveDate) || !reason || !["pending", "completed", "cancelled"].includes(status))
    return NextResponse.json({ error: "Check the tenant, adjustment type, amount, date, reason, and status" }, { status: 400 });

  const { rows: tenants } = await sql`SELECT id FROM users WHERE id = ${userId} AND role = 'tenant' LIMIT 1`;
  if (!tenants.length) return NextResponse.json({ error: "Tenant account not found" }, { status: 404 });

  const { rows } = await sql`
    INSERT INTO tenant_adjustments
      (user_id, adjustment_type, amount, currency, effective_date, reason, status, created_by)
    VALUES (${userId}, ${type}, ${amount}, 'AED', ${effectiveDate}, ${reason}, ${status}, ${session.id})
    RETURNING id
  `;
  return NextResponse.json({ id: rows[0].id });
}

export async function PATCH(req: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const id = Number(body.id);
  const status = body.status;
  if (!Number.isInteger(id) || !["pending", "completed", "cancelled"].includes(status))
    return NextResponse.json({ error: "Invalid adjustment status" }, { status: 400 });

  const { rows } = await sql`
    UPDATE tenant_adjustments SET status = ${status}, updated_at = NOW()
    WHERE id = ${id} RETURNING id
  `;
  if (!rows.length) return NextResponse.json({ error: "Adjustment not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}