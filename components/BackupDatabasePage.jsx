"use client";

import { useState } from "react";
import { DatabaseBackup, Download, Loader2 } from "lucide-react";
import AppLayout from "./AppLayout";
import PageHeader from "./PageHeader";

export default function BackupDatabasePage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");

  function toIsoDateTime(value) {
    if (!value) {
      return "";
    }

    return new Date(value).toISOString();
  }

  async function downloadBackup(format = "json") {
    setLoading(true);
    setMessage("");

    try {
      if (startAt && endAt && new Date(startAt) > new Date(endAt)) {
        throw new Error("Start date/time must be before end date/time.");
      }

      const params = new URLSearchParams({ format });

      if (startAt) {
        params.set("start_at", toIsoDateTime(startAt));
      }

      if (endAt) {
        params.set("end_at", toIsoDateTime(endAt));
      }

      const response = await fetch(`/api/admin/backup?${params.toString()}`, {
        method: "GET",
        cache: "no-store"
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Backup failed.");
      }

      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") || "";
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match?.[1] || `sistech-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.${format}`;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setMessage(`Backup downloaded: ${filename}`);
    } catch (error) {
      setMessage(error.message || "Backup failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppLayout>
      <PageHeader
        title="Backup Database"
        description="Export important SISTECH operational data from a server-side admin endpoint."
        eyebrow="Administration"
      />

      {message ? (
        <div className="mb-4 rounded-lg border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-800">
          {message}
        </div>
      ) : null}

      <div className="max-w-2xl">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
              <DatabaseBackup className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-slate-950">Operational Backup</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Includes profiles, suppliers, items, customers, projects, budgets, cost codes,
                contracts, PR, PO, DO, AP, AR, cash/bank, accounting entries, notifications, and audit logs.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              <span>Start Date & Time</span>
              <input
                type="datetime-local"
                value={startAt}
                onChange={(event) => setStartAt(event.target.value)}
                className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              <span>End Date & Time</span>
              <input
                type="datetime-local"
                value={endAt}
                onChange={(event) => setEndAt(event.target.value)}
                className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
              />
            </label>
          </div>

          <p className="mt-3 text-xs leading-5 text-slate-500">
            Leave both fields empty to export all records. Date range filters records by `created_at`.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
              onClick={() => downloadBackup("json")}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Download JSON
            </button>
            <button
              type="button"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
              onClick={() => downloadBackup("csv")}
              disabled={loading}
            >
              <Download className="h-4 w-4" />
              Download CSV
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
