import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { ALL_PERMISSIONS } from "@/lib/permissions";

const PERMISSION_KEYS = new Set<string>(ALL_PERMISSIONS.map(permission => permission.key));

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { rows } = await sql`
    SELECT u.id, u.email, u.full_name, u.phone, u.approved, u.created_at,
      COALESCE(
        json_agg(ep.permission ORDER BY ep.permission) FILTER (WHERE ep.permission IS NOT NULL),
        '[]'
      ) AS permissions
    FROM users u
    LEFT JOIN employee_permissions ep ON ep.user_id = u.id
    WHERE u.role = 'employee'
    GROUP BY u.id ORDER BY u.created_at DESC
  `;
  return NextResponse.json({ data: rows });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { email, full_name, phone, password, permissions = [] } = await req.json();
  const normalizedEmail = String(email ?? "").trim().toLowerCase();
  const employeeName = String(full_name ?? "").trim();
  if (!/^\S+@\S+\.\S+$/.test(normalizedEmail) || !employeeName || employeeName.length > 180 || typeof password !== "string" || password.length < 8)
    return NextResponse.json({ error: "Email, name and password required" }, { status: 400 });
  if (!Array.isArray(permissions) || permissions.some((permission: string) => !PERMISSION_KEYS.has(permission)))
    return NextResponse.json({ error: "One or more permissions are invalid" }, { status: 400 });

  const hash = await bcrypt.hash(password, 10);
  let rows;
  try {
    ({ rows } = await sql`
      INSERT INTO users (email, password_hash, role, full_name, phone, approved)
      VALUES (${normalizedEmail}, ${hash}, 'employee', ${employeeName}, ${String(phone ?? "").trim() || null}, true)
      RETURNING id
    `);
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505")
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    throw error;
  }
  const userId = rows[0].id;

  for (const perm of permissions) {
    await sql`INSERT INTO employee_permissions (user_id, permission) VALUES (${userId}, ${perm}) ON CONFLICT DO NOTHING`;
  }

  return NextResponse.json({ ok: true, id: userId });
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id: requestedId, full_name, phone, approved, permissions, password } = await req.json();
  const id = Number(requestedId);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "id required" }, { status: 400 });
  if (Array.isArray(permissions) && permissions.some((permission: string) => !PERMISSION_KEYS.has(permission)))
    return NextResponse.json({ error: "One or more permissions are invalid" }, { status: 400 });
  const { rows: employees } = await sql`SELECT id FROM users WHERE id = ${id} AND role = 'employee' LIMIT 1`;
  if (!employees.length) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

  if (full_name !== undefined || phone !== undefined || approved !== undefined) {
    await sql`
      UPDATE users SET
        full_name = COALESCE(${full_name ?? null}, full_name),
        phone = COALESCE(${phone ?? null}, phone),
        approved = COALESCE(${approved ?? null}, approved)
      WHERE id = ${id} AND role = 'employee'
    `;
  }

  if (password) {
    if (typeof password !== "string" || password.length < 8)
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    const hash = await bcrypt.hash(password, 10);
    await sql`UPDATE users SET password_hash = ${hash} WHERE id = ${id} AND role = 'employee'`;
  }

  if (Array.isArray(permissions)) {
    await sql`DELETE FROM employee_permissions WHERE user_id = ${id}`;
    for (const perm of permissions) {
      await sql`INSERT INTO employee_permissions (user_id, permission) VALUES (${id}, ${perm}) ON CONFLICT DO NOTHING`;
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await req.json();
  await sql`UPDATE users SET approved = false WHERE id = ${id} AND role = 'employee'`;
  return NextResponse.json({ ok: true });
}
