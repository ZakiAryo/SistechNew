"use client";

import { useState } from "react";
import { DatabaseBackup, Download, Loader2 } from "lucide-react";
import AppLayout from "./AppLayout";
import PageHeader from "./PageHeader";

export default function BackupDatabasePage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function downloadBackup(format = "json") {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(`/api/admin/backup?format=${format}`, {
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

      <div className="grid gap-4 lg:grid-cols-2">
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

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
          Backup requires `SUPABASE_SERVICE_ROLE_KEY` in Vercel/server environment. The key is never exposed to the browser.
        </div>
      </div>
    </AppLayout>
  );
}
