import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  const body = await req.json();
  const { full_name, phone, email, password, emirates_id, employer, job_title } = body;

  if (!email || !password || !full_name)
    return NextResponse.json({ error: "Name, email and password are required" }, { status: 400 });

  const { rows: existing } = await sql`SELECT id FROM users WHERE email = ${email.toLowerCase().trim()} LIMIT 1`;
  if (existing.length)
    return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });

  const password_hash = await bcrypt.hash(password, 10);

  const { rows } = await sql`
    INSERT INTO users (email, password_hash, role, full_name, phone, emirates_id, employer, job_title, approved)
    VALUES (${email.toLowerCase().trim()}, ${password_hash}, 'tenant', ${full_name}, ${phone || null},
            ${emirates_id || null}, ${employer || null}, ${job_title || null}, false)
    RETURNING id
  `;

  return NextResponse.json({ id: rows[0].id });
}
