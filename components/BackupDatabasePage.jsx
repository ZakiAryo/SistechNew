"use client";

import { useState } from "react";
import { DatabaseBackup, Download, Loader2 } from "lucide-react";
import AppLayout from "./AppLayout";
import PageHeader from "./PageHeader";
import { backupTableOptions, backupTables, groupBackupTables } from "@/lib/backupConfig";

const groupedBackupTables = groupBackupTables(backupTableOptions);

export default function BackupDatabasePage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [backupScope, setBackupScope] = useState("all");
  const [selectedTables, setSelectedTables] = useState(backupTables);

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
      const tablesToBackup = backupScope === "all" ? backupTables : selectedTables;

      if (!tablesToBackup.length) {
        throw new Error("Select at least one database table to backup.");
      }

      params.set("tables", backupScope === "all" ? "all" : tablesToBackup.join(","));

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

  function toggleTable(tableName) {
    setSelectedTables((current) => {
      if (current.includes(tableName)) {
        return current.filter((item) => item !== tableName);
      }

      return [...current, tableName];
    });
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

      <div className="max-w-5xl">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
              <DatabaseBackup className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-slate-950">Operational Backup</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Choose all operational database tables or select only the module data that needs to be exported.
                The generated file includes metadata, row counts, and clean table sections.
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm font-semibold text-slate-800">Backup Scope</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {[
                { value: "all", label: "All Database", description: "Export every supported operational table." },
                { value: "selected", label: "Selected Tables", description: "Choose specific data tables or modules." }
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`rounded-md border p-3 text-left transition ${
                    backupScope === option.value
                      ? "border-cyan-500 bg-white text-slate-950 ring-2 ring-cyan-100"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                  onClick={() => setBackupScope(option.value)}
                >
                  <span className="block text-sm font-semibold">{option.label}</span>
                  <span className="mt-1 block text-xs leading-5">{option.description}</span>
                </button>
              ))}
            </div>
          </div>

          {backupScope === "selected" ? (
            <div className="mt-5 rounded-lg border border-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Select Database Tables</h3>
                  <p className="text-xs text-slate-500">
                    {selectedTables.length} of {backupTables.length} tables selected.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="h-8 rounded-md border border-slate-300 px-3 text-xs font-medium text-slate-700 hover:bg-slate-100"
                    onClick={() => setSelectedTables(backupTables)}
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    className="h-8 rounded-md border border-slate-300 px-3 text-xs font-medium text-slate-700 hover:bg-slate-100"
                    onClick={() => setSelectedTables([])}
                  >
                    Clear
                  </button>
                </div>
              </div>
              <div className="grid gap-4 p-4 md:grid-cols-2">
                {Object.entries(groupedBackupTables).map(([groupName, options]) => (
                  <div key={groupName}>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">{groupName}</p>
                    <div className="space-y-2">
                      {options.map((option) => (
                        <label
                          key={option.value}
                          className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm hover:border-cyan-200 hover:bg-cyan-50/40"
                        >
                          <span>
                            <span className="block font-medium text-slate-800">{option.label}</span>
                            <span className="block text-xs text-slate-500">{option.value}</span>
                          </span>
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                            checked={selectedTables.includes(option.value)}
                            onChange={() => toggleTable(option.value)}
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

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
