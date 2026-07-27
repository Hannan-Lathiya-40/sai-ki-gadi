import * as XLSX from "xlsx";

type ExportExcelOptions = {
  sheetName: string;
  filename: string;
  rows: Record<string, string | number | boolean | null | undefined>[];
};

export function exportToExcel({
  sheetName,
  filename,
  rows,
}: ExportExcelOptions) {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, filename);
}
