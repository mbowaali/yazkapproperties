import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "tenant") return NextResponse.json({ error: "Tenant access required" }, { status: 403 });
  return NextResponse.json({ publicKey: process.env.VAPID_PUBLIC_KEY ?? null });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "tenant") return NextResponse.json({ error: "Tenant access required" }, { status: 403 });
  const subscription = await req.json();
  const endpoint = String(subscription?.endpoint ?? "");
  const p256dh = String(subscription?.keys?.p256dh ?? "");
  const auth = String(subscription?.keys?.auth ?? "");
  if (!endpoint.startsWith("https://") || endpoint.length > 4096 || !p256dh || !auth)
    return NextResponse.json({ error: "Invalid browser subscription" }, { status: 400 });

  await sql`
    INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, updated_at)
    VALUES (${session.id}, ${endpoint}, ${p256dh}, ${auth}, NOW())
    ON CONFLICT (endpoint) DO UPDATE SET
      user_id = EXCLUDED.user_id, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth, updated_at = NOW()
  `;
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "tenant") return NextResponse.json({ error: "Tenant access required" }, { status: 403 });
  const { endpoint } = await req.json();
  if (typeof endpoint !== "string") return NextResponse.json({ error: "Subscription endpoint required" }, { status: 400 });
  await sql`DELETE FROM push_subscriptions WHERE user_id = ${session.id} AND endpoint = ${endpoint}`;
  return NextResponse.json({ ok: true });
}