import { sql } from "@vercel/postgres";
import { NextResponse } from "next/server";
import { checkSession, checkAdmin } from "@/lib/auth";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const session = await checkSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await checkAdmin(session);

  try {
    const { id } = params;
    const { question, answer } = await request.json();
    if (!question || !answer) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { rows } = await sql`
      UPDATE faqs
      SET question = ${question}, answer = ${answer}, updated_at = NOW()
      WHERE id = ${Number(id)}
      RETURNING *
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: "FAQ not found" }, { status: 404 });
    }

    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error("Error updating FAQ:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const session = await checkSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await checkAdmin(session);

  try {
    const { id } = params;
    const { rowCount } = await sql`
      DELETE FROM faqs
      WHERE id = ${Number(id)}
    `;

    if (rowCount === 0) {
      return NextResponse.json({ error: "FAQ not found" }, { status: 404 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting FAQ:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}