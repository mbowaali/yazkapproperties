import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const name = (formData.get("name") as string) || "";
  const bio = (formData.get("bio") as string) || "";
  // key_prefix: "admin" → saves admin_photo/admin_name/admin_bio
  //             default  → saves landlord_photo/landlord_name/landlord_bio
  const prefix = (formData.get("key_prefix") as string) === "admin" ? "admin" : "landlord";

  if (file) {
    if (file.size > 3 * 1024 * 1024)
      return NextResponse.json({ error: "File too large (max 3MB)" }, { status: 400 });
    const buf = Buffer.from(await file.arrayBuffer());
    const dataUrl = `data:${file.type};base64,${buf.toString("base64")}`;
    await sql`
      INSERT INTO app_settings (key, value, updated_at) VALUES (${prefix + "_photo"}, ${dataUrl}, NOW())
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
    `;
  }

  if (name)
    await sql`
      INSERT INTO app_settings (key, value, updated_at) VALUES (${prefix + "_name"}, ${name}, NOW())
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
    `;

  await sql`
    INSERT INTO app_settings (key, value, updated_at) VALUES (${prefix + "_bio"}, ${bio}, NOW())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
  `;

  return NextResponse.json({ ok: true });
}
