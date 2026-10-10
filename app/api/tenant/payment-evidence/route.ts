import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const amount = formData.get("amount") as string;
  const payment_date = formData.get("payment_date") as string;
  const payment_method = (formData.get("payment_method") as string) || "Bank Transfer";
  const transaction_ref = (formData.get("transaction_ref") as string) || null;
  const bank_name = (formData.get("bank_name") as string) || null;
  const description = (formData.get("description") as string) || "Rent Payment";

  if (!amount || !payment_date)
    return NextResponse.json({ error: "Amount and date required" }, { status: 400 });

  let evidence_url: string | null = null;
  let evidence_name: string | null = null;

  if (file) {
    if (file.size > 5 * 1024 * 1024)
      return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
    const buf = Buffer.from(await file.arrayBuffer());
    evidence_url = `data:${file.type};base64,${buf.toString("base64")}`;
    evidence_name = file.name;
  }

  const { rows: userRows } = await sql`SELECT full_name, unit_label FROM users WHERE id = ${session.id}`;
  const user = userRows[0];
  const receipt_no = `RCP-${Date.now().toString().slice(-8)}`;

  const { rows } = await sql`
    INSERT INTO receipts (
      receipt_no, user_id, tenant_name, unit_label, amount, currency,
      payment_date, payment_method, description, status,
      evidence_url, evidence_name, transaction_ref, bank_name
    )
    VALUES (
      ${receipt_no}, ${session.id}, ${user?.full_name ?? "Tenant"}, ${user?.unit_label ?? null},
      ${Number(amount)}, 'AED', ${payment_date}, ${payment_method}, ${description}, 'pending',
      ${evidence_url}, ${evidence_name}, ${transaction_ref}, ${bank_name}
    )
    RETURNING id, receipt_no, status
  `;
  return NextResponse.json({ data: rows[0] });
}
