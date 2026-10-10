import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "employee"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (session.role === "employee") {
    const [{ rows: users }, { rows: grants }] = await Promise.all([
      sql`SELECT approved FROM users WHERE id = ${session.id} AND role = 'employee' LIMIT 1`,
      sql`SELECT permission FROM employee_permissions WHERE user_id = ${session.id}`,
    ]);
    if (!users.length || !users[0].approved || !grants.some(row => row.permission === "view_reports"))
      return NextResponse.json({ error: "Report access required" }, { status: 403 });
  }

  const requestedYear = Number(new URL(req.url).searchParams.get("year") ?? new Date().getFullYear());
  if (!Number.isInteger(requestedYear) || requestedYear < 2000 || requestedYear > 2200)
    return NextResponse.json({ error: "Invalid report year" }, { status: 400 });

  const { rows } = await sql`
    SELECT
      COALESCE((SELECT SUM(amount) FROM transactions WHERE date >= make_date(${requestedYear},1,1) AND date < make_date(${requestedYear}+1,1,1) AND lower(COALESCE(status,'')) IN ('paid','partial') AND lower(COALESCE(type,'')) <> 'refund'),0) AS rent_collected,
      COALESCE((SELECT SUM(total_amount) FROM laundry_collections WHERE collection_month >= make_date(${requestedYear},1,1) AND collection_month < make_date(${requestedYear}+1,1,1)),0) AS laundry_collected,
      COALESCE((SELECT SUM(amount) FROM expenses WHERE date >= make_date(${requestedYear},1,1) AND date < make_date(${requestedYear}+1,1,1)),0) AS expenses,
      COALESCE((SELECT SUM(amount) FROM landlord_payments WHERE date >= make_date(${requestedYear},1,1) AND date < make_date(${requestedYear}+1,1,1)),0) AS landlord_payments,
      COALESCE((SELECT SUM(amount) FROM transactions WHERE date >= make_date(${requestedYear},1,1) AND date < make_date(${requestedYear}+1,1,1) AND lower(COALESCE(status,'')) IN ('paid','partial') AND lower(COALESCE(type,'')) = 'refund'),0)
        + COALESCE((SELECT SUM(amount) FROM tenant_adjustments WHERE effective_date >= make_date(${requestedYear},1,1) AND effective_date < make_date(${requestedYear}+1,1,1) AND adjustment_type='refund' AND status='completed'),0) AS refunds,
      COALESCE((SELECT SUM(amount) FROM tenant_adjustments WHERE effective_date >= make_date(${requestedYear},1,1) AND effective_date < make_date(${requestedYear}+1,1,1) AND adjustment_type='discount' AND status='completed'),0) AS discounts
  `;
  const row = rows[0];
  const netResult = Number(row.rent_collected) + Number(row.laundry_collected) - Number(row.expenses) - Number(row.landlord_payments) - Number(row.refunds) - Number(row.discounts);
  return NextResponse.json({ data: {
    year: requestedYear, rent_collected: row.rent_collected, laundry_collected: row.laundry_collected,
    expenses: row.expenses, landlord_payments: row.landlord_payments, refunds: row.refunds,
    discounts: row.discounts, net_profit: Math.max(0, netResult), net_loss: Math.max(0, -netResult),
  } });
}