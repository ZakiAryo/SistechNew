"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, FileSearch, Loader2, RefreshCw, Search } from "lucide-react";
import AppLayout from "./AppLayout";
import FormInput from "./FormInput";
import Modal from "./Modal";
import PageHeader from "./PageHeader";
import { writeAuditLog } from "@/lib/audit";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";

const poStatusOptions = [
  { value: "waiting", label: "Waiting" },
  { value: "approved", label: "Approved" }
];

function currency(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

export default function PurchaseRequestInbox() {
  const [rows, setRows] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedPr, setSelectedPr] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState("");
  const [createdPoReportHref, setCreatedPoReportHref] = useState("");
  const [formData, setFormData] = useState({
    supplier_id: "",
    order_date: "",
    total_amount: "",
    status: "waiting"
  });

  const supabase = useMemo(() => {
    try {
      return createSupabaseBrowserClient();
    } catch {
      return null;
    }
  }, []);

  const supplierOptions = suppliers.map((supplier) => ({
    value: supplier.id,
    label: `${supplier.supplier_code || "-"} - ${supplier.name}`
  }));

  const filteredRows = rows.filter((row) => {
    const haystack = [
      row.pr_number,
      row.projects?.project_code,
      row.projects?.project_name,
      row.items?.item_code,
      row.items?.name,
      row.item_summary,
      row.status
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

    const [{ data: prData }, { data: supplierData }, { data: userData }] = await Promise.all([
      supabase
        .from("purchase_requests")
        .select("*, projects(project_code, project_name), items(item_code, name)")
        .in("status", ["pending", "processed", "approved"])
        .order("created_at", { ascending: false }),
      supabase.from("suppliers").select("id, supplier_code, name").order("name"),
      supabase.auth.getUser()
    ]);

    setRows(prData || []);
    setSuppliers(supplierData || []);
    setCurrentUser(userData?.user || null);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  function openProcessModal(row) {
    setCreatedPoReportHref("");
    setSelectedPr(row);
    setFormData({
      supplier_id: "",
      order_date: new Date().toISOString().slice(0, 10),
      total_amount: row.estimated_amount || "",
      status: "waiting"
    });
  }

  function handleInputChange(event) {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  }

  async function handleCreatePo(event) {
    event.preventDefault();

    if (!supabase || !selectedPr || !formData.supplier_id) {
      setToast("Supplier is required.");
      return;
    }

    setSubmitting(true);

    const { data: poData, error: poError } = await supabase
      .from("purchase_orders")
      .insert({
        purchase_request_id: selectedPr.id,
        supplier_id: formData.supplier_id,
        project_id: selectedPr.project_id,
        item_id: selectedPr.item_id || null,
        status: formData.status,
        order_date: formData.order_date || null,
        total_amount: Number(formData.total_amount || 0),
        payment_status: "unpaid",
        delivery_status: "waiting",
        approved_by: formData.status === "approved" ? currentUser?.id : null,
        approved_at: formData.status === "approved" ? new Date().toISOString() : null
      })
      .select("id, po_number")
      .single();

    if (poError) {
      setToast(poError.message);
      setSubmitting(false);
      return;
    }

    await supabase
      .from("purchase_requests")
      .update({
        status: formData.status === "approved" ? "approved" : "processed",
        approved_by: formData.status === "approved" ? currentUser?.id : null,
        approved_at: formData.status === "approved" ? new Date().toISOString() : null
      })
      .eq("id", selectedPr.id);

    await supabase.from("delivery_orders").insert({
      purchase_order_id: poData.id,
      status: "waiting"
    });

    await writeAuditLog(supabase, {
      userId: currentUser?.id,
      action: "convert_pr_to_po",
      module: "Purchasing",
      tableName: "purchase_orders",
      recordId: poData.id,
      metadata: { purchase_request_id: selectedPr.id, ...formData }
    });

    setToast("Purchase Order created. Delivery Order and PO vs Payment data are now linked.");
    setCreatedPoReportHref(`/reports/purchase-orders/${poData.id}`);
    setSelectedPr(null);
    setSubmitting(false);
    await loadRows();
  }

  return (
    <AppLayout>
      <PageHeader
        title="Incoming Purchase Requests"
        description="Purchasing can see Engineering purchase requests and convert them into purchase orders."
        eyebrow="Purchasing"
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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>{toast}</span>
            {createdPoReportHref ? (
              <Link href={createdPoReportHref} className="font-semibold text-cyan-800 underline underline-offset-2">
                View PO Report
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}

      <label className="relative mb-4 block max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search incoming PR"
          className="h-10 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
        />
      </label>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                {["PR Number", "Project", "Item", "Summary", "Amount", "Status", "Action"].map((header) => (
                  <th key={header} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-slate-500" colSpan={7}>Loading incoming requests...</td>
                </tr>
              ) : filteredRows.length ? (
                filteredRows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3 text-sm font-medium text-slate-800">{row.pr_number || "-"}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{row.projects?.project_code || "-"}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{row.items?.item_code || row.items?.name || "-"}</td>
                    <td className="max-w-md px-4 py-3 text-sm text-slate-600">{row.item_summary || "-"}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{currency(row.estimated_amount)}</td>
                    <td className="px-4 py-3 text-sm capitalize text-slate-600">{row.status}</td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/reports/purchase-requests/${row.id}`}
                          className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
                        >
                          <FileSearch className="h-4 w-4" />
                          Report
                        </Link>
                        <button
                          type="button"
                          className="inline-flex h-9 items-center rounded-md bg-slate-900 px-3 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                          onClick={() => openProcessModal(row)}
                          disabled={row.status === "approved"}
                        >
                          Convert to PO
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-6 text-sm text-slate-500" colSpan={7}>No incoming purchase requests.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={Boolean(selectedPr)}
        title="Create Purchase Order"
        description="Convert Engineering PR into a supplier purchase order."
        onClose={submitting ? undefined : () => setSelectedPr(null)}
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="inline-flex h-10 items-center rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-100"
              onClick={() => setSelectedPr(null)}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="create-po-form"
              className="inline-flex h-10 items-center gap-2 rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-70"
              disabled={submitting}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Create PO
            </button>
          </div>
        }
      >
        <form id="create-po-form" onSubmit={handleCreatePo} className="grid gap-4 sm:grid-cols-2">
          <FormInput label="Supplier" name="supplier_id" type="select" value={formData.supplier_id} onChange={handleInputChange} options={supplierOptions} required />
          <FormInput label="Order Date" name="order_date" type="date" value={formData.order_date} onChange={handleInputChange} />
          <FormInput label="Total Amount" name="total_amount" type="number" value={formData.total_amount} onChange={handleInputChange} />
          <FormInput label="PO Status" name="status" type="select" value={formData.status} onChange={handleInputChange} options={poStatusOptions} required />
        </form>
      </Modal>
    </AppLayout>
  );
}
