import * as XLSX from "xlsx";

export function exportToExcel(rows: Record<string, any>[], filename: string) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data");
  XLSX.writeFile(wb, `${filename}-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export async function importFromExcel(file: File): Promise<Record<string, any>[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf);
  return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
}