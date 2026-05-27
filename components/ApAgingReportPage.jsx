"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Search, ShieldAlert } from "lucide-react";
import AppLayout from "./AppLayout";
import ExportActions from "./ExportActions";
import PageHeader from "./PageHeader";
import {
  agingCategories,
  agingClass,
  formatCurrency,
  formatDate,
  getAgingCategory,
  getAgingDays,
  resolveApStatus
} from "@/lib/accountPayable";
import { fetchProfileByUserId, normalizeRole } from "@/lib/profile";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";

const AP_AGING_SELECT = "*, suppliers(supplier_code, name), purchase_orders(po_number)";

export default function ApAgingReportPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [agingFilter, setAgingFilter] = useState("");
  const [access, setAccess] = useState({ loading: true, canAccess: false, error: "" });

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

    const { data, error: queryError } = await supabase
      .from("account_payables")
      .select(AP_AGING_SELECT)
      .order("due_date", { ascending: true });

    if (queryError) {
      setRows([]);
      setError(queryError.message);
    } else {
      setRows(data || []);
    }

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    let active = true;

    async function checkAccess() {
      if (!supabase) {
        setAccess({ loading: false, canAccess: false, error: "Supabase environment is not configured. Check .env.local." });
        return;
      }

      const { data } = await supabase.auth.getUser();
      const user = data?.user;

      if (!active) {
        return;
      }

      if (!user) {
        setAccess({ loading: false, canAccess: false, error: "No active Supabase Auth session found." });
        return;
      }

      const { profile, error: profileError } = await fetchProfileByUserId(supabase, user.id);

      if (!active) {
        return;
      }

      const role = normalizeRole(profile?.role);
      const canAccess = role === "admin" || role === "finance";

      setAccess({
        loading: false,
        canAccess,
        error: profileError?.message || (canAccess ? "" : "Access denied. This report is only available for finance role.")
      });
    }

    checkAccess();

    return () => {
      active = false;
    };
  }, [supabase]);

  useEffect(() => {
    if (!access.loading && access.canAccess) {
      loadRows();
    }
  }, [access.canAccess, access.loading, loadRows]);

  const visibleRows = rows.filter((row) => {
    const haystack = [row.ap_number, row.invoice_number, row.suppliers?.name, row.purchase_orders?.po_number, row.status]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (agingFilter && getAgingCategory(row) !== agingFilter) {
      return false;
    }

    return !searchTerm || haystack.includes(searchTerm.toLowerCase());
  });

  const summary = rows.reduce(
    (result, row) => {
      const category = getAgingCategory(row);
      result[category] = (result[category] || 0) + Number(row.total_amount || row.amount || 0);
      return result;
    },
    { current: 0, "1-30": 0, "31-60": 0, "61-90": 0, over_90: 0 }
  );

  const exportRows = visibleRows.map((row) => ({
    ap_number: row.ap_number,
    supplier: row.suppliers?.name,
    po_number: row.purchase_orders?.po_number,
    due_date: row.due_date,
    payment_term: row.payment_term,
    aging_days: getAgingDays(row),
    aging_category: getAgingCategory(row),
    total_amount: row.total_amount || row.amount,
    status: resolveApStatus(row)
  }));

  const exportColumns = [
    { key: "ap_number", label: "AP Number" },
    { key: "supplier", label: "Supplier" },
    { key: "po_number", label: "PO Number" },
    { key: "due_date", label: "Due Date" },
    { key: "payment_term", label: "Payment Term" },
    { key: "aging_days", label: "Aging Days" },
    { key: "aging_category", label: "Aging Category" },
    { key: "total_amount", label: "Total" },
    { key: "status", label: "Status" }
  ];

  return (
    <AppLayout>
      <PageHeader
        title="List AP Aging"
        description="Account payable aging report with 61-90 and over 90 day monitoring."
        eyebrow="Finance Report"
        actions={access.canAccess ? <ExportActions title="List AP Aging" columns={exportColumns} rows={exportRows} /> : null}
      />

      {access.loading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500">Checking report access</div>
      ) : null}

      {!access.loading && access.error ? (
        <div className="flex gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <ShieldAlert className="mt-0.5 h-4 w-4 flex-none" />
          <p>{access.error}</p>
        </div>
      ) : null}

      {!access.loading && access.canAccess ? (
        <>
          <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {agingCategories.map((category) => (
              <button
                key={category.value}
                type="button"
                className={`rounded-lg border bg-white p-4 text-left shadow-sm transition hover:border-cyan-200 ${
                  agingFilter === category.value ? "border-cyan-300 ring-2 ring-cyan-100" : "border-slate-200"
                }`}
                onClick={() => setAgingFilter((current) => (current === category.value ? "" : category.value))}
              >
                <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ring-1 ${agingClass(category.value)}`}>
                  {category.label}
                </span>
                <p className="mt-3 text-lg font-semibold text-slate-950">{formatCurrency(summary[category.value] || 0, "IDR")}</p>
              </button>
            ))}
          </div>

          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="relative block w-full sm:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search AP, supplier, PO"
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

          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-[1040px] divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    {["AP Number", "Supplier", "PO", "Due Date", "Payment Term", "Aging", "Total", "Status"].map((header) => (
                      <th key={header} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td className="px-4 py-6 text-sm text-slate-500" colSpan={8}>Loading AP aging...</td></tr>
                  ) : visibleRows.length ? (
                    visibleRows.map((row) => {
                      const category = getAgingCategory(row);

                      return (
                        <tr key={row.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-sm font-semibold text-slate-900">{row.ap_number || "-"}</td>
                          <td className="px-4 py-3 text-sm text-slate-700">{row.suppliers?.name || "-"}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">{row.purchase_orders?.po_number || "-"}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">{formatDate(row.due_date)}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">{row.payment_term || "-"}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ring-1 ${agingClass(category)}`}>
                              {category.replace("_", " ")} / {getAgingDays(row)}d
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-slate-800">{formatCurrency(row.total_amount || row.amount, row.currency || "IDR")}</td>
                          <td className="px-4 py-3 text-sm capitalize">{resolveApStatus(row).replaceAll("_", " ")}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr><td className="px-4 py-8 text-center text-sm text-slate-500" colSpan={8}>No AP aging found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </AppLayout>
  );
}
