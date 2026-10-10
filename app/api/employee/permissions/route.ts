import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { ALL_PERMISSIONS } from "@/lib/permissions";

export async function GET() {
  const session = await getSession();
  if (!session || (session.role !== "employee" && session.role !== "admin"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (session.role === "admin")
    return NextResponse.json({ data: ALL_PERMISSIONS.map(permission => permission.key) });

  const { rows: employees } = await sql`SELECT approved FROM users WHERE id = ${session.id} AND role = 'employee' LIMIT 1`;
  if (!employees.length || !employees[0].approved)
    return NextResponse.json({ error: "Employee account is inactive" }, { status: 403 });

  const { rows } = await sql`SELECT permission FROM employee_permissions WHERE user_id = ${session.id} ORDER BY permission`;
  return NextResponse.json({ data: rows.map(row => row.permission) });
}