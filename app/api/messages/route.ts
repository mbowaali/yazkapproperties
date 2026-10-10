import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin" && session.role !== "employee")
    return NextResponse.json({ error: "Internal team access required" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const channel = "team";
  const since = searchParams.get("since"); // ISO timestamp for polling
  if (since && Number.isNaN(Date.parse(since)))
    return NextResponse.json({ error: "Invalid polling timestamp" }, { status: 400 });

  let rows;
  if (since) {
    ({ rows } = await sql`
      SELECT id, sender_id, sender_name, channel, body, is_alert, created_at
      FROM messages WHERE channel = ${channel} AND created_at > ${since}
      ORDER BY created_at ASC LIMIT 100
    `);
  } else {
    ({ rows } = await sql`
      SELECT id, sender_id, sender_name, channel, body, is_alert, created_at
      FROM messages WHERE channel = ${channel}
      ORDER BY created_at DESC LIMIT 60
    `);
    rows = rows.reverse();
  }

  return NextResponse.json({ data: rows });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin" && session.role !== "employee")
    return NextResponse.json({ error: "Internal team access required" }, { status: 403 });

  const { body, is_alert = false } = await req.json();
  const message = typeof body === "string" ? body.trim() : "";
  if (!message) return NextResponse.json({ error: "Message required" }, { status: 400 });
  if (message.length > 2000) return NextResponse.json({ error: "Messages must be 2,000 characters or fewer" }, { status: 400 });

  const alert = is_alert === true && session.role === "admin";
  const channel = "team";

  const { rows } = await sql`
    INSERT INTO messages (sender_id, sender_name, channel, body, is_alert)
    VALUES (${session.id}, ${session.full_name || session.email}, ${channel}, ${message}, ${alert})
    RETURNING *
  `;
  return NextResponse.json({ data: rows[0] });
}
