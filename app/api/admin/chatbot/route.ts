import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth";

async function adminOnly() {
  const session = await getSession();
  return session?.role === "admin" ? session : null;
}

export async function GET() {
  if (!await adminOnly()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { rows } = await sql`
    SELECT id, question, answer, keywords, active, sort_order
    FROM chatbot_faqs ORDER BY sort_order, id
  `;
  return NextResponse.json({ data: rows });
}

export async function POST(req: Request) {
  if (!await adminOnly()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const question = String(body.question ?? "").trim();
  const answer = String(body.answer ?? "").trim();
  const keywords = String(body.keywords ?? "").trim();
  if (!question || !answer || question.length > 500 || answer.length > 4000 || keywords.length > 1000)
    return NextResponse.json({ error: "Add a question and answer within the length limits" }, { status: 400 });

  const { rows } = await sql`
    INSERT INTO chatbot_faqs (question, answer, keywords, active, sort_order)
    VALUES (${question}, ${answer}, ${keywords || null}, ${body.active !== false}, COALESCE((SELECT MAX(sort_order) + 1 FROM chatbot_faqs), 0))
    RETURNING id, question, answer, keywords, active, sort_order
  `;
  return NextResponse.json({ data: rows[0] });
}

export async function PATCH(req: Request) {
  if (!await adminOnly()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const id = Number(body.id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "FAQ id is required" }, { status: 400 });

  const question = body.question === undefined ? null : String(body.question).trim();
  const answer = body.answer === undefined ? null : String(body.answer).trim();
  const keywords = body.keywords === undefined ? null : String(body.keywords).trim();
  const active = typeof body.active === "boolean" ? body.active : null;
  if (question !== null && (!question || question.length > 500)) return NextResponse.json({ error: "Question is required and must be 500 characters or fewer" }, { status: 400 });
  if (answer !== null && (!answer || answer.length > 4000)) return NextResponse.json({ error: "Answer is required and must be 4,000 characters or fewer" }, { status: 400 });
  if (keywords !== null && keywords.length > 1000) return NextResponse.json({ error: "Keywords must be 1,000 characters or fewer" }, { status: 400 });

  const { rows } = await sql`
    UPDATE chatbot_faqs SET
      question = COALESCE(${question}, question),
      answer = COALESCE(${answer}, answer),
      keywords = COALESCE(${keywords}, keywords),
      active = COALESCE(${active}, active)
    WHERE id = ${id}
    RETURNING id, question, answer, keywords, active, sort_order
  `;
  if (!rows.length) return NextResponse.json({ error: "FAQ not found" }, { status: 404 });
  return NextResponse.json({ data: rows[0] });
}

export async function DELETE(req: Request) {
  if (!await adminOnly()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!Number.isInteger(id)) return NextResponse.json({ error: "FAQ id is required" }, { status: 400 });
  await sql`DELETE FROM chatbot_faqs WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}