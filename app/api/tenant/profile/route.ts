import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { rows } = await sql`
    SELECT id, email, full_name, phone, emirates_id, employer, job_title, photo_url, role, approved
    FROM users WHERE id = ${session.id} LIMIT 1
  `;
  if (!rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: rows[0] });
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { photo_url } = await req.json();
  await sql`UPDATE users SET photo_url = ${photo_url} WHERE id = ${session.id}`;
  return NextResponse.json({ ok: true });
}
