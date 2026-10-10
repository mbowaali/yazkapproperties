import { sql } from "@vercel/postgres";
import { NextResponse } from "next/server";
import { checkSession, checkAdmin } from "@/lib/auth";

export async function GET() {
  try {
    const { rows } = await sql`SELECT * FROM faqs ORDER BY id ASC`;
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error fetching FAQs:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await checkSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await checkAdmin(session);

  try {
    const { question, answer } = await request.json();
    if (!question || !answer) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { rows } = await sql`
      INSERT INTO faqs (question, answer)
      VALUES (${question}, ${answer})
      RETURNING *
    `;

    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    console.error("Error creating FAQ:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}