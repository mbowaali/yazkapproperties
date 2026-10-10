import { sql } from "@vercel/postgres";
import { NextResponse } from "next/server";
import { checkSession, checkAdmin } from "@/lib/auth";
import jsPDF from "jspdf";
import "jspdf-autotable";

declare module "jspdf" {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const session = await checkSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await checkAdmin(session);

  try {
    const { id } = params;
    const { rows: invoiceRows } = await sql`
      SELECT i.*, t.name as tenant_name, u.name as unit_name
      FROM invoices i
      JOIN tenants t ON i.tenant_id = t.id
      JOIN units u ON i.unit_id = u.id
      WHERE i.id = ${Number(id)}
    `;

    if (invoiceRows.length === 0) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const invoice = invoiceRows[0];

    const { rows: itemRows } = await sql`
      SELECT * FROM invoice_items WHERE invoice_id = ${Number(id)}
    `;

    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.text("Receipt", 105, 20, { align: "center" });

    doc.setFontSize(12);
    doc.text(`Receipt #: ${invoice.invoice_no}`, 14, 40);
    doc.text(`Date: ${new Date(invoice.paid_at).toLocaleDateString()}`, 14, 46);

    doc.text("Billed To:", 14, 60);
    doc.text(invoice.tenant_name, 14, 66);
    doc.text(`Unit: ${invoice.unit_name}`, 14, 72);

    doc.autoTable({
      startY: 80,
      head: [["Description", "Amount"]],
      body: itemRows.map(item => [item.description, `AED ${item.amount.toFixed(2)}`]),
      foot: [
        ["Total", `AED ${invoice.total.toFixed(2)}`],
        ["Amount Paid", `AED ${invoice.amount_paid.toFixed(2)}`],
        ["Balance", `AED ${(invoice.total - invoice.amount_paid).toFixed(2)}`],
      ],
      theme: "striped",
      headStyles: { fillColor: [22, 163, 74] },
    });

    const pdfBytes = doc.output("arraybuffer");

    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="receipt-${invoice.invoice_no}.pdf"`,
      },
    });

  } catch (error) {
    console.error("Error generating receipt:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}