import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { rows } = await sql`SELECT * FROM tenant_events ORDER BY event_date DESC LIMIT 200`;
  return NextResponse.json({ data: rows });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { title, body, event_date, type, active } = await req.json();
  const { rows } = await sql`
    INSERT INTO tenant_events (title, body, event_date, type, active)
    VALUES (${title}, ${body ?? null}, ${event_date ?? null}, ${type ?? "news"}, ${active ?? true})
    RETURNING *
  `;
  return NextResponse.json({ data: rows[0] });
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id, active } = await req.json();
  await sql`UPDATE tenant_events SET active = ${active} WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await req.json();
  await sql`DELETE FROM tenant_events WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
