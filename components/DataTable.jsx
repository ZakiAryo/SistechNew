"use client";

import Link from "next/link";
import { Edit2, ExternalLink, FileSearch, Trash2 } from "lucide-react";

function getNestedValue(row, key) {
  return key.split(".").reduce((value, part) => value?.[part], row);
}

function badgeClass(value) {
  const status = String(value || "").toLowerCase();

  if (["active", "paid", "approved", "delivered"].includes(status)) {
    return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  }

  if (["planning", "draft", "unpaid", "pending"].includes(status)) {
    return "bg-amber-50 text-amber-700 ring-amber-100";
  }

  if (["inactive", "cancelled", "rejected", "overdue"].includes(status)) {
    return "bg-rose-50 text-rose-700 ring-rose-100";
  }

  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function formatValue(value, column) {
  if (value === null || value === undefined || value === "") {
    return <span className="text-slate-400">-</span>;
  }

  if (column.format === "date") {
    return new Intl.DateTimeFormat("en", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }).format(new Date(value));
  }

  if (column.format === "currency") {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(Number(value || 0));
  }

  if (column.format === "badge") {
    return (
      <span
        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium capitalize ring-1 ${badgeClass(
          value
        )}`}
      >
        {String(value).replaceAll("_", " ")}
      </span>
    );
  }

  return String(value);
}

export default function DataTable({
  columns,
  rows,
  loading,
  error,
  emptyTitle = "No data found",
  emptyDescription = "Create a record to get started.",
  onEdit,
  onDelete,
  canManage,
  detailBasePath,
  documentUrlKey
}) {
  if (loading) {
    return (
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="space-y-3 p-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="grid grid-cols-5 gap-3">
              <span className="h-4 rounded bg-slate-100" />
              <span className="h-4 rounded bg-slate-100" />
              <span className="h-4 rounded bg-slate-100" />
              <span className="h-4 rounded bg-slate-100" />
              <span className="h-4 rounded bg-slate-100" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
        {error}
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
        <p className="text-sm font-semibold text-slate-900">{emptyTitle}</p>
        <p className="mt-2 text-sm text-slate-500">{emptyDescription}</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"
                >
                  {column.label}
                </th>
              ))}
              <th
                scope="col"
                className="w-28 whitespace-nowrap px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50/80">
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`max-w-xs whitespace-nowrap px-4 py-3 text-sm text-slate-700 ${
                      column.className || ""
                    }`}
                  >
                    <div className="truncate">{formatValue(getNestedValue(row, column.key), column)}</div>
                  </td>
                ))}
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <div className="inline-flex items-center gap-1">
                    {detailBasePath ? (
                      <Link
                        href={`${detailBasePath}/${row.id}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-cyan-700 hover:bg-cyan-50"
                        aria-label="Detail record"
                        title="Detail"
                      >
                        <FileSearch className="h-4 w-4" />
                      </Link>
                    ) : null}
                    {documentUrlKey && getNestedValue(row, documentUrlKey) ? (
                      <a
                        href={getNestedValue(row, documentUrlKey)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100"
                        aria-label="View document"
                        title="View Contract"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    ) : null}
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={() => onEdit(row)}
                      disabled={!canManage}
                      aria-label="Edit record"
                      title={canManage ? "Edit" : "Admin role required"}
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={() => onDelete(row)}
                      disabled={!canManage}
                      aria-label="Delete record"
                      title={canManage ? "Delete" : "Admin role required"}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
