import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const name = (formData.get("name") as string) || "Landlord";
  const bio = (formData.get("bio") as string) || "";

  if (file) {
    if (file.size > 3 * 1024 * 1024)
      return NextResponse.json({ error: "File too large (max 3MB)" }, { status: 400 });
    const buf = Buffer.from(await file.arrayBuffer());
    const dataUrl = `data:${file.type};base64,${buf.toString("base64")}`;
    await sql`INSERT INTO app_settings (key, value, updated_at) VALUES ('landlord_photo', ${dataUrl}, NOW()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`;
  }

  if (name)
    await sql`INSERT INTO app_settings (key, value, updated_at) VALUES ('landlord_name', ${name}, NOW()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`;
  if (bio !== undefined)
    await sql`INSERT INTO app_settings (key, value, updated_at) VALUES ('landlord_bio', ${bio}, NOW()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`;

  return NextResponse.json({ ok: true });
}
