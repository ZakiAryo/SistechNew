"use client";

import { useState } from "react";
import { DatabaseBackup, Download, Loader2, Upload } from "lucide-react";
import AppLayout from "./AppLayout";
import { useLanguage } from "./LanguageProvider";
import PageHeader from "./PageHeader";
import { backupTableOptions, backupTables, groupBackupTables } from "@/lib/backupConfig";

const groupedBackupTables = groupBackupTables(backupTableOptions);

function getRecordsFromBackupTable(tablePayload) {
  if (Array.isArray(tablePayload)) {
    return tablePayload;
  }

  if (Array.isArray(tablePayload?.records)) {
    return tablePayload.records;
  }

  return [];
}

function getTablesFromBackupPayload(payload) {
  const tables = payload?.tables || {};

  return backupTables.filter((tableName) => getRecordsFromBackupTable(tables[tableName]).length > 0);
}

function getBackupRowCount(payload, tableName) {
  return getRecordsFromBackupTable(payload?.tables?.[tableName]).length;
}

export default function BackupDatabasePage() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [backupScope, setBackupScope] = useState("all");
  const [selectedTables, setSelectedTables] = useState(backupTables);
  const [restoreFile, setRestoreFile] = useState(null);
  const [restorePayload, setRestorePayload] = useState(null);
  const [restoreScope, setRestoreScope] = useState("all");
  const [restoreTables, setRestoreTables] = useState([]);
  const [restoreResult, setRestoreResult] = useState(null);

  const restoreAvailableTables = restorePayload ? getTablesFromBackupPayload(restorePayload) : [];
  const groupedRestoreTables = groupBackupTables(
    backupTableOptions.filter((option) => restoreAvailableTables.includes(option.value))
  );

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
        throw new Error(t("backup.invalidRange", "Start date/time must be before end date/time."));
      }

      const params = new URLSearchParams({ format });
      const tablesToBackup = backupScope === "all" ? backupTables : selectedTables;

      if (!tablesToBackup.length) {
        throw new Error(t("backup.noSelection", "Select at least one database table to backup."));
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

  async function handleRestoreFileChange(event) {
    const file = event.target.files?.[0];
    setRestoreResult(null);

    if (!file) {
      setRestoreFile(null);
      setRestorePayload(null);
      setRestoreTables([]);
      return;
    }

    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      const availableTables = getTablesFromBackupPayload(payload);

      if (payload?.meta?.app && payload.meta.app !== "SISTECH") {
        throw new Error("This file is not a SISTECH backup.");
      }

      if (!availableTables.length) {
        throw new Error("Backup file does not contain supported table records.");
      }

      setRestoreFile(file);
      setRestorePayload(payload);
      setRestoreTables(availableTables);
      setRestoreScope("all");
      setMessage(`Restore file loaded: ${file.name}. ${availableTables.length} tables available.`);
    } catch (error) {
      setRestoreFile(null);
      setRestorePayload(null);
      setRestoreTables([]);
      setMessage(error.message || "Could not read backup file.");
    }
  }

  function toggleRestoreTable(tableName) {
    setRestoreTables((current) => {
      if (current.includes(tableName)) {
        return current.filter((item) => item !== tableName);
      }

      return [...current, tableName];
    });
  }

  async function restoreBackup() {
    setRestoreLoading(true);
    setRestoreResult(null);

    try {
      if (!restoreFile || !restorePayload) {
        throw new Error("Upload a JSON backup file first.");
      }

      const tablesToRestore = restoreScope === "all" ? restoreAvailableTables : restoreTables;

      if (!tablesToRestore.length) {
        throw new Error("Select at least one table to restore.");
      }

      const formData = new FormData();
      formData.append("file", restoreFile);
      formData.append("tables", restoreScope === "all" ? "all" : tablesToRestore.join(","));

      const response = await fetch("/api/admin/restore", {
        method: "POST",
        body: formData
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok && response.status !== 207) {
        throw new Error(payload.error || "Restore failed.");
      }

      setRestoreResult(payload);
      setMessage(payload.message || "Restore completed.");
    } catch (error) {
      setMessage(error.message || "Restore failed.");
    } finally {
      setRestoreLoading(false);
    }
  }

  return (
    <AppLayout>
      <PageHeader
        title={t("backup.title", "Backup Database")}
        description={t(
          "backup.description",
          "Export important SISTECH operational data from a server-side admin endpoint."
        )}
        eyebrow={t("section.Administration", "Administration")}
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
              <h2 className="text-base font-semibold text-slate-950">
                {t("backup.operationalBackup", "Operational Backup")}
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                {t(
                  "backup.operationalBackupDescription",
                  "Choose all operational database tables or select only the module data that needs to be exported. The generated file includes metadata, row counts, and clean table sections."
                )}
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm font-semibold text-slate-800">{t("backup.scope", "Backup Scope")}</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {[
                {
                  value: "all",
                  label: t("backup.allDatabase", "All Database"),
                  description: t("backup.allDatabaseDescription", "Export every supported operational table.")
                },
                {
                  value: "selected",
                  label: t("backup.selectedTables", "Selected Tables"),
                  description: t("backup.selectedTablesDescription", "Choose specific data tables or modules.")
                }
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
                  <h3 className="text-sm font-semibold text-slate-900">
                    {t("backup.selectDatabaseTables", "Select Database Tables")}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {t("backup.selectedCount", "{{selected}} of {{total}} tables selected.", {
                      selected: selectedTables.length,
                      total: backupTables.length
                    })}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="h-8 rounded-md border border-slate-300 px-3 text-xs font-medium text-slate-700 hover:bg-slate-100"
                    onClick={() => setSelectedTables(backupTables)}
                  >
                    {t("common.selectAll", "Select All")}
                  </button>
                  <button
                    type="button"
                    className="h-8 rounded-md border border-slate-300 px-3 text-xs font-medium text-slate-700 hover:bg-slate-100"
                    onClick={() => setSelectedTables([])}
                  >
                    {t("common.clear", "Clear")}
                  </button>
                </div>
              </div>
              <div className="grid gap-4 p-4 md:grid-cols-2">
                {Object.entries(groupedBackupTables).map(([groupName, options]) => (
                  <div key={groupName}>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      {t(`backup.group.${groupName}`, groupName)}
                    </p>
                    <div className="space-y-2">
                      {options.map((option) => (
                        <label
                          key={option.value}
                          className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm hover:border-cyan-200 hover:bg-cyan-50/40"
                        >
                          <span>
                            <span className="block font-medium text-slate-800">
                              {t(`backup.table.${option.value}`, option.label)}
                            </span>
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
              <span>{t("backup.startAt", "Start Date & Time")}</span>
              <input
                type="datetime-local"
                value={startAt}
                onChange={(event) => setStartAt(event.target.value)}
                className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              <span>{t("backup.endAt", "End Date & Time")}</span>
              <input
                type="datetime-local"
                value={endAt}
                onChange={(event) => setEndAt(event.target.value)}
                className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
              />
            </label>
          </div>

          <p className="mt-3 text-xs leading-5 text-slate-500">
            {t(
              "backup.dateRangeHelp",
              "Leave both fields empty to export all records. Date range filters records by `created_at`."
            )}
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
              onClick={() => downloadBackup("json")}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {t("common.downloadJson", "Download JSON")}
            </button>
            <button
              type="button"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-cyan-300 bg-cyan-50 px-4 text-sm font-medium text-cyan-800 hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-70"
              onClick={() => downloadBackup("excel")}
              disabled={loading}
            >
              <Download className="h-4 w-4" />
              {t("common.downloadExcel", "Download Excel")}
            </button>
            <button
              type="button"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
              onClick={() => downloadBackup("csv")}
              disabled={loading}
            >
              <Download className="h-4 w-4" />
              {t("common.downloadCsv", "Download CSV")}
            </button>
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            {t(
              "backup.excelFormatHelp",
              "Use Excel for separated sheets, colored headers, and visible table borders. CSV remains a plain text export."
            )}
          </p>
        </div>

        <div className="mt-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <Upload className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-slate-950">
                {t("backup.restoreFromBackup", "Restore From Backup")}
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                {t(
                  "backup.restoreDescription",
                  "Upload a SISTECH JSON backup to restore data with safe upsert by record id. Run schema migrations first when restoring into a fresh Supabase project."
                )}
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
            {t(
              "backup.restoreAuthWarning",
              "Restore does not recreate Supabase Auth accounts. If you restore users/profiles into a new Supabase project, create the Auth users first so profile ids and user references can match."
            )}
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                <span>{t("backup.uploadJsonBackup", "Upload JSON Backup")}</span>
                <input
                  type="file"
                  accept="application/json,.json"
                  onChange={handleRestoreFileChange}
                  className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-slate-800"
                />
              </label>

              {restorePayload ? (
                <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                  <p>
                    {t("backup.supportedTables", "{{file}} contains {{count}} supported tables.", {
                      file: restoreFile?.name || "-",
                      count: restoreAvailableTables.length
                    })}
                  </p>
                  <p className="mt-1 text-xs">
                    {t("backup.generatedAt", "Generated at: {{value}}", {
                      value: restorePayload.meta?.generated_at || restorePayload.meta?.requested_at || "Unknown"
                    })}
                  </p>
                </div>
              ) : null}

              {restorePayload ? (
                <div className="mt-5 rounded-lg border border-slate-200">
                  <div className="border-b border-slate-200 px-4 py-3">
                    <p className="text-sm font-semibold text-slate-900">
                      {t("backup.restoreScope", "Restore Scope")}
                    </p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {[
                        { value: "all", label: t("backup.allTablesInFile", "All Tables In File") },
                        { value: "selected", label: t("backup.selectedTables", "Selected Tables") }
                      ].map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          className={`rounded-md border px-3 py-2 text-left text-sm font-medium transition ${
                            restoreScope === option.value
                              ? "border-emerald-500 bg-white text-slate-950 ring-2 ring-emerald-100"
                              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                          }`}
                          onClick={() => setRestoreScope(option.value)}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {restoreScope === "selected" ? (
                    <div className="grid gap-4 p-4 md:grid-cols-2">
                      {Object.entries(groupedRestoreTables).map(([groupName, options]) => (
                        <div key={groupName}>
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                            {t(`backup.group.${groupName}`, groupName)}
                          </p>
                          <div className="space-y-2">
                            {options.map((option) => (
                              <label
                                key={option.value}
                                className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm hover:border-emerald-200 hover:bg-emerald-50/40"
                              >
                                <span>
                                  <span className="block font-medium text-slate-800">
                                    {t(`backup.table.${option.value}`, option.label)}
                                  </span>
                                  <span className="block text-xs text-slate-500">
                                    {option.value} -{" "}
                                    {t("backup.rows", "{{count}} rows", {
                                      count: getBackupRowCount(restorePayload, option.value)
                                    })}
                                  </span>
                                </span>
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                  checked={restoreTables.includes(option.value)}
                                  onChange={() => toggleRestoreTable(option.value)}
                                />
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-semibold text-slate-900">
                {t("backup.restoreSummary", "Restore Summary")}
              </h3>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">{t("common.file", "File")}</dt>
                  <dd className="max-w-[180px] truncate font-medium text-slate-800">{restoreFile?.name || "-"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">{t("common.tables", "Tables")}</dt>
                  <dd className="font-medium text-slate-800">
                    {restorePayload ? (restoreScope === "all" ? restoreAvailableTables.length : restoreTables.length) : 0}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">{t("common.mode", "Mode")}</dt>
                  <dd className="font-medium text-slate-800">{t("common.upsertById", "Upsert by id")}</dd>
                </div>
              </dl>

              <button
                type="button"
                className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-medium text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-70"
                onClick={restoreBackup}
                disabled={restoreLoading || !restoreFile}
              >
                {restoreLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {t("backup.uploadRestoreJson", "Upload & Restore JSON")}
              </button>

              {restoreResult ? (
                <div className="mt-4 max-h-72 overflow-y-auto rounded-md border border-slate-200 bg-white">
                  {restoreResult.results?.map((result) => (
                    <div key={result.table} className="border-b border-slate-100 px-3 py-2 text-xs last:border-b-0">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-semibold text-slate-800">
                          {t(`backup.table.${result.table}`, result.label)}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 font-medium ${
                            result.status === "failed"
                              ? "bg-rose-50 text-rose-700"
                              : result.status === "skipped"
                                ? "bg-slate-100 text-slate-600"
                                : "bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {result.status}
                        </span>
                      </div>
                      <p className="mt-1 text-slate-500">
                        {t("backup.rowsRestored", "{{count}} rows restored", {
                          count: result.restored_rows || 0
                        })}
                        {result.error ? ` - ${result.error}` : ""}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
