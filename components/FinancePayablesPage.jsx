"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, RefreshCw, Search } from "lucide-react";
import AppLayout from "./AppLayout";
import FormInput from "./FormInput";
import Modal from "./Modal";
import PageHeader from "./PageHeader";
import { writeAuditLog } from "@/lib/audit";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";

const paymentStatusOptions = [
  { value: "unpaid", label: "Unpaid" },
  { value: "partial", label: "Partial" },
  { value: "paid", label: "Paid" }
];

function currency(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

export default function FinancePayablesPage() {
  const [rows, setRows] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedPo, setSelectedPo] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState("");
  const [formData, setFormData] = useState({
    invoice_number: "",
    invoice_date: "",
    due_date: "",
    amount: "",
    paid_amount: "",
    status: "unpaid",
    payment_date: "",
    notes: ""
  });

  const supabase = useMemo(() => {
    try {
      return createSupabaseBrowserClient();
    } catch {
      return null;
    }
  }, []);

  const filteredRows = rows.filter((row) => {
    const haystack = [
      row.po_number,
      row.suppliers?.name,
      row.projects?.project_code,
      row.status,
      row.payment_status
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(searchTerm.toLowerCase());
  });

  const loadRows = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const [{ data: poData }, { data: userData }] = await Promise.all([
      supabase
        .from("purchase_orders")
        .select("*, suppliers(supplier_code, name), projects(project_code, project_name)")
        .in("status", ["approved", "delivered", "paid"])
        .order("created_at", { ascending: false }),
      supabase.auth.getUser()
    ]);

    setRows(poData || []);
    setCurrentUser(userData?.user || null);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  function openPaymentModal(row) {
    setSelectedPo(row);
    setFormData({
      invoice_number: row.po_number ? row.po_number.replace("PO", "INV") : "",
      invoice_date: new Date().toISOString().slice(0, 10),
      due_date: "",
      amount: row.total_amount || "",
      paid_amount: row.payment_status === "paid" ? row.total_amount || "" : "",
      status: row.payment_status || "unpaid",
      payment_date: "",
      notes: ""
    });
  }

  function handleInputChange(event) {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  }

  async function handlePayment(event) {
    event.preventDefault();

    if (!supabase || !selectedPo) {
      return;
    }

    setSubmitting(true);
    const amount = Number(formData.amount || 0);
    const paidAmount = Number(formData.paid_amount || 0);
    const nextPoStatus = formData.status === "paid" ? "paid" : selectedPo.status;

    const { data: payable, error } = await supabase
      .from("account_payables")
      .insert({
        purchase_order_id: selectedPo.id,
        supplier_id: selectedPo.supplier_id,
        invoice_number: formData.invoice_number || null,
        invoice_date: formData.invoice_date || null,
        due_date: formData.due_date || null,
        amount,
        paid_amount: paidAmount,
        status: formData.status,
        payment_date: formData.payment_date || null,
        notes: formData.notes || null
      })
      .select("id")
      .single();

    if (error) {
      setToast(error.message);
      setSubmitting(false);
      return;
    }

    await supabase
      .from("purchase_orders")
      .update({
        payment_status: formData.status,
        status: nextPoStatus
      })
      .eq("id", selectedPo.id);

    if (paidAmount > 0) {
      await supabase.from("cash_bank_transactions").insert({
        transaction_type: "out",
        source_module: "account_payables",
        reference_id: payable.id,
        description: `Payment for ${selectedPo.po_number || "purchase order"}`,
        amount: paidAmount,
        status: "posted",
        created_by: currentUser?.id
      });

      await supabase.from("accounting_entries").insert({
        source_module: "account_payables",
        source_id: payable.id,
        account_code: "AP",
        description: `AP payment for ${selectedPo.po_number || "purchase order"}`,
        debit: amount,
        credit: paidAmount,
        created_by: currentUser?.id
      });
    }

    await writeAuditLog(supabase, {
      userId: currentUser?.id,
      action: "process_payment",
      module: "Finance",
      tableName: "account_payables",
      recordId: payable.id,
      metadata: { purchase_order_id: selectedPo.id, ...formData }
    });

    setToast("Payment status updated and accounting transaction recorded.");
    setSelectedPo(null);
    setSubmitting(false);
    await loadRows();
  }

  return (
    <AppLayout>
      <PageHeader
        title="Account Payable"
        description="Approved Purchasing POs appear here for Finance payment processing."
        eyebrow="Finance & Accounting"
        actions={
          <button
            type="button"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
            onClick={loadRows}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        }
      />

      {toast ? (
        <div className="mb-4 rounded-lg border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-800">
          {toast}
        </div>
      ) : null}

      <label className="relative mb-4 block max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search approved PO"
          className="h-10 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
        />
      </label>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                {["PO Number", "Supplier", "Project", "Amount", "PO Status", "Payment", "Action"].map((header) => (
                  <th key={header} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-slate-500" colSpan={7}>Loading approved purchase orders...</td>
                </tr>
              ) : filteredRows.length ? (
                filteredRows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3 text-sm font-medium text-slate-800">{row.po_number || "-"}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{row.suppliers?.name || "-"}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{row.projects?.project_code || "-"}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{currency(row.total_amount)}</td>
                    <td className="px-4 py-3 text-sm capitalize text-slate-600">{row.status}</td>
                    <td className="px-4 py-3 text-sm capitalize text-slate-600">{row.payment_status}</td>
                    <td className="px-4 py-3 text-sm">
                      <button
                        type="button"
                        className="inline-flex h-9 items-center rounded-md bg-slate-900 px-3 text-sm font-medium text-white hover:bg-slate-800"
                        onClick={() => openPaymentModal(row)}
                      >
                        Process Payment
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-6 text-sm text-slate-500" colSpan={7}>No approved purchase orders available.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={Boolean(selectedPo)}
        title="Process Payment"
        description="Record account payable and update purchase order payment status."
        onClose={submitting ? undefined : () => setSelectedPo(null)}
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="inline-flex h-10 items-center rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-100"
              onClick={() => setSelectedPo(null)}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="payment-form"
              className="inline-flex h-10 items-center gap-2 rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-70"
              disabled={submitting}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Save Payment
            </button>
          </div>
        }
      >
        <form id="payment-form" onSubmit={handlePayment} className="grid gap-4 sm:grid-cols-2">
          <FormInput label="Invoice Number" name="invoice_number" value={formData.invoice_number} onChange={handleInputChange} />
          <FormInput label="Invoice Date" name="invoice_date" type="date" value={formData.invoice_date} onChange={handleInputChange} />
          <FormInput label="Due Date" name="due_date" type="date" value={formData.due_date} onChange={handleInputChange} />
          <FormInput label="Amount" name="amount" type="number" value={formData.amount} onChange={handleInputChange} />
          <FormInput label="Paid Amount" name="paid_amount" type="number" value={formData.paid_amount} onChange={handleInputChange} />
          <FormInput label="Status" name="status" type="select" value={formData.status} onChange={handleInputChange} options={paymentStatusOptions} />
          <FormInput label="Payment Date" name="payment_date" type="date" value={formData.payment_date} onChange={handleInputChange} />
          <div className="sm:col-span-2">
            <FormInput label="Notes" name="notes" type="textarea" value={formData.notes} onChange={handleInputChange} />
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
