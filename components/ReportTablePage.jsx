"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Search } from "lucide-react";
import AppLayout from "./AppLayout";
import DataTable from "./DataTable";
import ExportActions from "./ExportActions";
import PageHeader from "./PageHeader";
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

export default function ReportTablePage({
  title,
  description,
  tableName,
  selectQuery = "*",
  orderBy = "created_at",
  filters = [],
  searchColumns,
  columns,
  eyebrow = "Report"
}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const supabase = useMemo(() => {
    try {
      return createSupabaseBrowserClient();
    } catch {
      return null;
    }
  }, []);

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
    loadRows();
  }, [loadRows]);

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
        title={title}
        description={description}
        eyebrow={eyebrow}
        actions={<ExportActions title={title} columns={columns} rows={exportRows} />}
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative block w-full sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder={`Search ${title.toLowerCase()}`}
            className="h-10 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
          />
        </label>
        <button
          type="button"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
          onClick={loadRows}
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <DataTable
        columns={columns}
        rows={visibleRows}
        loading={loading}
        error={error}
        emptyTitle={`No ${title.toLowerCase()} found`}
        emptyDescription="The report will populate when workflow transactions are available."
        canManage={false}
        onEdit={() => {}}
        onDelete={() => {}}
      />
    </AppLayout>
  );
}
