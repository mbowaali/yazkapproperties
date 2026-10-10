import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { rows } = await sql`SELECT key, value FROM app_settings`;
  const settings: Record<string, string> = {};
  for (const r of rows) settings[r.key] = r.value;

  if (session.role === "tenant") {
    return NextResponse.json({ data: {
      admin_name: "Yazid Ntulume",
      admin_photo: settings.admin_photo ?? "",
      admin_bio: settings.admin_bio ?? "",
    } });
  }
  if (session.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json({ data: settings });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  for (const [key, value] of Object.entries(body)) {
    await sql`
      INSERT INTO app_settings (key, value, updated_at)
      VALUES (${key}, ${value as string}, NOW())
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
    `;
  }
  return NextResponse.json({ ok: true });
}
