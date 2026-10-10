import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session || (session.role !== "landlord" && session.role !== "admin"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [expenses, transactions, landlordPayments] = await Promise.all([
    sql`SELECT id, date, year, month, category, description, amount, method, notes
        FROM expenses ORDER BY date DESC LIMIT 1000`,
    sql`SELECT id, tenant_name, date, type, amount, currency, method, status, note
        FROM transactions ORDER BY date DESC LIMIT 1000`,
    sql`SELECT id, date, year, month, amount, method, note
        FROM landlord_payments ORDER BY date DESC`,
  ]);

  return NextResponse.json({
    expenses: expenses.rows,
    transactions: transactions.rows,
    landlordPayments: landlordPayments.rows,
  });
}
