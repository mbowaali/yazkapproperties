import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { rows } = await sql`
    SELECT id, email, full_name, phone, emirates_id, employer, job_title,
           photo_url, role, approved, nationality, passport_no, passport_expiry,
           date_of_birth, gender, joining_date, emergency_contact_name,
           emergency_contact_phone, emergency_contact_relation,
           id_document_url, passport_url, work_contract_url, visa_url,
           unit_label, monthly_rent, created_at
    FROM users WHERE id = ${session.id} LIMIT 1
  `;
  if (!rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: rows[0] });
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const allowed = [
    "photo_url", "phone", "emergency_contact_name",
    "emergency_contact_phone", "emergency_contact_relation",
    "nationality", "passport_no", "passport_expiry",
    "date_of_birth", "gender", "employer", "job_title",
  ];
  const keys = Object.keys(body).filter(k => allowed.includes(k));
  if (!keys.length) return NextResponse.json({ ok: true });

  const sets = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");
  const values = [...keys.map(k => body[k]), session.id];
  await sql.query(`UPDATE users SET ${sets} WHERE id = $${values.length}`, values);
  return NextResponse.json({ ok: true });
}
