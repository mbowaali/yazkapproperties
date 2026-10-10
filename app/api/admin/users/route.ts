import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth";

// Admin: list all tenant users (for approval management)
export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { rows } = await sql`
    SELECT id, email, full_name, phone, unit_label, emirates_id, employer, job_title, role, approved, created_at
    FROM users WHERE role = 'tenant' ORDER BY created_at DESC
  `;
  return NextResponse.json({ data: rows });
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id, approved } = await req.json();
  await sql`UPDATE users SET approved = ${approved} WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
