"use client";

import { Download, FileSpreadsheet, Printer } from "lucide-react";
import { useLanguage } from "./LanguageProvider";

function escapeCell(value) {
  const stringValue = value === null || value === undefined ? "" : String(value);
  return `"${stringValue.replaceAll('"', '""')}"`;
}

function downloadBlob(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export default function ExportActions({ title, columns, rows }) {
  const { t } = useLanguage();

  function exportExcel() {
    const header = columns.map((column) => escapeCell(t(`column.${column.label}`, column.label))).join(",");
    const body = rows
      .map((row) => columns.map((column) => escapeCell(row[column.key] ?? row[column.exportKey])).join(","))
      .join("\n");

    downloadBlob(`${header}\n${body}`, `${title}.csv`, "text/csv;charset=utf-8");
  }

  function exportPdf() {
    const tableHead = columns.map((column) => `<th>${t(`column.${column.label}`, column.label)}</th>`).join("");
    const tableRows = rows
      .map((row) => {
        const cells = columns.map((column) => `<td>${row[column.key] ?? row[column.exportKey] ?? ""}</td>`).join("");
        return `<tr>${cells}</tr>`;
      })
      .join("");
    const printWindow = window.open("", "_blank", "width=1024,height=768");

    if (!printWindow) {
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
            h1 { font-size: 20px; margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
            th { background: #f1f5f9; }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <table>
            <thead><tr>${tableHead}</tr></thead>
            <tbody>${tableRows}</tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
        onClick={exportExcel}
        title="Export Excel"
      >
        <FileSpreadsheet className="h-4 w-4" />
        Excel
      </button>
      <button
        type="button"
        className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
        onClick={exportPdf}
        title="Export PDF"
      >
        <Printer className="h-4 w-4" />
        PDF
      </button>
      <span className="hidden items-center gap-1 text-xs text-slate-400 sm:inline-flex">
        <Download className="h-3.5 w-3.5" />
        {t("backup.rows", "{{count}} rows", { count: rows.length })}
      </span>
    </div>
  );
}
