"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Eye,
  FileText,
  Loader2,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  Search
} from "lucide-react";
import AppLayout from "./AppLayout";
import FormInput from "./FormInput";
import Modal from "./Modal";
import PageHeader from "./PageHeader";
import {
  agingCategories,
  agingClass,
  apStatusClass,
  apStatuses,
  currencies,
  formatCurrency,
  formatDate,
  getAgingCategory,
  getAgingDays,
  paymentTerms,
  resolveApStatus,
  todayIso
} from "@/lib/accountPayable";
import { writeAuditLog } from "@/lib/audit";
import { fetchProfileByUserId } from "@/lib/profile";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";

const AP_SELECT = `
  *,
  suppliers(supplier_code, name, address),
  account_payable_items(
    id,
    account_payable_id,
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

const PO_SELECT = `
  id,
  po_number,
  order_date,
  total_amount,
  status,
  supplier_id,
  project_id,
  suppliers(supplier_code, name, address),
  projects(id, project_code, project_name),
  delivery_orders(id, do_number, delivery_date, status)
`;

function createInitialForm() {
  return {
    supplier_id: "",
    description: "",
    ap_date: todayIso(),
    payment_date: "",
    receive_date: todayIso(),
    due_date: "",
    receive_name: "",
    payment_term: "NET 30",
    remark: "",
    notes: "",
    currency: "IDR",
    status: "draft"
  };
}

function StatusBadge({ status }) {
  const value = status || "draft";

  return (
    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium capitalize ring-1 ${apStatusClass(value)}`}>
      {String(value).replaceAll("_", " ")}
    </span>
  );
}

function getFirstDeliveryOrder(po) {
  return Array.isArray(po?.delivery_orders) ? po.delivery_orders[0] : null;
}

function getFirstCostCode(po) {
  const firstItem = Array.isArray(po?.purchase_order_items) ? po.purchase_order_items[0] : null;
  return firstItem?.cost_codes || null;
}

function createItemFromPo(po, currency) {
  const deliveryOrder = getFirstDeliveryOrder(po);
  const costCode = getFirstCostCode(po);
  const amount = Number(po.total_amount || 0);

  return {
    tempId: po.id,
    purchase_order_id: po.id,
    delivery_order_id: deliveryOrder?.id || null,
    project_id: po.project_id || null,
    cost_code_id: costCode?.id || null,
    invoice_number: "",
    invoice_date: "",
    delivery_note_number: deliveryOrder?.do_number || "",
    delivery_note_date: deliveryOrder?.delivery_date || "",
    po_number: po.po_number || "",
    po_date: po.order_date || "",
    project_name: po.projects?.project_name || po.projects?.project_code || "",
    cost_code_label: [costCode?.code, costCode?.name].filter(Boolean).join(" - "),
    amount,
    tax_amount: 0,
    total_amount: amount,
    currency,
    status: "draft"
  };
}

function createItemFromExisting(item, currency) {
  return {
    tempId: item.purchase_order_id || item.id,
    id: item.id,
    purchase_order_id: item.purchase_order_id,
    delivery_order_id: item.delivery_order_id,
    project_id: item.project_id,
    cost_code_id: item.cost_code_id,
    invoice_number: item.invoice_number || "",
    invoice_date: item.invoice_date || "",
    delivery_note_number: item.delivery_note_number || "",
    delivery_note_date: item.delivery_note_date || "",
    po_number: item.po_number || "",
    po_date: item.po_date || "",
    project_name: item.project_name || "",
    cost_code_label: [item.cost_codes?.code, item.cost_codes?.name].filter(Boolean).join(" - "),
    amount: Number(item.amount || 0),
    tax_amount: Number(item.tax_amount || 0),
    total_amount: Number(item.total_amount || 0),
    currency: item.currency || currency,
    status: item.status || "draft"
  };
}

function createItemFromLegacyPayable(row, po) {
  const baseItem = createItemFromPo(po, row.currency || "IDR");

  return {
    ...baseItem,
    invoice_number: row.invoice_number || "",
    invoice_date: row.invoice_date || "",
    amount: Number(row.subtotal || row.amount || po.total_amount || 0),
    tax_amount: Number(row.tax_amount || 0),
    total_amount: Number(row.total_amount || row.amount || po.total_amount || 0),
    status: row.status || "draft"
  };
}

export default function FinancePayablesPage() {
  const [rows, setRows] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [availablePos, setAvailablePos] = useState([]);
  const [readyPos, setReadyPos] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [editingAp, setEditingAp] = useState(null);
  const [formData, setFormData] = useState(createInitialForm);
  const [selectedItems, setSelectedItems] = useState([]);
  const [formErrors, setFormErrors] = useState({});
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [poLoading, setPoLoading] = useState(false);
  const [readyPoLoading, setReadyPoLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");
  const [apSearch, setApSearch] = useState("");
  const [supplierSearch, setSupplierSearch] = useState("");
  const [poSearch, setPoSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [agingFilter, setAgingFilter] = useState("");
  const [dueBefore, setDueBefore] = useState("");

  const supabase = useMemo(() => {
    try {
      return createSupabaseBrowserClient();
    } catch {
      return null;
    }
  }, []);

  const canManage = profile?.role === "admin" || profile?.role === "finance";
  const supplierOptions = suppliers.map((supplier) => ({
    value: supplier.id,
    label: `${supplier.supplier_code || "-"} - ${supplier.name}`
  }));

  const selectedSupplier = suppliers.find((supplier) => supplier.id === formData.supplier_id);
  const totals = selectedItems.reduce(
    (summary, item) => ({
      subtotal: summary.subtotal + Number(item.amount || 0),
      tax: summary.tax + Number(item.tax_amount || 0),
      total: summary.total + Number(item.total_amount || 0)
    }),
    { subtotal: 0, tax: 0, total: 0 }
  );

  const filteredRows = rows.filter((row) => {
    const itemText = (row.account_payable_items || [])
      .map((item) => [item.po_number, item.invoice_number, item.project_name].join(" "))
      .join(" ")
      .toLowerCase();
    const resolvedStatus = resolveApStatus(row);

    if (apSearch && !String(row.ap_number || "").toLowerCase().includes(apSearch.toLowerCase())) {
      return false;
    }

    if (supplierSearch && !String(row.suppliers?.name || "").toLowerCase().includes(supplierSearch.toLowerCase())) {
      return false;
    }

    if (poSearch && !itemText.includes(poSearch.toLowerCase())) {
      return false;
    }

    if (statusFilter && resolvedStatus !== statusFilter) {
      return false;
    }

    if (agingFilter && getAgingCategory(row) !== agingFilter) {
      return false;
    }

    if (dueBefore && (!row.due_date || row.due_date > dueBefore)) {
      return false;
    }

    return true;
  });

  const agingSummary = rows.reduce(
    (summary, row) => {
      const category = getAgingCategory(row);
      summary[category] = (summary[category] || 0) + Number(row.total_amount || row.amount || 0);
      return summary;
    },
    { current: 0, "1-30": 0, "31-60": 0, "61-90": 0, over_90: 0 }
  );

  const loadRows = useCallback(async () => {
    if (!supabase) {
      setError("Supabase environment is not configured.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    const { data, error: queryError } = await supabase
      .from("account_payables")
      .select(AP_SELECT)
      .order("created_at", { ascending: false });

    if (queryError) {
      setError(queryError.message);
      setRows([]);
    } else {
      setRows(data || []);
    }

    setLoading(false);
  }, [supabase]);

  const loadSuppliers = useCallback(async () => {
    if (!supabase) {
      return;
    }

    const { data } = await supabase
      .from("suppliers")
      .select("id, supplier_code, name, address")
      .order("name", { ascending: true });

    setSuppliers(data || []);
  }, [supabase]);

  const loadReadyPurchaseOrders = useCallback(async () => {
    if (!supabase) {
      setReadyPoLoading(false);
      return;
    }

    setReadyPoLoading(true);

    const { data: poData, error: poError } = await supabase
      .from("purchase_orders")
      .select(PO_SELECT)
      .in("status", ["approved", "delivered"])
      .order("order_date", { ascending: false });

    if (poError) {
      setToast(poError.message);
      setReadyPos([]);
      setReadyPoLoading(false);
      return;
    }

    const [{ data: apItemData }, { data: legacyApData }] = await Promise.all([
      supabase
        .from("account_payable_items")
        .select("purchase_order_id")
        .not("purchase_order_id", "is", null),
      supabase
        .from("account_payables")
        .select("purchase_order_id")
        .not("purchase_order_id", "is", null)
    ]);

    const usedPoIds = new Set([
      ...(apItemData || []).map((item) => item.purchase_order_id),
      ...(legacyApData || []).map((item) => item.purchase_order_id)
    ]);

    setReadyPos((poData || []).filter((po) => !usedPoIds.has(po.id)));
    setReadyPoLoading(false);
  }, [supabase]);

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

    if (profileError) {
      setError(profileError.message);
      setProfile(null);
    } else {
      setProfile(currentProfile);
    }
  }, [supabase]);

  const loadPurchaseOrders = useCallback(
    async (supplierId, includePoIds = []) => {
      if (!supabase || !supplierId) {
        setAvailablePos([]);
        return;
      }

      setPoLoading(true);

      let query = supabase
        .from("purchase_orders")
        .select(PO_SELECT)
        .eq("supplier_id", supplierId)
        .order("order_date", { ascending: false });

      if (includePoIds.length) {
        query = query.or(`status.in.(approved,delivered),id.in.(${includePoIds.join(",")})`);
      } else {
        query = query.in("status", ["approved", "delivered"]);
      }

      const { data, error: queryError } = await query;

      if (queryError) {
        setToast(queryError.message);
        setAvailablePos([]);
      } else {
        setAvailablePos(data || []);
      }

      setPoLoading(false);
    },
    [supabase]
  );

  useEffect(() => {
    loadProfile();
    loadReadyPurchaseOrders();
    loadSuppliers();
    loadRows();
  }, [loadProfile, loadReadyPurchaseOrders, loadRows, loadSuppliers]);

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timer = window.setTimeout(() => setToast(""), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function resetForm() {
    setEditingAp(null);
    setFormData(createInitialForm());
    setSelectedItems([]);
    setFormErrors({});
    setAvailablePos([]);
  }

  function openCreateForm() {
    resetForm();
    setIsFormOpen(true);
  }

  async function openCreateFormFromPo(po) {
    setEditingAp(null);
    setFormData({
      ...createInitialForm(),
      supplier_id: po.supplier_id || "",
      description: `AP for ${po.po_number || "purchase order"}`
    });
    setSelectedItems([createItemFromPo(po, "IDR")]);
    setFormErrors({});
    setIsFormOpen(true);
    await loadPurchaseOrders(po.supplier_id, [po.id]);
  }

  async function openEditForm(row) {
    const existingItems = (row.account_payable_items || []).map((item) =>
      createItemFromExisting(item, row.currency || "IDR")
    );

    let selectedExistingItems = existingItems;

    if (!selectedExistingItems.length && row.purchase_order_id && supabase) {
      const { data: linkedPo } = await supabase
        .from("purchase_orders")
        .select(PO_SELECT)
        .eq("id", row.purchase_order_id)
        .single();

      if (linkedPo) {
        selectedExistingItems = [createItemFromLegacyPayable(row, linkedPo)];
      }
    }

    setEditingAp(row);
    setFormData({
      supplier_id: row.supplier_id || "",
      description: row.description || "",
      ap_date: row.ap_date || todayIso(),
      payment_date: row.payment_date || "",
      receive_date: row.receive_date || "",
      due_date: row.due_date || "",
      receive_name: row.receive_name || "",
      payment_term: row.payment_term || "NET 30",
      remark: row.remark || "",
      notes: row.notes || "",
      currency: row.currency || "IDR",
      status: row.status || "draft"
    });
    setSelectedItems(selectedExistingItems);
    setFormErrors({});
    setIsFormOpen(true);
    await loadPurchaseOrders(
      row.supplier_id,
      selectedExistingItems.map((item) => item.purchase_order_id).filter(Boolean)
    );
  }

  function handleInputChange(event) {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
    setFormErrors((current) => ({ ...current, [name]: undefined }));

    if (name === "supplier_id") {
      setSelectedItems([]);
      loadPurchaseOrders(value);
    }

    if (name === "currency") {
      setSelectedItems((current) => current.map((item) => ({ ...item, currency: value })));
    }
  }

  function togglePurchaseOrder(po) {
    setSelectedItems((current) => {
      const exists = current.some((item) => item.purchase_order_id === po.id);

      if (exists) {
        return current.filter((item) => item.purchase_order_id !== po.id);
      }

      if (!["approved", "delivered"].includes(po.status)) {
        setToast("Only approved or delivered purchase orders can be added to AP.");
        return current;
      }

      return [...current, createItemFromPo(po, formData.currency || "IDR")];
    });
  }

  function updateItem(tempId, name, value) {
    setSelectedItems((current) =>
      current.map((item) => {
        if (item.tempId !== tempId) {
          return item;
        }

        const nextItem = { ...item, [name]: value };

        if (name === "amount" || name === "tax_amount") {
          const amount = Number(name === "amount" ? value : nextItem.amount || 0);
          const taxAmount = Number(name === "tax_amount" ? value : nextItem.tax_amount || 0);
          nextItem.total_amount = amount + taxAmount;
        }

        return nextItem;
      })
    );
  }

  function validateForm() {
    const errors = {};

    if (!formData.supplier_id) {
      errors.supplier_id = "Supplier is required.";
    }

    if (!formData.ap_date) {
      errors.ap_date = "AP Date is required.";
    }

    if (!formData.due_date) {
      errors.due_date = "Due Date is required.";
    }

    if (!selectedItems.length) {
      errors.items = "Select at least one approved or delivered PO.";
    }

    const invoiceSet = new Set();
    selectedItems.forEach((item, index) => {
      const invoiceNumber = String(item.invoice_number || "").trim().toLowerCase();

      if (invoiceNumber && invoiceSet.has(invoiceNumber)) {
        errors[`invoice_number_${item.tempId}`] = "Invoice Number cannot be duplicated for the same supplier.";
      }

      if (invoiceNumber) {
        invoiceSet.add(invoiceNumber);
      }

      if (!item.invoice_date) {
        errors[`invoice_date_${item.tempId}`] = `Invoice Date is required for item ${index + 1}.`;
      }

      if (Number(item.amount || 0) < 0 || Number(item.tax_amount || 0) < 0 || Number(item.total_amount || 0) < 0) {
        errors[`amount_${item.tempId}`] = "Amount cannot be negative.";
      }
    });

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function checkDuplicateInvoices() {
    if (!supabase || !formData.supplier_id) {
      return "";
    }

    const invoiceNumbers = selectedItems
      .map((item) => String(item.invoice_number || "").trim())
      .filter(Boolean);

    if (!invoiceNumbers.length) {
      return "";
    }

    let query = supabase
      .from("account_payable_items")
      .select("id, invoice_number, account_payable_id, account_payables!inner(supplier_id)")
      .in("invoice_number", invoiceNumbers)
      .eq("account_payables.supplier_id", formData.supplier_id);

    if (editingAp?.id) {
      query = query.neq("account_payable_id", editingAp.id);
    }

    const { data, error: duplicateError } = await query;

    if (duplicateError) {
      return duplicateError.message;
    }

    if (data?.length) {
      return `Invoice Number ${data[0].invoice_number} already exists for this supplier.`;
    }

    return "";
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!canManage) {
      setToast("Only Finance or Admin can save Account Payable.");
      return;
    }

    if (!validateForm() || !supabase) {
      return;
    }

    setSubmitting(true);

    const duplicateMessage = await checkDuplicateInvoices();

    if (duplicateMessage) {
      setToast(duplicateMessage);
      setSubmitting(false);
      return;
    }

    const firstItem = selectedItems[0];
    const payload = {
      supplier_id: formData.supplier_id,
      purchase_order_id: firstItem?.purchase_order_id || null,
      description: formData.description || null,
      ap_date: formData.ap_date,
      payment_date: formData.payment_date || null,
      receive_date: formData.receive_date || null,
      due_date: formData.due_date,
      receive_name: formData.receive_name || null,
      payment_term: formData.payment_term || null,
      remark: formData.remark || null,
      notes: formData.notes || null,
      currency: formData.currency || "IDR",
      subtotal: totals.subtotal,
      tax_amount: totals.tax,
      total_amount: totals.total,
      amount: totals.total,
      paid_amount: formData.status === "paid" ? totals.total : 0,
      status: formData.payment_date ? "paid" : formData.status,
      invoice_number: firstItem?.invoice_number || null,
      invoice_date: firstItem?.invoice_date || null,
      updated_by: currentUser?.id || null
    };

    if (!editingAp) {
      payload.created_by = currentUser?.id || null;
    }

    const request = editingAp
      ? supabase.from("account_payables").update(payload).eq("id", editingAp.id)
      : supabase.from("account_payables").insert(payload);

    const { data: apData, error: saveError } = await request.select("id, ap_number").single();

    if (saveError) {
      setToast(saveError.message);
      setSubmitting(false);
      return;
    }

    if (editingAp) {
      const { error: deleteError } = await supabase
        .from("account_payable_items")
        .delete()
        .eq("account_payable_id", editingAp.id);

      if (deleteError) {
        setToast(deleteError.message);
        setSubmitting(false);
        return;
      }
    }

    const itemPayload = selectedItems.map((item) => ({
      account_payable_id: apData.id,
      purchase_order_id: item.purchase_order_id || null,
      delivery_order_id: item.delivery_order_id || null,
      project_id: item.project_id || null,
      cost_code_id: item.cost_code_id || null,
      invoice_number: item.invoice_number || null,
      invoice_date: item.invoice_date || null,
      delivery_note_number: item.delivery_note_number || null,
      delivery_note_date: item.delivery_note_date || null,
      po_number: item.po_number || null,
      po_date: item.po_date || null,
      project_name: item.project_name || null,
      amount: Number(item.amount || 0),
      tax_amount: Number(item.tax_amount || 0),
      total_amount: Number(item.total_amount || 0),
      currency: item.currency || formData.currency || "IDR",
      status: item.status || "draft"
    }));

    const { error: itemError } = await supabase.from("account_payable_items").insert(itemPayload);

    if (itemError) {
      setToast(itemError.message);
      setSubmitting(false);
      return;
    }

    if (payload.status === "paid") {
      await supabase
        .from("purchase_orders")
        .update({ payment_status: "paid", status: "paid" })
        .in("id", selectedItems.map((item) => item.purchase_order_id).filter(Boolean));
    }

    await writeAuditLog(supabase, {
      userId: currentUser?.id,
      action: editingAp ? "update_ap" : "create_ap",
      module: "Finance",
      tableName: "account_payables",
      recordId: apData.id,
      metadata: { ap_number: apData.ap_number, status: payload.status, total_amount: totals.total }
    });

    setToast(`Account Payable ${apData.ap_number || ""} saved successfully.`);
    setIsFormOpen(false);
    resetForm();
    setSubmitting(false);
    await loadRows();
    await loadReadyPurchaseOrders();
  }

  return (
    <AppLayout>
      <PageHeader
        title="Account Payable"
        description="Create AP receipts from approved or delivered purchase orders, track invoice status, and print Tanda Terima AP."
        eyebrow="Finance & Accounting"
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
              onClick={loadRows}
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <button
              type="button"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={openCreateForm}
              disabled={!canManage}
            >
              <Plus className="h-4 w-4" />
              New AP
            </button>
          </div>
        }
      />

      {toast ? (
        <div className="mb-4 rounded-lg border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-800">
          {toast}
        </div>
      ) : null}

      {error ? (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="mb-4 grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-6">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={apSearch}
            onChange={(event) => setApSearch(event.target.value)}
            placeholder="Search AP Number"
            className="h-10 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
          />
        </label>
        <input
          value={supplierSearch}
          onChange={(event) => setSupplierSearch(event.target.value)}
          placeholder="Search supplier/vendor"
          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
        />
        <input
          value={poSearch}
          onChange={(event) => setPoSearch(event.target.value)}
          placeholder="Search PO Number"
          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
        />
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
        >
          <option value="">All status</option>
          {apStatuses.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
        <select
          value={agingFilter}
          onChange={(event) => setAgingFilter(event.target.value)}
          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
        >
          <option value="">All aging</option>
          {agingCategories.map((category) => (
            <option key={category.value} value={category.value}>
              {category.label}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={dueBefore}
          onChange={(event) => setDueBefore(event.target.value)}
          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
          title="Filter due date before"
        />
      </div>

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
            <p className="mt-3 text-lg font-semibold text-slate-950">
              {formatCurrency(agingSummary[category.value] || 0, "IDR")}
            </p>
          </button>
        ))}
      </div>

      <div className="mb-5 overflow-hidden rounded-lg border border-cyan-100 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">PO Ready for AP</h2>
            <p className="text-xs text-slate-500">
              Approved or delivered purchase orders that have not been converted to Account Payable.
            </p>
          </div>
          <span className="rounded-full bg-cyan-50 px-2 py-1 text-xs font-medium text-cyan-700">
            {readyPoLoading ? "Loading" : `${readyPos.length} ready`}
          </span>
        </div>
        <div className="overflow-hidden">
          <table className="w-full table-fixed divide-y divide-slate-200">
            <colgroup>
              <col className="w-[12%]" />
              <col className="w-[17%]" />
              <col className="w-[25%]" />
              <col className="w-[12%]" />
              <col className="w-[14%]" />
              <col className="w-[10%]" />
              <col className="w-[10%]" />
            </colgroup>
            <thead className="bg-slate-50">
              <tr>
                {["PO Number", "Supplier", "Project", "PO Date", "Amount", "Status", "Action"].map((header) => (
                  <th
                    key={header}
                    className="truncate px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {readyPoLoading ? (
                <tr>
                  <td className="px-3 py-5 text-sm text-slate-500" colSpan={7}>
                    Loading ready purchase orders...
                  </td>
                </tr>
              ) : readyPos.length ? (
                readyPos.map((po) => (
                  <tr key={po.id} className="hover:bg-slate-50">
                    <td className="truncate px-3 py-3 text-sm font-semibold text-slate-900" title={po.po_number || "-"}>{po.po_number || "-"}</td>
                    <td className="truncate px-3 py-3 text-sm text-slate-700" title={po.suppliers?.name || "-"}>{po.suppliers?.name || "-"}</td>
                    <td className="truncate px-3 py-3 text-sm text-slate-600" title={po.projects?.project_name || po.projects?.project_code || "-"}>{po.projects?.project_name || po.projects?.project_code || "-"}</td>
                    <td className="truncate px-3 py-3 text-sm text-slate-600">{formatDate(po.order_date)}</td>
                    <td className="truncate px-3 py-3 text-sm font-medium text-slate-800" title={formatCurrency(po.total_amount, "IDR")}>{formatCurrency(po.total_amount, "IDR")}</td>
                    <td className="px-3 py-3 text-sm"><StatusBadge status={po.status} /></td>
                    <td className="px-3 py-3 text-sm">
                      <button
                        type="button"
                        className="inline-flex h-8 w-full items-center justify-center rounded-md bg-slate-900 px-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={() => openCreateFormFromPo(po)}
                        disabled={!canManage}
                      >
                        Create AP
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-3 py-5 text-sm text-slate-500" colSpan={7}>
                    No approved or delivered PO waiting for AP.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[1160px] divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                {["AP Number", "Supplier", "PO Number", "AP Date", "Due Date", "Aging", "Total", "Status", "Actions"].map((header) => (
                  <th key={header} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-slate-500" colSpan={9}>
                    Loading Account Payable...
                  </td>
                </tr>
              ) : filteredRows.length ? (
                filteredRows.map((row) => {
                  const resolvedStatus = resolveApStatus(row);
                  const agingCategory = getAgingCategory(row);
                  const poNumbers = (row.account_payable_items || []).map((item) => item.po_number).filter(Boolean).join(", ");

                  return (
                    <tr key={row.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm font-semibold text-slate-900">{row.ap_number || "-"}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{row.suppliers?.name || "-"}</td>
                      <td className="max-w-xs truncate px-4 py-3 text-sm text-slate-600">{poNumbers || "-"}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{formatDate(row.ap_date)}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{formatDate(row.due_date)}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ring-1 ${agingClass(agingCategory)}`}>
                          {agingCategory.replace("_", " ")} / {getAgingDays(row)}d
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-800">{formatCurrency(row.total_amount || row.amount, row.currency || "IDR")}</td>
                      <td className="px-4 py-3 text-sm"><StatusBadge status={resolvedStatus} /></td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex flex-wrap gap-1">
                          <Link
                            href={`/finance/account-payable/${row.id}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-cyan-700 hover:bg-cyan-50"
                            title="View Detail"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          <button
                            type="button"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                            onClick={() => openEditForm(row)}
                            disabled={!canManage}
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <Link
                            href={`/finance/account-payable/${row.id}/print`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100"
                            title="Print Tanda Terima"
                          >
                            <Printer className="h-4 w-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="px-4 py-8 text-center text-sm text-slate-500" colSpan={9}>
                    No Account Payable found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={isFormOpen}
        title={editingAp ? "Edit Account Payable" : "New Account Payable"}
        description="Select approved or delivered purchase orders, then complete invoice receipt information."
        onClose={submitting ? undefined : () => setIsFormOpen(false)}
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              className="inline-flex h-10 items-center rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-100"
              onClick={() => setIsFormOpen(false)}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="account-payable-form"
              className="inline-flex h-10 items-center gap-2 rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-70"
              disabled={submitting}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Save AP
            </button>
          </div>
        }
      >
        <form id="account-payable-form" onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormInput label="Vendor/Supplier" name="supplier_id" type="select" value={formData.supplier_id} onChange={handleInputChange} options={supplierOptions} required error={formErrors.supplier_id} />
            <FormInput label="Supplier Address" name="supplier_address" value={selectedSupplier?.address || ""} onChange={() => {}} placeholder="Auto from supplier" />
            <FormInput label="AP Date" name="ap_date" type="date" value={formData.ap_date} onChange={handleInputChange} required error={formErrors.ap_date} />
            <FormInput label="Receive Date" name="receive_date" type="date" value={formData.receive_date} onChange={handleInputChange} />
            <FormInput label="Due Date" name="due_date" type="date" value={formData.due_date} onChange={handleInputChange} required error={formErrors.due_date} />
            <FormInput label="Payment Date" name="payment_date" type="date" value={formData.payment_date} onChange={handleInputChange} />
            <FormInput label="Receive Name" name="receive_name" value={formData.receive_name} onChange={handleInputChange} />
            <FormInput label="Payment Term" name="payment_term" type="select" value={formData.payment_term} onChange={handleInputChange} options={paymentTerms} />
            <FormInput label="Currency" name="currency" type="select" value={formData.currency} onChange={handleInputChange} options={currencies} />
            <FormInput label="Status" name="status" type="select" value={formData.status} onChange={handleInputChange} options={apStatuses} />
            <div className="sm:col-span-2">
              <FormInput label="Description" name="description" type="textarea" value={formData.description} onChange={handleInputChange} rows={2} />
            </div>
            <div className="sm:col-span-2">
              <FormInput label="Remark" name="remark" type="textarea" value={formData.remark} onChange={handleInputChange} rows={2} />
            </div>
            <div className="sm:col-span-2">
              <FormInput label="Notes/Catatan" name="notes" type="textarea" value={formData.notes} onChange={handleInputChange} rows={2} />
            </div>
          </div>

          <div className="rounded-lg border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Approved / Delivered PO</h3>
                <p className="text-xs text-slate-500">Select one or multiple PO from the selected supplier.</p>
              </div>
              {poLoading ? <Loader2 className="h-4 w-4 animate-spin text-slate-500" /> : null}
            </div>
            <div className="max-h-56 overflow-y-auto p-3">
              {!formData.supplier_id ? (
                <p className="text-sm text-slate-500">Select supplier first.</p>
              ) : availablePos.length ? (
                <div className="space-y-2">
                  {availablePos.map((po) => {
                    const selected = selectedItems.some((item) => item.purchase_order_id === po.id);

                    return (
                      <label key={po.id} className="flex cursor-pointer items-start gap-3 rounded-md border border-slate-200 p-3 hover:bg-slate-50">
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4 rounded border-slate-300 text-cyan-600"
                          checked={selected}
                          onChange={() => togglePurchaseOrder(po)}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-slate-900">{po.po_number}</span>
                          <span className="block text-xs text-slate-500">
                            {formatDate(po.order_date)} · {po.projects?.project_name || po.projects?.project_code || "No project"} · {formatCurrency(po.total_amount, formData.currency || "IDR")}
                          </span>
                        </span>
                        <StatusBadge status={po.status} />
                      </label>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No approved or delivered PO found for this supplier.</p>
              )}
            </div>
          </div>

          {formErrors.items ? <p className="text-sm font-medium text-rose-600">{formErrors.items}</p> : null}

          <div className="overflow-hidden rounded-lg border border-slate-200">
            <div className="border-b border-slate-200 px-4 py-3">
              <h3 className="text-sm font-semibold text-slate-900">AP Detail Items</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-[1180px] divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    {["PO", "Project", "Cost Code", "Invoice No", "Invoice Date", "Delivery Note", "Amount", "Tax", "Total"].map((header) => (
                      <th key={header} className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedItems.length ? (
                    selectedItems.map((item) => (
                      <tr key={item.tempId}>
                        <td className="px-3 py-2 text-sm font-medium text-slate-800">
                          {item.po_number || "-"}
                          <span className="block text-xs font-normal text-slate-500">{formatDate(item.po_date)}</span>
                        </td>
                        <td className="px-3 py-2 text-sm text-slate-600">{item.project_name || "-"}</td>
                        <td className="px-3 py-2 text-sm text-slate-600">{item.cost_code_label || "-"}</td>
                        <td className="px-3 py-2">
                          <input
                            value={item.invoice_number || "Auto generated"}
                            readOnly
                            className="h-9 w-40 rounded-md border border-slate-200 bg-slate-50 px-2 text-sm text-slate-500 outline-none"
                            title="Invoice number is generated automatically on save."
                          />
                          {formErrors[`invoice_number_${item.tempId}`] ? (
                            <span className="mt-1 block text-xs text-rose-600">{formErrors[`invoice_number_${item.tempId}`]}</span>
                          ) : null}
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="date"
                            value={item.invoice_date}
                            onChange={(event) => updateItem(item.tempId, "invoice_date", event.target.value)}
                            className="h-9 w-36 rounded-md border border-slate-300 px-2 text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
                          />
                          {formErrors[`invoice_date_${item.tempId}`] ? (
                            <span className="mt-1 block text-xs text-rose-600">{formErrors[`invoice_date_${item.tempId}`]}</span>
                          ) : null}
                        </td>
                        <td className="px-3 py-2 text-sm text-slate-600">
                          <input
                            value={item.delivery_note_number}
                            onChange={(event) => updateItem(item.tempId, "delivery_note_number", event.target.value)}
                            className="h-9 w-36 rounded-md border border-slate-300 px-2 text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
                          />
                          <input
                            type="date"
                            value={item.delivery_note_date || ""}
                            onChange={(event) => updateItem(item.tempId, "delivery_note_date", event.target.value)}
                            className="mt-1 h-9 w-36 rounded-md border border-slate-300 px-2 text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={item.amount}
                            onChange={(event) => updateItem(item.tempId, "amount", event.target.value)}
                            className="h-9 w-32 rounded-md border border-slate-300 px-2 text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={item.tax_amount}
                            onChange={(event) => updateItem(item.tempId, "tax_amount", event.target.value)}
                            className="h-9 w-28 rounded-md border border-slate-300 px-2 text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
                          />
                        </td>
                        <td className="px-3 py-2 text-sm font-semibold text-slate-900">{formatCurrency(item.total_amount, item.currency)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="px-3 py-5 text-sm text-slate-500" colSpan={9}>
                        No PO selected.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="grid gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3 text-sm sm:grid-cols-3">
              <div>Subtotal: <span className="font-semibold">{formatCurrency(totals.subtotal, formData.currency)}</span></div>
              <div>Tax: <span className="font-semibold">{formatCurrency(totals.tax, formData.currency)}</span></div>
              <div>Total: <span className="font-semibold">{formatCurrency(totals.total, formData.currency)}</span></div>
            </div>
          </div>

          {editingAp ? (
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
              <FileText className="h-4 w-4" />
              AP Number remains <span className="font-semibold text-slate-900">{editingAp.ap_number}</span>
            </div>
          ) : null}
        </form>
      </Modal>
    </AppLayout>
  );
}
