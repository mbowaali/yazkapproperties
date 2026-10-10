import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "tenant")
    return NextResponse.json({ error: "Tenant access required" }, { status: 403 });

  const { version, signature_name, accepted } = await req.json();
  const signatureName = String(signature_name ?? "").trim();
  if (accepted !== true || !Number.isInteger(version) || !signatureName)
    return NextResponse.json({ error: "Please review the rules and enter your full name" }, { status: 400 });

  const [{ rows: users }, { rows: agreements }] = await Promise.all([
    sql`SELECT full_name FROM users WHERE id = ${session.id} LIMIT 1`,
    sql`SELECT version FROM tenant_contract_versions ORDER BY version DESC LIMIT 1`,
  ]);
  if (!users.length || signatureName.toLocaleLowerCase() !== String(users[0].full_name ?? "").trim().toLocaleLowerCase())
    return NextResponse.json({ error: "Enter your registered full name exactly" }, { status: 400 });
  if (!agreements.length || Number(agreements[0].version) !== version)
    return NextResponse.json({ error: "These rules have changed. Reload and review the latest version." }, { status: 409 });

  const clientIp = req.headers.get("x-real-ip");
  const { rows } = await sql`
    INSERT INTO tenant_contract_signatures
      (user_id, version, signature_name, signed_at, ip_address, user_agent)
    VALUES (
      ${session.id}, ${version}, ${signatureName}, NOW(), ${clientIp},
      ${req.headers.get("user-agent")}
    )
    ON CONFLICT (user_id, version) DO UPDATE
      SET signature_name = EXCLUDED.signature_name
    RETURNING version, signature_name, signed_at
  `;
  return NextResponse.json({ signature: rows[0] });
}