import { sql } from "@vercel/postgres";
import { Suspense } from "react";

// Force dynamic rendering to avoid build-time database queries
export const dynamic = "force-dynamic";

async function getFaqs() {
  try {
    const { rows } = await sql`SELECT question, answer FROM faqs ORDER BY id ASC`;
    return rows;
  } catch (error) {
    console.error("Failed to fetch FAQs:", error);
    return [];
  }
}

export default async function FaqPage() {
  const faqs = await getFaqs();

  return (
    <main className="page-container">
      <Suspense fallback={<div className="text-center py-10">Loading FAQs...</div>}>
        {faqs.length > 0 ? (
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
        ) : (
          <div className="max-w-3xl mx-auto">
            <h1 className="text-3xl font-bold text-center mb-8">Frequently Asked Questions</h1>
            <div className="space-y-4">
              <div className="p-4 border rounded-lg">
                <h2 className="font-semibold text-slate-800">No FAQs available yet</h2>
                <p className="mt-1 text-sm text-slate-600">Check back soon for updates.</p>
              </div>
            </div>
          </div>
        )}
      </Suspense>
    </main>
  );
}