import { sql } from "@/lib/db";
import { NextResponse } from "next/server";
import { checkSession, checkAdmin } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await checkSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await checkAdmin(session);

  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim();

    if (q) {
      const { rows } = await sql.query(
        `SELECT id, full_name, email, phone, status
         FROM tenants
         WHERE full_name ILIKE $1 OR email ILIKE $1 OR phone ILIKE $1
         ORDER BY full_name
         LIMIT 20`,
        [`%${q}%`]
      );
      return NextResponse.json({ tenants: rows });
    }

    // No query: return all existing tenants so the admin can browse and select
    const { rows } = await sql.query(
      `SELECT id, full_name, email, phone, status
       FROM tenants
       ORDER BY full_name
       LIMIT 100`
    );
    return NextResponse.json({ tenants: rows });
  } catch (error) {
    console.error("Error searching tenants:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
