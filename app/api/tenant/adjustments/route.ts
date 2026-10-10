import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "tenant")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { rows } = await sql`
    SELECT id, adjustment_type, amount, currency, effective_date, reason, status
    FROM tenant_adjustments WHERE user_id = ${session.id}
    ORDER BY effective_date DESC, id DESC
  `;
  return NextResponse.json({ data: rows });
}