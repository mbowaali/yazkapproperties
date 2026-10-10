import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth";

function isMissingAgreementTable(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "42P01";
}

export async function GET() {
  const session = await getSession();
  try {
    const { rows: agreements } = await sql`
      SELECT version, title, body, published_at
      FROM tenant_contract_versions ORDER BY version DESC LIMIT 1
    `;
    const agreement = agreements[0] ?? null;

    if (!agreement || session?.role !== "tenant")
      return NextResponse.json({ agreement, signature: null });

    const { rows: signatures } = await sql`
      SELECT version, signature_name, signed_at
      FROM tenant_contract_signatures
      WHERE user_id = ${session.id} AND version = ${agreement.version}
      LIMIT 1
    `;
    return NextResponse.json({ agreement, signature: signatures[0] ?? null });
  } catch (error) {
    if (isMissingAgreementTable(error))
      return NextResponse.json({ agreement: null, signature: null, setupRequired: true });
    throw error;
  }
}