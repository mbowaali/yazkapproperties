import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  const body = await req.json();
  const {
    full_name, phone, email, password,
    emirates_id, employer, job_title,
    nationality, date_of_birth, gender,
    passport_no, passport_expiry,
    emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
    accepted_contract_version, signature_name, accepted,
  } = body;

  if (!email || !password || !full_name)
    return NextResponse.json({ error: "Name, email and password are required" }, { status: 400 });

  const fullName = String(full_name).trim();
  const signedName = String(signature_name ?? "").trim();
  const contractVersion = Number(accepted_contract_version);
  if (!fullName || accepted !== true || !Number.isInteger(contractVersion) ||
      signedName.toLocaleLowerCase() !== fullName.toLocaleLowerCase())
    return NextResponse.json({ error: "Review the tenant rules and sign with your registered full name" }, { status: 400 });

  const { rows: agreements } = await sql`
    SELECT version FROM tenant_contract_versions
    WHERE version = ${contractVersion}
      AND version = (SELECT MAX(version) FROM tenant_contract_versions)
    LIMIT 1
  `;
  if (!agreements.length)
    return NextResponse.json({ error: "Tenant rules have changed. Reload the form and review the latest version." }, { status: 409 });

  const { rows: existing } = await sql`SELECT id FROM users WHERE email = ${email.toLowerCase().trim()} LIMIT 1`;
  if (existing.length)
    return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });

  const password_hash = await bcrypt.hash(password, 10);

  const clientIp = req.headers.get("x-real-ip");
  const { rows } = await sql`
    WITH new_user AS (
      INSERT INTO users (
      email, password_hash, role, full_name, phone, emirates_id, employer, job_title,
      nationality, date_of_birth, gender, passport_no, passport_expiry,
      emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
      approved, joining_date
      ) VALUES (
      ${email.toLowerCase().trim()}, ${password_hash}, 'tenant', ${fullName},
      ${phone || null}, ${emirates_id || null}, ${employer || null}, ${job_title || null},
      ${nationality || null}, ${date_of_birth || null}, ${gender || null},
      ${passport_no || null}, ${passport_expiry || null},
      ${emergency_contact_name || null}, ${emergency_contact_phone || null},
      ${emergency_contact_relation || null},
      false, CURRENT_DATE
      ) RETURNING id
    )
    INSERT INTO tenant_contract_signatures
      (user_id, version, signature_name, signed_at, ip_address, user_agent)
    SELECT id, ${contractVersion}, ${signedName}, NOW(), ${clientIp}, ${req.headers.get("user-agent")}
    FROM new_user
    RETURNING user_id AS id
  `;

  return NextResponse.json({ id: rows[0].id });
}
