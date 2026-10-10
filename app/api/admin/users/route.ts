import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";

// Admin: list all tenant users (for approval management)
export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { rows } = await sql`
    SELECT u.id, u.email, u.full_name, u.phone, u.unit_label, u.emirates_id,
           u.employer, u.job_title, u.role, u.approved, u.created_at,
           invite.completed_at AS setup_completed_at, invite.expires_at AS invite_expires_at
    FROM users u
    LEFT JOIN LATERAL (
      SELECT completed_at, expires_at FROM tenant_setup_invites
      WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1
    ) invite ON true
    WHERE u.role = 'tenant' ORDER BY u.created_at DESC
  `;
  return NextResponse.json({ data: rows });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const fullName = String(body.full_name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const phone = String(body.phone ?? "").trim();
  const unitLabel = String(body.unit_label ?? "").trim();
  if (!fullName || fullName.length > 180 || !/^\S+@\S+\.\S+$/.test(email) || email.length > 320)
    return NextResponse.json({ error: "Enter a tenant name and valid email address" }, { status: 400 });
  if (phone.length > 40 || unitLabel.length > 120)
    return NextResponse.json({ error: "Phone or unit information is too long" }, { status: 400 });

  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const unusedPasswordHash = await bcrypt.hash(randomBytes(48).toString("base64url"), 10);
  try {
    const { rows } = await sql`
      WITH created_user AS (
        INSERT INTO users (email, password_hash, role, full_name, phone, unit_label, approved, joining_date)
        VALUES (${email}, ${unusedPasswordHash}, 'tenant', ${fullName}, ${phone || null}, ${unitLabel || null}, false, CURRENT_DATE)
        RETURNING id
      ), created_invite AS (
        INSERT INTO tenant_setup_invites (user_id, token_hash, expires_at, created_by)
        SELECT id, ${tokenHash}, NOW() + INTERVAL '7 days', ${session.id} FROM created_user
        RETURNING user_id
      )
      SELECT user_id AS id FROM created_invite
    `;
    const setupUrl = new URL(`/complete-profile?token=${encodeURIComponent(token)}`, new URL(req.url).origin).toString();
    return NextResponse.json({ id: rows[0].id, setup_url: setupUrl, expires_in_days: 7 });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505")
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    throw error;
  }
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const id = Number(body.id);
  const approved = body.approved;
  if (!Number.isInteger(id) || typeof approved !== "boolean")
    return NextResponse.json({ error: "A tenant id and approval state are required" }, { status: 400 });

  const { rows: tenants } = await sql`
    SELECT u.id,
      EXISTS (
        SELECT 1 FROM tenant_setup_invites invite
        WHERE invite.user_id = u.id AND invite.completed_at IS NOT NULL
      ) AS setup_completed,
      EXISTS (
        SELECT 1 FROM tenant_contract_signatures signature
        WHERE signature.user_id = u.id
          AND signature.version = (SELECT MAX(version) FROM tenant_contract_versions)
      ) AS rules_signed
    FROM users u WHERE u.id = ${id} AND u.role = 'tenant' LIMIT 1
  `;
  if (!tenants.length) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  if (approved && !tenants[0].rules_signed && !tenants[0].setup_completed)
    return NextResponse.json({ error: "Tenant must complete their profile and sign the latest rules before approval" }, { status: 409 });

  await sql`UPDATE users SET approved = ${approved} WHERE id = ${id} AND role = 'tenant'`;
  return NextResponse.json({ ok: true });
}
