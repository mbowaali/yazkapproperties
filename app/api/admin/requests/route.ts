import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { rows } = await sql`
    SELECT r.*, u.full_name as tenant_name_from_user, u.email as tenant_email, u.unit_label
    FROM tenant_requests r
    LEFT JOIN users u ON u.id = r.user_id
    ORDER BY r.created_at DESC LIMIT 500
  `;
  return NextResponse.json({ data: rows });
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id, status, admin_reply } = await req.json();
  await sql`
    UPDATE tenant_requests SET status = ${status}, admin_reply = ${admin_reply ?? null},
      updated_at = NOW() WHERE id = ${id}
  `;
  return NextResponse.json({ ok: true });
}
