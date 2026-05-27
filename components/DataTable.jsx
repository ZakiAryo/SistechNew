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
  const showActions = Boolean(canManage || detailBasePath || documentUrlKey);
  const actionButtonCount = (detailBasePath ? 1 : 0) + (documentUrlKey ? 1 : 0) + (canManage ? 2 : 0);
  const actionColumnWidth = showActions ? Math.max(96, actionButtonCount * 36 + 16) : 0;
  const tableMinWidth = Math.max(640, columns.length * 124 + actionColumnWidth);
  const skeletonColumns = columns.length + (showActions ? 1 : 0);

  if (loading) {
    return (
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <div className="space-y-3 p-4" style={{ minWidth: tableMinWidth }}>
            {Array.from({ length: 6 }).map((_, rowIndex) => (
              <div
                key={rowIndex}
                className="grid gap-3"
                style={{ gridTemplateColumns: `repeat(${skeletonColumns}, minmax(0, 1fr))` }}
              >
                {Array.from({ length: skeletonColumns }).map((__, columnIndex) => (
                  <span key={`${rowIndex}-${columnIndex}`} className="h-4 rounded bg-slate-100" />
                ))}
              </div>
            ))}
          </div>
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
        <table
          className="table-fixed divide-y divide-slate-200"
          style={{ minWidth: tableMinWidth, width: "100%" }}
        >
          <thead className="bg-slate-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className="whitespace-nowrap px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"
                  style={{ width: column.width || `${100 / Math.max(columns.length, 1)}%` }}
                >
                  {column.label}
                </th>
              ))}
              {showActions ? (
                <th
                  scope="col"
                  className="whitespace-nowrap px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500"
                  style={{ width: actionColumnWidth }}
                >
                  Actions
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.map((row) => (
              <tr key={row.id} className="h-14 hover:bg-slate-50/80">
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`px-3 py-3 text-sm text-slate-700 ${column.className || ""}`}
                  >
                    <div className="min-w-0 truncate">{formatValue(getNestedValue(row, column.key), column)}</div>
                  </td>
                ))}
                {showActions ? (
                  <td className="whitespace-nowrap px-3 py-3 text-right">
                    <div className="inline-flex items-center justify-end gap-1" style={{ minWidth: actionColumnWidth - 24 }}>
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
                      {canManage ? (
                        <>
                          <button
                            type="button"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100"
                            onClick={() => onEdit(row)}
                            aria-label="Edit record"
                            title="Edit"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-rose-600 hover:bg-rose-50"
                            onClick={() => onDelete(row)}
                            aria-label="Delete record"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      ) : null}
                    </div>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
