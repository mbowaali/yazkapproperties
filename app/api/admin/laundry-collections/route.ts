import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth";

async function requireAdmin() {
  const session = await getSession();
  return session?.role === "admin" ? session : null;
}

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { rows } = await sql`
    SELECT id, collection_month, coin_count, total_amount, collected_by, notes
    FROM laundry_collections ORDER BY collection_month DESC
  `;
  return NextResponse.json({ data: rows });
}

export async function POST(req: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const month = String(body.month ?? "");
  const coinCount = Number(body.coin_count);
  const collectedBy = String(body.collected_by ?? "").trim().slice(0, 160) || null;
  const notes = String(body.notes ?? "").trim().slice(0, 2000) || null;
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || !Number.isInteger(coinCount) || coinCount < 0)
    return NextResponse.json({ error: "Choose a valid month and enter a whole-number coin count of zero or more" }, { status: 400 });

  const { rows } = await sql`
    INSERT INTO laundry_collections (collection_month, coin_count, collected_by, notes)
    VALUES (${`${month}-01`}, ${coinCount}, ${collectedBy}, ${notes})
    ON CONFLICT (collection_month) DO UPDATE SET
      coin_count = EXCLUDED.coin_count,
      collected_by = EXCLUDED.collected_by,
      notes = EXCLUDED.notes,
      updated_at = NOW()
    RETURNING id, collection_month, coin_count, total_amount, collected_by, notes
  `;
  return NextResponse.json({ data: rows[0] });
}