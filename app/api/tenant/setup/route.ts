import { createHash } from "crypto";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { sql } from "@/lib/db";

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function validDate(value: unknown) {
  return value == null || value === "" || (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  if (!/^[A-Za-z0-9_-]{40,50}$/.test(token))
    return NextResponse.json({ error: "This setup link is invalid or expired" }, { status: 404 });

  const { rows } = await sql`
    SELECT u.full_name, u.email, u.phone, u.unit_label,
           agreement.version, agreement.title, agreement.body
    FROM tenant_setup_invites invite
    JOIN users u ON u.id = invite.user_id AND u.role = 'tenant'
    CROSS JOIN LATERAL (
      SELECT version, title, body FROM tenant_contract_versions
      ORDER BY version DESC LIMIT 1
    ) agreement
    WHERE invite.token_hash = ${tokenHash(token)}
      AND invite.completed_at IS NULL AND invite.expires_at > NOW()
    LIMIT 1
  `;
  if (!rows.length) return NextResponse.json({ error: "This setup link is invalid, expired, or already used" }, { status: 404 });
  return NextResponse.json({ data: rows[0] });
}

export async function POST(req: Request) {
  const body = await req.json();
  const token = String(body.token ?? "");
  const fullName = String(body.full_name ?? "").trim();
  const signatureName = String(body.signature_name ?? "").trim();
  const password = String(body.password ?? "");
  const email = String(body.email ?? "").trim().toLowerCase();
  const phone = String(body.phone ?? "").trim();
  const version = Number(body.accepted_contract_version);
  const accepted = body.accepted === true;

  if (!/^[A-Za-z0-9_-]{40,50}$/.test(token))
    return NextResponse.json({ error: "This setup link is invalid or expired" }, { status: 404 });
  if (!fullName || fullName.length > 180 || !/^\S+@\S+\.\S+$/.test(email) || !phone || phone.length > 40)
    return NextResponse.json({ error: "Enter your full name, valid email, and phone number" }, { status: 400 });
  if (password.length < 8 || password.length > 200)
    return NextResponse.json({ error: "Choose a password between 8 and 200 characters" }, { status: 400 });
  if (!accepted || !Number.isInteger(version) || signatureName.toLocaleLowerCase() !== fullName.toLocaleLowerCase())
    return NextResponse.json({ error: "Review the latest tenant rules and sign with your full name" }, { status: 400 });
  if (!validDate(body.date_of_birth) || !validDate(body.passport_expiry))
    return NextResponse.json({ error: "Enter valid dates for date of birth and passport expiry" }, { status: 400 });

  const hashedToken = tokenHash(token);
  const { rows: inviteRows } = await sql`
    SELECT invite.user_id, agreement.version
    FROM tenant_setup_invites invite
    JOIN users u ON u.id = invite.user_id AND u.role = 'tenant'
    CROSS JOIN LATERAL (SELECT version FROM tenant_contract_versions ORDER BY version DESC LIMIT 1) agreement
    WHERE invite.token_hash = ${hashedToken}
      AND invite.completed_at IS NULL AND invite.expires_at > NOW()
    LIMIT 1
  `;
  if (!inviteRows.length)
    return NextResponse.json({ error: "This setup link is invalid, expired, or already used" }, { status: 404 });
  if (Number(inviteRows[0].version) !== version)
    return NextResponse.json({ error: "Tenant rules changed. Reload this page and review the latest version." }, { status: 409 });

  const { rows: duplicateEmails } = await sql`
    SELECT id FROM users WHERE email = ${email} AND id <> ${inviteRows[0].user_id} LIMIT 1
  `;
  if (duplicateEmails.length)
    return NextResponse.json({ error: "That email address is already used by another account" }, { status: 409 });

  const passwordHash = await bcrypt.hash(password, 10);
  const clientIp = req.headers.get("x-real-ip");
  const { rows } = await sql`
    WITH valid_invite AS (
      SELECT id, user_id FROM tenant_setup_invites
      WHERE token_hash = ${hashedToken} AND completed_at IS NULL AND expires_at > NOW()
      FOR UPDATE
    ), updated_user AS (
      UPDATE users SET
        email = ${email}, password_hash = ${passwordHash}, full_name = ${fullName}, phone = ${phone},
        nationality = ${String(body.nationality ?? "").trim() || null},
        date_of_birth = ${body.date_of_birth || null}, gender = ${String(body.gender ?? "").trim() || null},
        emirates_id = ${String(body.emirates_id ?? "").trim() || null},
        passport_no = ${String(body.passport_no ?? "").trim() || null},
        passport_expiry = ${body.passport_expiry || null},
        employer = ${String(body.employer ?? "").trim() || null},
        job_title = ${String(body.job_title ?? "").trim() || null},
        emergency_contact_name = ${String(body.emergency_contact_name ?? "").trim() || null},
        emergency_contact_phone = ${String(body.emergency_contact_phone ?? "").trim() || null},
        emergency_contact_relation = ${String(body.emergency_contact_relation ?? "").trim() || null}
      WHERE id = (SELECT user_id FROM valid_invite) AND role = 'tenant'
      RETURNING id, full_name
    ), signature AS (
      INSERT INTO tenant_contract_signatures (user_id, version, signature_name, signed_at, ip_address, user_agent)
      SELECT id, ${version}, ${signatureName}, NOW(), ${clientIp}, ${req.headers.get("user-agent")}
      FROM updated_user
      RETURNING user_id
    ), completed AS (
      UPDATE tenant_setup_invites SET completed_at = NOW()
      WHERE id = (SELECT id FROM valid_invite)
        AND EXISTS (SELECT 1 FROM signature)
      RETURNING user_id
    )
    SELECT completed.user_id AS id, updated_user.full_name
    FROM completed JOIN updated_user ON updated_user.id = completed.user_id
  `;
  if (!rows.length)
    return NextResponse.json({ error: "This setup link was already used or expired" }, { status: 409 });
  return NextResponse.json({ ok: true, pending_approval: true });
}