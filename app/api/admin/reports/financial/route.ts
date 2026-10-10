import { sql } from "@vercel/postgres";
import { NextResponse } from "next/server";
import { checkSession, checkAdmin } from "@/lib/auth";
import jsPDF from "jspdf";
import "jspdf-autotable";
import ExcelJS from "exceljs";

declare module "jspdf" {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

async function getFinancialData(startDate: string, endDate: string) {
  const { rows: income } = await sql`
    SELECT 
      p.payment_date, 
      i.invoice_no, 
      t.name as tenant_name, 
      p.amount 
    FROM payments p
    JOIN invoices i ON p.invoice_id = i.id
    JOIN tenants t ON i.tenant_id = t.id
    WHERE p.payment_date BETWEEN ${startDate} AND ${endDate}
    ORDER BY p.payment_date;
  `;

  const { rows: expenses } = await sql`
    SELECT 
      e.date, 
      e.description, 
      e.amount 
    FROM expenses e
    WHERE e.date BETWEEN ${startDate} AND ${endDate}
    ORDER BY e.date;
  `;

  return { income, expenses };
}

export async function GET(request: Request) {
  const session = await checkSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await checkAdmin(session);

  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const format = searchParams.get("format");

    if (!startDate || !endDate || !format) {
      return NextResponse.json({ error: "Missing required query parameters" }, { status: 400 });
    }

    const { income, expenses } = await getFinancialData(startDate, endDate);

    if (format === "pdf") {
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text(`Financial Report: ${startDate} to ${endDate}`, 14, 22);

      doc.setFontSize(14);
      doc.text("Income", 14, 40);
      doc.autoTable({
        startY: 45,
        head: [["Date", "Invoice #", "Tenant", "Amount"]],
        body: income.map(i => [new Date(i.payment_date).toLocaleDateString(), i.invoice_no, i.tenant_name, `AED ${i.amount.toFixed(2)}`]),
        foot: [["Total Income", "", "", `AED ${income.reduce((sum, i) => sum + i.amount, 0).toFixed(2)}`]],
      });

      doc.addPage();
      doc.setFontSize(14);
      doc.text("Expenses", 14, 22);
      doc.autoTable({
        startY: 27,
        head: [["Date", "Description", "Amount"]],
        body: expenses.map(e => [new Date(e.date).toLocaleDateString(), e.description, `AED ${e.amount.toFixed(2)}`]),
        foot: [["Total Expenses", "", `AED ${expenses.reduce((sum, e) => sum + e.amount, 0).toFixed(2)}`]],
      });
      
      const pdfBytes = doc.output("arraybuffer");
      return new NextResponse(pdfBytes, {
        status: 200,
        headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="financial-report.pdf"` },
      });

    } else if (format === "excel") {
      const workbook = new ExcelJS.Workbook();
      const incomeSheet = workbook.addWorksheet("Income");
      incomeSheet.columns = [
        { header: "Date", key: "date", width: 15 },
        { header: "Invoice #", key: "invoice_no", width: 20 },
        { header: "Tenant", key: "tenant_name", width: 30 },
        { header: "Amount", key: "amount", width: 15, style: { numFmt: '"AED" #,##0.00' } },
      ];
      income.forEach(i => {
        incomeSheet.addRow({
          date: new Date(i.payment_date),
          invoice_no: i.invoice_no,
          tenant_name: i.tenant_name,
          amount: i.amount,
        });
      });

      const expensesSheet = workbook.addWorksheet("Expenses");
      expensesSheet.columns = [
        { header: "Date", key: "date", width: 15 },
        { header: "Description", key: "description", width: 40 },
        { header: "Amount", key: "amount", width: 15, style: { numFmt: '"AED" #,##0.00' } },
      ];
      expenses.forEach(e => {
        expensesSheet.addRow({
          date: new Date(e.date),
          description: e.description,
          amount: e.amount,
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      return new NextResponse(buffer, {
        status: 200,
        headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="financial-report.xlsx"` },
      });
    }

    return NextResponse.json({ error: "Invalid format specified" }, { status: 400 });

  } catch (error) {
    console.error("Error generating financial report:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}