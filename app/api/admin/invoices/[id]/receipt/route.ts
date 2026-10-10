import { sql } from "@vercel/postgres";
import { NextResponse } from "next/server";
import { checkSession, checkAdmin } from "@/lib/auth";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const session = await checkSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await checkAdmin(session);

  try {
    const { id } = params;
    const { rows: invoiceRows } = await sql`
      SELECT i.*, t.name as tenant_name, u.name as unit_name
      FROM invoices i
      JOIN tenants t ON i.tenant_id = t.id
      JOIN units u ON i.unit_id = u.id
      WHERE i.id = ${Number(id)}
    `;

    if (invoiceRows.length === 0) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const invoice = invoiceRows[0];

    const { rows: itemRows } = await sql`
      SELECT * FROM invoice_items WHERE invoice_id = ${Number(id)}
    `;

    return NextResponse.json({ invoice, items: itemRows });

  } catch (error) {
    console.error("Error fetching receipt data:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}