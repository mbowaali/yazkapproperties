"use client";
import { useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { DocumentArrowDownIcon } from "@heroicons/react/24/outline";

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

  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    setIsGenerating(true);
    try {
      const { startDate, endDate, format } = data;
      const query = new URLSearchParams({ startDate, endDate, format }).toString();
      const response = await fetch(`/api/admin/reports/financial?${query}`);

      if (!response.ok) {
        throw new Error("Failed to generate report");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `financial-report-${startDate}-to-${endDate}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
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