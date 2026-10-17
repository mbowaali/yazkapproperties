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
    const tenantId = searchParams.get("tenantId");
    
    let queryText = `
      SELECT 
        i.id,
        i.user_id,
        u.full_name,
        u.email,
        u.phone,
        i.expires_at,
        i.completed_at,
        i.created_at,
        created_by.full_name as created_by_name
      FROM tenant_setup_invites i
      JOIN users u ON i.user_id = u.id
      LEFT JOIN users created_by ON i.created_by = created_by.id
    `;
    const values: any[] = [];

    if (tenantId) {
      queryText += ` WHERE i.user_id = $${values.length + 1}`;
      values.push(Number(tenantId));
    }

    queryText += ` ORDER BY i.created_at DESC`;
    
    const { rows } = await sql.query(queryText, values);

    // Calculate invitation statistics
    const stats = {
      total: rows.length,
      pending: rows.filter((r: any) => !r.completed_at && new Date(r.expires_at) > new Date()).length,
      expired: rows.filter((r: any) => !r.completed_at && new Date(r.expires_at) <= new Date()).length,
      completed: rows.filter((r: any) => r.completed_at).length,
    };

    return NextResponse.json({
      invites: rows,
      stats,
    });

  } catch (error) {
    console.error("Error fetching invite statuses:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}