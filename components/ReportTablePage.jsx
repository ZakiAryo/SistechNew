"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Search, ShieldAlert } from "lucide-react";
import AppLayout from "./AppLayout";
import DataTable from "./DataTable";
import ExportActions from "./ExportActions";
import { useLanguage } from "./LanguageProvider";
import PageHeader from "./PageHeader";
import { fetchProfileByUserId, normalizeRole } from "@/lib/profile";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";

function getNestedValue(row, key) {
  return key.split(".").reduce((value, part) => value?.[part], row);
}

function flattenRows(rows, columns) {
  return rows.map((row) => {
    const output = {};
    columns.forEach((column) => {
      output[column.key] = getNestedValue(row, column.key);
    });
    return output;
  });
}

const EMPTY_ARRAY = [];

export default function ReportTablePage({
  title,
  description,
  tableName,
  selectQuery = "*",
  orderBy = "created_at",
  filters = EMPTY_ARRAY,
  searchColumns = EMPTY_ARRAY,
  columns = EMPTY_ARRAY,
  eyebrow = "Report",
  allowedRoles = EMPTY_ARRAY
}) {
  const { t } = useLanguage();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [access, setAccess] = useState({
    loading: Boolean(allowedRoles.length),
    canAccess: !allowedRoles.length,
    role: "",
    error: ""
  });
  const supabase = useMemo(() => {
    try {
      return createSupabaseBrowserClient();
    } catch {
      return null;
    }
  }, []);
  const normalizedAllowedRoles = useMemo(
    () => allowedRoles.map((role) => normalizeRole(role)).filter(Boolean),
    [allowedRoles]
  );
  const requiresRoleAccess = normalizedAllowedRoles.length > 0;
  const pageTitle = t(`page.${title}`, title);

  useEffect(() => {
    let active = true;

    async function checkReportAccess() {
      if (!requiresRoleAccess) {
        setAccess({
          loading: false,
          canAccess: true,
          role: "",
          error: ""
        });
        return;
      }

      if (!supabase) {
        setAccess({
          loading: false,
          canAccess: false,
          role: "",
          error: "Supabase environment is not configured. Check .env.local."
        });
        return;
      }

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;

      if (!active) {
        return;
      }

      if (sessionError || !user) {
        setAccess({
          loading: false,
          canAccess: false,
          role: "",
          error: sessionError?.message || "No active Supabase Auth session found. Please login again."
        });
        return;
      }

      const { profile, error: profileError } = await fetchProfileByUserId(supabase, user.id);

      if (!active) {
        return;
      }

      if (profileError) {
        setAccess({
          loading: false,
          canAccess: false,
          role: "",
          error: profileError.message
        });
        return;
      }

      const role = normalizeRole(profile.role);
      const canAccess = role === "admin" || normalizedAllowedRoles.includes(role);

      setAccess({
        loading: false,
        canAccess,
        role,
        error: canAccess
          ? ""
          : t("report.accessDenied", "Access denied. This report is only available for {{roles}} role.", {
              roles: normalizedAllowedRoles.join(", ")
            })
      });
    }

    checkReportAccess();

    return () => {
      active = false;
    };
  }, [normalizedAllowedRoles, requiresRoleAccess, supabase, t]);

  const loadRows = useCallback(async () => {
    if (!supabase) {
      setError("Supabase environment is not configured. Check .env.local.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    let query = supabase.from(tableName).select(selectQuery).order(orderBy, { ascending: false });

    filters.forEach((filter) => {
      if (filter.operator === "in") {
        query = query.in(filter.column, filter.value);
      } else if (filter.operator === "eq") {
        query = query.eq(filter.column, filter.value);
      } else if (filter.operator === "neq") {
        query = query.neq(filter.column, filter.value);
      }
    });

    const { data, error: queryError } = await query;

    if (queryError) {
      setRows([]);
      setError(queryError.message);
    } else {
      setRows(data || []);
    }

    setLoading(false);
  }, [filters, orderBy, selectQuery, supabase, tableName]);

  useEffect(() => {
    if (access.loading) {
      return;
    }

    if (!access.canAccess) {
      setRows([]);
      setLoading(false);
      return;
    }

    loadRows();
  }, [access.canAccess, access.loading, loadRows]);

  const visibleRows = useMemo(() => {
    if (!searchTerm.trim()) {
      return rows;
    }

    const normalizedSearch = searchTerm.toLowerCase();
    return rows.filter((row) =>
      searchColumns.some((key) => String(getNestedValue(row, key) || "").toLowerCase().includes(normalizedSearch))
    );
  }, [rows, searchColumns, searchTerm]);

  const exportRows = useMemo(() => flattenRows(visibleRows, columns), [columns, visibleRows]);

  return (
    <AppLayout>
      <PageHeader
        title={pageTitle}
        description={t(`pageDescription.${title}`, description)}
        eyebrow={t(`section.${eyebrow}`, eyebrow)}
        actions={access.canAccess ? <ExportActions title={pageTitle} columns={columns} rows={exportRows} /> : null}
      />

      {access.loading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500">
          {t("report.checkingAccess", "Checking report access")}
        </div>
      ) : null}

      {!access.loading && access.error ? (
        <div className="flex gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <ShieldAlert className="mt-0.5 h-4 w-4 flex-none" />
          <p>{access.error}</p>
        </div>
      ) : null}

      {!access.loading && access.canAccess ? (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="relative block w-full sm:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder={t("master.searchPlaceholder", "Search {{title}}", {
                  title: pageTitle.toLowerCase()
                })}
                className="h-10 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
              />
            </label>
            <button
              type="button"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
              onClick={loadRows}
            >
              <RefreshCw className="h-4 w-4" />
              {t("common.refresh", "Refresh")}
            </button>
          </div>

          <DataTable
            columns={columns}
            rows={visibleRows}
            loading={loading}
            error={error}
            emptyTitle={t("master.emptyTitle", "No {{title}} found", { title: pageTitle.toLowerCase() })}
            emptyDescription={t(
              "report.emptyDescription",
              "The report will populate when workflow transactions are available."
            )}
            canManage={false}
            onEdit={() => {}}
            onDelete={() => {}}
          />
        </>
      ) : null}
    </AppLayout>
  );
}
