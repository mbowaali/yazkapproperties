import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { amount, payment_date, payment_method, description } = await req.json();
  if (!amount || !payment_date)
    return NextResponse.json({ error: "Amount and date required" }, { status: 400 });

  const { rows: userRows } = await sql`SELECT full_name, unit_label FROM users WHERE id = ${session.id}`;
  const user = userRows[0];
  const receipt_no = `RCP-${Date.now().toString().slice(-8)}`;

  const { rows } = await sql`
    INSERT INTO receipts (receipt_no, user_id, tenant_name, unit_label, amount, currency, payment_date, payment_method, description, status)
    VALUES (${receipt_no}, ${session.id}, ${user?.full_name ?? "Tenant"}, ${user?.unit_label ?? null},
            ${Number(amount)}, 'AED', ${payment_date}, ${payment_method ?? "Cash"}, ${description ?? "Rent Payment"}, 'pending')
    RETURNING *
  `;
  return NextResponse.json({ data: rows[0] });
}
