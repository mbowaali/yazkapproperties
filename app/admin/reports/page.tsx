"use client";
import { useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { DocumentArrowDownIcon } from "@heroicons/react/24/outline";
import jsPDF from "jspdf";
import "jspdf-autotable";
import ExcelJS from "exceljs";

declare module "jspdf" {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

type Inputs = {
  startDate: string;
  endDate: string;
  format: "pdf" | "excel";
};

export default function ReportsPage() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Inputs>();
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePdf = (data: any, startDate: string, endDate: string) => {
    const { income, expenses } = data;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`Financial Report: ${startDate} to ${endDate}`, 14, 22);

    doc.setFontSize(14);
    doc.text("Income", 14, 40);
    doc.autoTable({
      startY: 45,
      head: [["Date", "Invoice #", "Tenant", "Amount"]],
      body: income.map((i: any) => [new Date(i.payment_date).toLocaleDateString(), i.invoice_no, i.tenant_name, `AED ${i.amount.toFixed(2)}`]),
      foot: [["Total Income", "", "", `AED ${income.reduce((sum: number, i: any) => sum + i.amount, 0).toFixed(2)}`]],
    });

    doc.addPage();
    doc.setFontSize(14);
    doc.text("Expenses", 14, 22);
    doc.autoTable({
      startY: 27,
      head: [["Date", "Description", "Amount"]],
      body: expenses.map((e: any) => [new Date(e.date).toLocaleDateString(), e.description, `AED ${e.amount.toFixed(2)}`]),
      foot: [["Total Expenses", "", `AED ${expenses.reduce((sum: number, e: any) => sum + e.amount, 0).toFixed(2)}`]],
    });
    
    doc.save(`financial-report-${startDate}-to-${endDate}.pdf`);
  };

  const generateExcel = async (data: any, startDate: string, endDate: string) => {
    const { income, expenses } = data;
    const workbook = new ExcelJS.Workbook();
    const incomeSheet = workbook.addWorksheet("Income");
    incomeSheet.columns = [
      { header: "Date", key: "date", width: 15 },
      { header: "Invoice #", key: "invoice_no", width: 20 },
      { header: "Tenant", key: "tenant_name", width: 30 },
      { header: "Amount", key: "amount", width: 15, style: { numFmt: '"AED" #,##0.00' } },
    ];
    income.forEach((i: any) => {
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
    expenses.forEach((e: any) => {
      expensesSheet.addRow({
        date: new Date(e.date),
        description: e.description,
        amount: e.amount,
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `financial-report-${startDate}-to-${endDate}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    setIsGenerating(true);
    try {
      const { startDate, endDate, format } = data;
      const query = new URLSearchParams({ startDate, endDate }).toString();
      const response = await fetch(`/api/admin/reports/financial?${query}`);

      if (!response.ok) {
        throw new Error("Failed to generate report");
      }

      const reportData = await response.json();

      if (format === "pdf") {
        generatePdf(reportData, startDate, endDate);
      } else if (format === "excel") {
        await generateExcel(reportData, startDate, endDate);
      }

    } catch (error) {
      console.error("Error generating report:", error);
      alert("Failed to generate report. Please check the console for details.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="page-container">
      <h1 className="text-2xl font-semibold mb-6">Reports</h1>
      <div className="card">
        <h2 className="section-title mb-4">Financial Report</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="startDate" className="label">Start Date</label>
              <input
                id="startDate"
                type="date"
                {...register("startDate", { required: "Start date is required" })}
                className="input"
              />
              {errors.startDate && <p className="error-message">{errors.startDate.message}</p>}
            </div>
            <div>
              <label htmlFor="endDate" className="label">End Date</label>
              <input
                id="endDate"
                type="date"
                {...register("endDate", { required: "End date is required" })}
                className="input"
              />
              {errors.endDate && <p className="error-message">{errors.endDate.message}</p>}
            </div>
          </div>
          <div>
            <label htmlFor="format" className="label">Format</label>
            <select
              id="format"
              {...register("format", { required: "Format is required" })}
              className="input"
            >
              <option value="pdf">PDF</option>
              <option value="excel">Excel</option>
            </select>
            {errors.format && <p className="error-message">{errors.format.message}</p>}
          </div>
          <div className="flex justify-end">
            <button type="submit" className="btn-primary" disabled={isGenerating}>
              <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
              {isGenerating ? "Generating..." : "Download Report"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}