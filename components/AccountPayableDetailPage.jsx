"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Loader2, Pencil, Printer, XCircle } from "lucide-react";
import AppLayout from "./AppLayout";
import PageHeader from "./PageHeader";
import { apStatusClass, formatCurrency, formatDate, resolveApStatus, todayIso } from "@/lib/accountPayable";
import { writeAuditLog } from "@/lib/audit";
import { fetchProfileByUserId } from "@/lib/profile";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";

const DETAIL_SELECT = `
  *,
  suppliers(supplier_code, name, address, contact_person, phone, email),
  created_by_profile:profiles!account_payables_created_by_fkey(full_name, email),
  updated_by_profile:profiles!account_payables_updated_by_fkey(full_name, email),
  account_payable_items(
    id,
    purchase_order_id,
    delivery_order_id,
    project_id,
    cost_code_id,
    invoice_number,
    invoice_date,
    delivery_note_number,
    delivery_note_date,
    po_number,
    po_date,
    project_name,
    amount,
    tax_amount,
    total_amount,
    currency,
    status
  )
`;

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium capitalize ring-1 ${apStatusClass(status)}`}>
      {String(status || "draft").replaceAll("_", " ")}
    </span>
  );
}

export default function AccountPayableDetailPage({ id }) {
  const [record, setRecord] = useState(null);
  const [profile, setProfile] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const supabase = useMemo(() => {
    try {
      return createSupabaseBrowserClient();
    } catch {
      return null;
    }
  }, []);

  const canManage = profile?.role === "admin" || profile?.role === "finance";
  const resolvedStatus = resolveApStatus(record);

  const loadRecord = useCallback(async () => {
    if (!supabase || !id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    const { data, error: queryError } = await supabase
      .from("account_payables")
      .select(DETAIL_SELECT)
      .eq("id", id)
      .single();

    if (queryError) {
      setError(queryError.message);
      setRecord(null);
    } else {
      setRecord(data);
    }

    setLoading(false);
  }, [id, supabase]);

  const loadProfile = useCallback(async () => {
    if (!supabase) {
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    setCurrentUser(user || null);

    if (!user) {
      return;
    }

    const { profile: currentProfile, error: profileError } = await fetchProfileByUserId(supabase, user.id);

    if (!profileError) {
      setProfile(currentProfile);
    }
  }, [supabase]);

  useEffect(() => {
    loadProfile();
    loadRecord();
  }, [loadProfile, loadRecord]);

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timer = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function updateStatus(nextStatus) {
    if (!supabase || !record || !canManage) {
      return;
    }

    setUpdating(nextStatus);

    const payload = {
      status: nextStatus,
      updated_by: currentUser?.id || null,
      payment_date: nextStatus === "paid" ? record.payment_date || todayIso() : record.payment_date,
      paid_amount: nextStatus === "paid" ? record.total_amount || record.amount || 0 : record.paid_amount || 0
    };

    const { error: updateError } = await supabase
      .from("account_payables")
      .update(payload)
      .eq("id", record.id);

    if (updateError) {
      setToast(updateError.message);
      setUpdating("");
      return;
    }

    if (nextStatus === "paid") {
      await supabase
        .from("purchase_orders")
        .update({ payment_status: "paid", status: "paid" })
        .in(
          "id",
          (record.account_payable_items || [])
            .map((item) => item.purchase_order_id)
            .filter(Boolean)
        );
    }

    await writeAuditLog(supabase, {
      userId: currentUser?.id,
      action: "change_ap_status",
      module: "Finance",
      tableName: "account_payables",
      recordId: record.id,
      metadata: { from: record.status, to: nextStatus, ap_number: record.ap_number }
    });

    setToast(`AP status updated to ${nextStatus.replaceAll("_", " ")}.`);
    setUpdating("");
    await loadRecord();
  }

  return (
    <AppLayout>
      <PageHeader
        title={record?.ap_number || "Account Payable Detail"}
        description="AP receipt, supplier, invoice, payment, and purchase order detail."
        eyebrow="Finance & Accounting"
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/finance/account-payable"
              className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
            {record ? (
              <Link
                href={`/finance/account-payable/${record.id}/print`}
                className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                <Printer className="h-4 w-4" />
                Print
              </Link>
            ) : null}
            {record && canManage ? (
              <Link
                href="/finance/account-payable"
                className="inline-flex h-10 items-center gap-2 rounded-md bg-slate-900 px-3 text-sm font-medium text-white hover:bg-slate-800"
              >
                <Pencil className="h-4 w-4" />
                Edit from List
              </Link>
            ) : null}
          </div>
        }
      />

      {toast ? (
        <div className="mb-4 rounded-lg border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-800">
          {toast}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500">
          Loading AP detail...
        </div>
      ) : error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
      ) : record ? (
        <div className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-3">
            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Header AP</h2>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-4"><dt className="text-slate-500">AP Number</dt><dd className="font-semibold text-slate-900">{record.ap_number}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-slate-500">AP Date</dt><dd>{formatDate(record.ap_date)}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-slate-500">Status</dt><dd><StatusBadge status={resolvedStatus} /></dd></div>
                <div className="flex justify-between gap-4"><dt className="text-slate-500">Currency</dt><dd>{record.currency || "IDR"}</dd></div>
              </dl>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Supplier</h2>
              <div className="mt-3 text-sm text-slate-700">
                <p className="font-semibold text-slate-900">{record.suppliers?.name || "-"}</p>
                <p className="mt-1 text-slate-500">{record.suppliers?.address || "-"}</p>
                <p className="mt-1 text-slate-500">{record.suppliers?.phone || record.suppliers?.email || ""}</p>
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Payment</h2>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-4"><dt className="text-slate-500">Receive Date</dt><dd>{formatDate(record.receive_date)}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-slate-500">Due Date</dt><dd>{formatDate(record.due_date)}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-slate-500">Payment Date</dt><dd>{formatDate(record.payment_date)}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-slate-500">Payment Term</dt><dd>{record.payment_term || "-"}</dd></div>
              </dl>
            </section>
          </div>

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Workflow Action</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                ["received", "Mark as Received", CheckCircle2],
                ["waiting_payment", "Mark as Waiting Payment", CheckCircle2],
                ["paid", "Mark as Paid", CheckCircle2],
                ["cancelled", "Cancel", XCircle]
              ].map(([status, label, Icon]) => (
                <button
                  key={status}
                  type="button"
                  className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={() => updateStatus(status)}
                  disabled={!canManage || updating === status || record.status === status}
                >
                  {updating === status ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
                  {label}
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-4 py-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Invoice / PO Detail</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-[1080px] divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    {["Invoice", "Invoice Date", "Delivery Note", "Delivery Date", "PO", "PO Date", "Project", "Cost Code", "Amount", "Tax", "Total"].map((header) => (
                      <th key={header} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(record.account_payable_items || []).map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">{item.invoice_number || "-"}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{formatDate(item.invoice_date)}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{item.delivery_note_number || "-"}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{formatDate(item.delivery_note_date)}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{item.po_number || "-"}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{formatDate(item.po_date)}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{item.project_name || "-"}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{[item.cost_codes?.code, item.cost_codes?.name].filter(Boolean).join(" - ") || "-"}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{formatCurrency(item.amount, item.currency || record.currency)}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{formatCurrency(item.tax_amount, item.currency || record.currency)}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-900">{formatCurrency(item.total_amount, item.currency || record.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="grid gap-3 border-t border-slate-200 bg-slate-50 px-4 py-4 text-sm sm:grid-cols-3">
              <div>Subtotal: <span className="font-semibold">{formatCurrency(record.subtotal, record.currency)}</span></div>
              <div>Tax: <span className="font-semibold">{formatCurrency(record.tax_amount, record.currency)}</span></div>
              <div>Total: <span className="font-semibold">{formatCurrency(record.total_amount || record.amount, record.currency)}</span></div>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Description / Remark</h2>
              <p className="mt-3 text-sm text-slate-700">{record.description || "-"}</p>
              <p className="mt-2 text-sm text-slate-500">{record.remark || record.notes || "-"}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Created / Updated</h2>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-4"><dt className="text-slate-500">Create Name</dt><dd>{record.created_by_profile?.full_name || record.created_by_profile?.email || "-"}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-slate-500">Create Date</dt><dd>{formatDate(record.created_at)}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-slate-500">Update Name</dt><dd>{record.updated_by_profile?.full_name || record.updated_by_profile?.email || "-"}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-slate-500">Update Date</dt><dd>{formatDate(record.updated_at)}</dd></div>
              </dl>
            </div>
          </section>
        </div>
      ) : null}
    </AppLayout>
  );
}
