import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth";

// Admin: list all receipts or approve/reject
export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { rows } = await sql`
    SELECT r.*, u.email as tenant_email
    FROM receipts r
    LEFT JOIN users u ON u.id = r.user_id
    ORDER BY r.created_at DESC LIMIT 500
  `;
  return NextResponse.json({ data: rows });
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id, status } = await req.json();
  if (!["approved", "rejected", "pending"].includes(status))
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });

  await sql`
    UPDATE receipts SET status = ${status},
      approved_by = ${status === "approved" ? session.id : null},
      approved_at = ${status === "approved" ? new Date().toISOString() : null}
    WHERE id = ${id}
  `;
  return NextResponse.json({ ok: true });
}
