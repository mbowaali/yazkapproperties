import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import bcrypt from "bcryptjs";
import { createSession } from "@/lib/auth";

export async function POST(req: Request) {
  const { email, password } = await req.json();
  if (!email || !password)
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });

  const { rows } = await sql`
    SELECT id, email, password_hash, role, full_name, approved
    FROM users WHERE email = ${email.toLowerCase().trim()} LIMIT 1
  `;
  const user = rows[0];
  if (!user) return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });

  if ((user.role === "tenant" || user.role === "employee") && !user.approved)
    return NextResponse.json({ error: "Your account is inactive or pending approval." }, { status: 403 });

  const token = await createSession({
    id: user.id, email: user.email, role: user.role,
    full_name: user.full_name, approved: user.approved,
  });

  const res = NextResponse.json({ role: user.role });
  res.cookies.set("yazkap_session", token, {
    httpOnly: true, secure: process.env.NODE_ENV === "production",
    sameSite: "lax", maxAge: 60 * 60 * 24 * 7, path: "/",
  });
  return res;
}
