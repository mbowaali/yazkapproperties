import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session || (session.role !== "landlord" && session.role !== "admin"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [expenses, transactions, landlordPayments] = await Promise.all([
    sql`SELECT date_trunc('month', date)::date AS date, category,
        SUM(amount) AS amount, COUNT(*) AS item_count
      FROM expenses GROUP BY date_trunc('month', date)::date, category
      ORDER BY date DESC LIMIT 500`,
    sql`SELECT date_trunc('month', date)::date AS date, currency,
        SUM(amount) AS amount, COUNT(*) AS payment_count
      FROM transactions GROUP BY date_trunc('month', date)::date, currency
      ORDER BY date DESC LIMIT 120`,
    sql`SELECT date, year, month, amount, method
      FROM landlord_payments ORDER BY date DESC`,
  ]);

  return NextResponse.json({
    expenses: expenses.rows,
    transactions: transactions.rows,
    landlordPayments: landlordPayments.rows,
  });
}
