import { sql } from "@vercel/postgres";
import { NextResponse } from "next/server";
import { checkSession, checkAdmin } from "@/lib/auth";

async function getFinancialData(startDate: string, endDate: string) {
  const { rows: income } = await sql`
    SELECT 
      p.payment_date, 
      i.invoice_no, 
      t.name as tenant_name, 
      p.amount 
    FROM payments p
    JOIN invoices i ON p.invoice_id = i.id
    JOIN tenants t ON i.tenant_id = t.id
    WHERE p.payment_date BETWEEN ${startDate} AND ${endDate}
    ORDER BY p.payment_date;
  `;

  const { rows: expenses } = await sql`
    SELECT 
      e.date, 
      e.description, 
      e.amount 
    FROM expenses e
    WHERE e.date BETWEEN ${startDate} AND ${endDate}
    ORDER BY e.date;
  `;

  return { income, expenses };
}

export async function GET(request: Request) {
  const session = await checkSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await checkAdmin(session);

  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!startDate || !endDate) {
      return NextResponse.json({ error: "Missing required query parameters" }, { status: 400 });
    }

    const data = await getFinancialData(startDate, endDate);
    return NextResponse.json(data);

  } catch (error) {
    console.error("Error fetching financial report data:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}