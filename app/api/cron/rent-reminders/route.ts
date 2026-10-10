import { NextResponse } from "next/server";
import webPush from "web-push";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY || !process.env.VAPID_SUBJECT)
    return NextResponse.json({ error: "Web Push VAPID settings are not configured" }, { status: 503 });

  webPush.setVapidDetails(process.env.VAPID_SUBJECT, process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
  const { rows } = await sql`
    SELECT i.id AS invoice_id, i.invoice_no, i.total, i.due_date::text AS due_date,
           u.id AS user_id, s.id AS subscription_id, s.endpoint, s.p256dh, s.auth,
           reminder.stage AS reminder_stage,
           CASE reminder.stage
             WHEN 'before_due' THEN 'Rent due in 3 days'
             WHEN 'due_today' THEN 'Rent is due today'
             ELSE 'Rent payment is overdue'
           END AS title
    FROM invoices i
    JOIN tenancies t ON t.id = i.tenancy_id
    JOIN users u ON u.id = t.tenant_id AND u.role = 'tenant' AND u.approved = true
    JOIN push_subscriptions s ON s.user_id = u.id
    CROSS JOIN LATERAL (VALUES
      ('before_due'::text, CURRENT_DATE + 3),
      ('due_today'::text, CURRENT_DATE),
      ('overdue'::text, CURRENT_DATE - 3)
    ) AS reminder(stage, reminder_date)
    WHERE i.status <> 'paid' AND i.due_date = reminder.reminder_date
      AND NOT EXISTS (
        SELECT 1 FROM push_reminder_deliveries sent
        WHERE sent.subscription_id = s.id AND sent.invoice_id = i.id
          AND sent.due_date = i.due_date AND sent.reminder_stage = reminder.stage
      )
    LIMIT 500
  `;

  let sent = 0;
  let failed = 0;
  let expired = 0;
  for (const reminder of rows) {
    const subscription = { endpoint: reminder.endpoint, keys: { p256dh: reminder.p256dh, auth: reminder.auth } };
    const payload = JSON.stringify({
      title: reminder.title,
      body: `Invoice ${reminder.invoice_no}: AED ${Number(reminder.total).toFixed(2)}. Open your tenant dashboard for details.`,
      url: "/dashboard",
      tag: `rent-${reminder.invoice_id}-${reminder.reminder_stage}`,
    });
    try {
      await webPush.sendNotification(subscription, payload);
      await sql`
        INSERT INTO push_reminder_deliveries (subscription_id, invoice_id, due_date, reminder_stage)
        VALUES (${reminder.subscription_id}, ${reminder.invoice_id}, ${reminder.due_date}, ${reminder.reminder_stage})
        ON CONFLICT DO NOTHING
      `;
      sent += 1;
    } catch (error) {
      const statusCode = typeof error === "object" && error !== null && "statusCode" in error ? Number(error.statusCode) : 0;
      if (statusCode === 404 || statusCode === 410) {
        await sql`DELETE FROM push_subscriptions WHERE id = ${reminder.subscription_id}`;
        expired += 1;
      } else failed += 1;
    }
  }
  return NextResponse.json({ sent, failed, expired, checked: rows.length });
}