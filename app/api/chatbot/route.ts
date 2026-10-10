import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET() {
  const { rows } = await sql`
    SELECT id, question, answer, keywords FROM chatbot_faqs
    WHERE active = true ORDER BY sort_order ASC, id ASC
  `;
  return NextResponse.json({ data: rows });
}

export async function POST(req: Request) {
  const { question } = await req.json();
  if (!question?.trim()) return NextResponse.json({ answer: null });

  const { rows } = await sql`
    SELECT question, answer, keywords FROM chatbot_faqs WHERE active = true
  ` as unknown as { rows: Array<{ question: string; answer: string; keywords: string | null }> };

  const q = question.toLowerCase();
  let best: { question: string; answer: string } | null = null;
  let bestScore = 0;

  for (const faq of rows) {
    const haystack = `${faq.question} ${faq.keywords || ""}`.toLowerCase();
    const words = q.split(/\s+/).filter((w: string) => w.length > 2);
    let score = 0;
    for (const word of words) {
      if (haystack.includes(word)) score++;
    }
    if (score > bestScore) { bestScore = score; best = faq; }
  }

  if (best && bestScore > 0) {
    return NextResponse.json({ answer: best.answer, question: best.question });
  }

  return NextResponse.json({
    answer: "I'm not sure about that. Please contact management directly:\n📞 +971 50 510 2276\n💬 WhatsApp: wa.me/971505102276\n📧 mbowaali@gmail.com",
  });
}
