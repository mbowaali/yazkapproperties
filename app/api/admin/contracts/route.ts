import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { rows } = await sql`
    SELECT version, title, body, published_at
    FROM tenant_contract_versions ORDER BY version DESC LIMIT 50
  `;
  return NextResponse.json({ versions: rows });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const title = String(body.title ?? "").trim();
  const text = String(body.body ?? "").trim();
  if (!title || !text || title.length > 180 || text.length > 40000)
    return NextResponse.json({ error: "Add a title and rules (maximum 40,000 characters)" }, { status: 400 });

  const { rows } = await sql`
    INSERT INTO tenant_contract_versions (title, body, published_by)
    VALUES (${title}, ${text}, ${session.id})
    RETURNING version, title, body, published_at
  `;
  return NextResponse.json({ agreement: rows[0] });
}