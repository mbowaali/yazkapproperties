import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth";

// Stores file as base64 data URL in tenant_documents table
// For production, swap this with Cloudinary/S3 upload
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const doc_type = formData.get("doc_type") as string;

  if (!file || !doc_type)
    return NextResponse.json({ error: "file and doc_type required" }, { status: 400 });

  if (file.size > 5 * 1024 * 1024)
    return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });

  const buffer = await file.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");
  const dataUrl = `data:${file.type};base64,${base64}`;

  const { rows } = await sql`
    INSERT INTO tenant_documents (user_id, doc_type, file_url, file_name)
    VALUES (${session.id}, ${doc_type}, ${dataUrl}, ${file.name})
    RETURNING id, doc_type, file_name, uploaded_at
  `;

  // If it's a photo, also update users.photo_url
  if (doc_type === "photo") {
    await sql`UPDATE users SET photo_url = ${dataUrl} WHERE id = ${session.id}`;
  }

  return NextResponse.json({ data: rows[0] });
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { rows } = await sql`
    SELECT id, doc_type, file_name, uploaded_at FROM tenant_documents
    WHERE user_id = ${session.id} ORDER BY uploaded_at DESC
  `;
  return NextResponse.json({ data: rows });
}
