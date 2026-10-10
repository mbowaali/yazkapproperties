import { sql } from "@vercel/postgres";

async function getFaqs() {
  const { rows } = await sql`SELECT question, answer FROM faqs ORDER BY id ASC`;
  return rows;
}

export default async function FaqPage() {
  const faqs = await getFaqs();

  return (
    <main className="page-container">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">Frequently Asked Questions</h1>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div key={index}>
              <h2 className="font-semibold text-slate-800">{faq.question}</h2>
              <p className="mt-1 text-sm text-slate-600" dangerouslySetInnerHTML={{ __html: faq.answer }} />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}