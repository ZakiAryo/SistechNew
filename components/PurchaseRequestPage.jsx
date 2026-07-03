"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import AppLayout from "./AppLayout";
import ConfirmDialog from "./ConfirmDialog";
import DataTable from "./DataTable";
import FormInput from "./FormInput";
import Modal from "./Modal";
import PageHeader from "./PageHeader";
import { writeAuditLog } from "@/lib/audit";
import { canProfileAccessPath } from "@/lib/menuConfig";
import { fetchProfileByUserId } from "@/lib/profile";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";

const priorityOptions = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" }
];

const emptyItem = {
  item_id: "",
  item_name: "",
  cost_code_id: "",
  quantity: "1",
  unit: "",
  estimated_price: "0",
  item_summary: ""
};

function currency(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function getItemLabel(item) {
  return [item?.item_code, item?.name].filter(Boolean).join(" - ");
}

function normalizeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function buildItemDisplay(row) {
  const details = Array.isArray(row.purchase_request_items) ? row.purchase_request_items : [];

  if (details.length) {
    return details.map((item) => item.item_name || item.items?.name || item.items?.item_code).filter(Boolean).join(", ");
  }

  return row.items?.item_code || row.items?.name || "-";
}

function buildSummaryDisplay(row) {
  const details = Array.isArray(row.purchase_request_items) ? row.purchase_request_items : [];

  if (details.length) {
    return details.map((item) => item.description).filter(Boolean).join(" | ") || row.item_summary || "-";
  }

  return row.item_summary || "-";
}

function mapRow(row) {
  const itemCount = Array.isArray(row.purchase_request_items) && row.purchase_request_items.length
    ? row.purchase_request_items.length
    : row.item_id
      ? 1
      : 0;

  return {
    ...row,
    item_count: itemCount,
    item_display: buildItemDisplay(row),
    item_summary_display: buildSummaryDisplay(row)
  };
}

export default function PurchaseRequestPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [rows, setRows] = useState([]);
  const [projects, setProjects] = useState([]);
  const [items, setItems] = useState([]);
  const [costCodes, setCostCodes] = useState([]);
  const [profile, setProfile] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [recordToDelete, setRecordToDelete] = useState(null);
  const [formData, setFormData] = useState({
    project_id: "",
    request_date: "",
    needed_date: "",
    priority: "normal",
    notes: ""
  });
  const [requestItems, setRequestItems] = useState([{ ...emptyItem }]);

  const supabase = useMemo(() => {
    try {
      return createSupabaseBrowserClient();
    } catch {
      return null;
    }
  }, []);

  const canManage = Boolean(
    profile?.role &&
      (profile.role === "admin" || profile.role === "engineering" || canProfileAccessPath(profile, pathname))
  );

  const projectOptions = projects.map((project) => ({
    value: project.id,
    label: [project.project_code, project.project_name].filter(Boolean).join(" - ")
  }));

  const itemOptions = items.map((item) => ({
    value: item.id,
    label: getItemLabel(item),
    item
  }));

  const costCodeOptions = costCodes.map((costCode) => ({
    value: costCode.id,
    label: [costCode.code, costCode.name].filter(Boolean).join(" - ")
  }));

  const visibleRows = useMemo(() => {
    const mappedRows = rows.map(mapRow);

    if (!searchTerm.trim()) {
      return mappedRows;
    }

    const keyword = searchTerm.trim().toLowerCase();

    return mappedRows.filter((row) => {
      return [
        row.pr_number,
        row.projects?.project_code,
        row.projects?.project_name,
        row.item_display,
        row.item_summary_display,
        row.priority,
        row.status
      ]
        .join(" ")
        .toLowerCase()
        .includes(keyword);
    });
  }, [rows, searchTerm]);

  const totalAmount = requestItems.reduce((total, item) => {
    return total + normalizeNumber(item.quantity, 1) * normalizeNumber(item.estimated_price, 0);
  }, 0);

  const loadProfile = useCallback(async () => {
    if (!supabase) {
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;

    if (!user) {
      return;
    }

    setCurrentUser(user);

    const { profile: currentProfile, error: profileError } = await fetchProfileByUserId(supabase, user.id);

    if (profileError) {
      setError(profileError.message);
      setProfile(null);
      return;
    }

    setProfile(currentProfile);
  }, [supabase]);

  const loadLookups = useCallback(async () => {
    if (!supabase) {
      return;
    }

    const [projectResult, itemResult, costCodeResult] = await Promise.all([
      supabase.from("projects").select("id, project_code, project_name").order("project_name"),
      supabase.from("items").select("id, item_code, name, unit").order("name"),
      supabase.from("cost_codes").select("id, code, name").order("code")
    ]);

    setProjects(projectResult.data || []);
    setItems(itemResult.data || []);
    setCostCodes(costCodeResult.data || []);
  }, [supabase]);

  const loadRows = useCallback(async () => {
    if (!supabase) {
      setError("Supabase environment is not configured. Check .env.local.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    const { data, error: queryError } = await supabase
      .from("purchase_requests")
      .select(`
        *,
        projects(project_code, project_name),
        items(item_code, name, unit),
        purchase_request_items(
          id,
          item_id,
          item_name,
          description,
          quantity,
          unit,
          estimated_price,
          cost_code_id,
          items(item_code, name, unit),
          cost_codes(code, name)
        )
      `)
      .order("created_at", { ascending: false });

    if (queryError) {
      setError(queryError.message);
      setRows([]);
    } else {
      setRows(data || []);
    }

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadProfile();
    loadLookups();
    loadRows();
  }, [loadLookups, loadProfile, loadRows]);

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function resetForm() {
    setFormData({
      project_id: "",
      request_date: new Date().toISOString().slice(0, 10),
      needed_date: "",
      priority: "normal",
      notes: ""
    });
    setRequestItems([{ ...emptyItem }]);
    setFormErrors({});
  }

  function openCreateForm() {
    if (!canManage) {
      setToast({ type: "error", message: "Your role is not allowed to add purchase requests." });
      return;
    }

    setEditingRecord(null);
    resetForm();
    setIsFormOpen(true);
  }

  function openEditForm(record) {
    if (!canManage) {
      setToast({ type: "error", message: "Your role is not allowed to edit purchase requests." });
      return;
    }

    const detailItems = Array.isArray(record.purchase_request_items) && record.purchase_request_items.length
      ? record.purchase_request_items.map((item) => ({
          item_id: item.item_id || "",
          item_name: item.item_name || item.items?.name || "",
          cost_code_id: item.cost_code_id || "",
          quantity: item.quantity ?? "1",
          unit: item.unit || item.items?.unit || "",
          estimated_price: item.estimated_price ?? "0",
          item_summary: item.description || ""
        }))
      : [
          {
            item_id: record.item_id || "",
            item_name: record.items?.name || record.item_summary || "",
            cost_code_id: "",
            quantity: record.quantity ?? "1",
            unit: record.unit || record.items?.unit || "",
            estimated_price: record.estimated_unit_price ?? "0",
            item_summary: record.item_summary || ""
          }
        ];

    setEditingRecord(record);
    setFormData({
      project_id: record.project_id || "",
      request_date: record.request_date || "",
      needed_date: record.needed_date || "",
      priority: record.priority || "normal",
      notes: record.notes || ""
    });
    setRequestItems(detailItems);
    setFormErrors({});
    setIsFormOpen(true);
  }

  function handleHeaderChange(event) {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
    setFormErrors((current) => ({ ...current, [name]: undefined }));
  }

  function updateRequestItem(index, nextValues) {
    setRequestItems((current) => {
      return current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...nextValues } : item));
    });
    setFormErrors((current) => ({ ...current, [`item_${index}`]: undefined }));
  }

  function handleItemNameChange(index, value) {
    const normalized = value.trim().toLowerCase();
    const matched = itemOptions.find((option) => {
      return (
        option.label.toLowerCase() === normalized ||
        option.item.name?.toLowerCase() === normalized ||
        option.item.item_code?.toLowerCase() === normalized
      );
    });

    updateRequestItem(index, {
      item_name: matched ? matched.item.name : value,
      item_id: matched ? matched.value : "",
      unit: matched?.item.unit || requestItems[index]?.unit || ""
    });
  }

  function addItem() {
    setRequestItems((current) => [...current, { ...emptyItem }]);
  }

  function removeItem(index) {
    setRequestItems((current) => {
      if (current.length === 1) {
        return current;
      }

      return current.filter((_, itemIndex) => itemIndex !== index);
    });
  }

  function validateForm() {
    const errors = {};

    if (!formData.project_id) {
      errors.project_id = "Project is required.";
    }

    requestItems.forEach((item, index) => {
      if (!String(item.item_name || "").trim()) {
        errors[`item_${index}`] = "Item / Barang is required.";
      }

      if (!String(item.item_summary || "").trim()) {
        errors[`summary_${index}`] = "Item Summary is required.";
      }
    });

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function buildItemPayloads(purchaseRequestId) {
    return requestItems.map((item) => {
      const quantity = normalizeNumber(item.quantity, 1);
      const estimatedPrice = normalizeNumber(item.estimated_price, 0);

      return {
        purchase_request_id: purchaseRequestId,
        item_id: item.item_id || null,
        cost_code_id: item.cost_code_id || null,
        item_name: String(item.item_name || "").trim(),
        description: String(item.item_summary || "").trim(),
        quantity,
        unit: String(item.unit || "").trim() || null,
        estimated_price: estimatedPrice
      };
    });
  }

  function buildHeaderPayload() {
    const firstItem = requestItems[0] || emptyItem;
    const combinedSummary = requestItems
      .map((item, index) => `${index + 1}. ${String(item.item_summary || item.item_name || "").trim()}`)
      .filter(Boolean)
      .join("\n");

    return {
      project_id: formData.project_id || null,
      request_date: formData.request_date || null,
      needed_date: formData.needed_date || null,
      priority: formData.priority || "normal",
      notes: String(formData.notes || "").trim() || null,
      item_id: firstItem.item_id || null,
      quantity: normalizeNumber(firstItem.quantity, 1),
      unit: String(firstItem.unit || "").trim() || null,
      estimated_unit_price: normalizeNumber(firstItem.estimated_price, 0),
      estimated_amount: totalAmount,
      item_summary: combinedSummary || null
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!canManage) {
      setToast({ type: "error", message: "Your role is not allowed to save purchase requests." });
      return;
    }

    if (!validateForm() || !supabase) {
      return;
    }

    setSubmitting(true);

    const headerPayload = buildHeaderPayload();
    if (!editingRecord) {
      headerPayload.requested_by = currentUser?.id || null;
      headerPayload.status = "pending";
    }

    const request = editingRecord
      ? supabase.from("purchase_requests").update(headerPayload).eq("id", editingRecord.id)
      : supabase.from("purchase_requests").insert(headerPayload);

    const { data: prData, error: prError } = await request.select("id").single();

    if (prError) {
      setToast({ type: "error", message: prError.message });
      setSubmitting(false);
      return;
    }

    const purchaseRequestId = prData.id;

    if (editingRecord) {
      const { error: deleteItemsError } = await supabase
        .from("purchase_request_items")
        .delete()
        .eq("purchase_request_id", purchaseRequestId);

      if (deleteItemsError) {
        setToast({ type: "error", message: deleteItemsError.message });
        setSubmitting(false);
        return;
      }
    }

    const { error: itemError } = await supabase
      .from("purchase_request_items")
      .insert(buildItemPayloads(purchaseRequestId));

    if (itemError) {
      setToast({ type: "error", message: itemError.message });
      setSubmitting(false);
      return;
    }

    await writeAuditLog(supabase, {
      userId: currentUser?.id,
      action: editingRecord ? "update" : "create",
      module: "Purchase Request",
      tableName: "purchase_requests",
      recordId: purchaseRequestId,
      metadata: { ...headerPayload, item_count: requestItems.length }
    });

    setToast({ type: "success", message: "Purchase Request saved. Opening preview report..." });
    setIsFormOpen(false);
    setSubmitting(false);
    router.push(`/reports/purchase-requests/${purchaseRequestId}`);
  }

  async function handleDelete() {
    if (!recordToDelete || !supabase) {
      return;
    }

    setDeleting(true);

    const { error: deleteError } = await supabase
      .from("purchase_requests")
      .delete()
      .eq("id", recordToDelete.id);

    if (deleteError) {
      setToast({ type: "error", message: deleteError.message });
    } else {
      await writeAuditLog(supabase, {
        userId: currentUser?.id,
        action: "delete",
        module: "Purchase Request",
        tableName: "purchase_requests",
        recordId: recordToDelete.id,
        metadata: recordToDelete
      });
      setToast({ type: "success", message: "Purchase Request deleted successfully." });
      setRecordToDelete(null);
      await loadRows();
    }

    setDeleting(false);
  }

  return (
    <AppLayout>
      <PageHeader
        title="Input Purchase Request"
        description="Create purchase requests based on Marketing project data. Submitted PRs are automatically visible to Purchasing."
        eyebrow="Master Data"
        actions={
          <>
            <button
              type="button"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
              onClick={loadRows}
            >
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              type="button"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={openCreateForm}
              disabled={!canManage}
            >
              <Plus className="h-4 w-4" />
              Add
            </button>
          </>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative block w-full sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search input purchase request"
            className="h-10 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
          />
        </label>
        <p className="text-sm text-slate-500">
          Showing <span className="font-semibold text-slate-700">{visibleRows.length}</span> of {rows.length} records
        </p>
      </div>

      <DataTable
        columns={[
          { key: "pr_number", label: "PR Number" },
          { key: "projects.project_code", label: "Project" },
          { key: "item_count", label: "Items" },
          { key: "item_display", label: "Item / Barang" },
          { key: "item_summary_display", label: "Item Summary" },
          { key: "estimated_amount", label: "Est. Amount", format: "currency" },
          { key: "priority", label: "Priority", format: "badge" },
          { key: "status", label: "Status", format: "badge" }
        ]}
        rows={visibleRows}
        loading={loading}
        error={error}
        emptyTitle="No input purchase request found"
        emptyDescription="Create a purchase request to start the Engineering workflow."
        onEdit={openEditForm}
        onDelete={setRecordToDelete}
        canManage={canManage}
        detailBasePath="/reports/purchase-requests"
      />

      <Modal
        open={isFormOpen}
        title={editingRecord ? "Edit Purchase Request" : "Add Purchase Request"}
        description="Fill required fields and add one or more request items."
        onClose={submitting ? undefined : () => setIsFormOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
              onClick={() => setIsFormOpen(false)}
              disabled={submitting}
            >
              Batal
            </button>
            <button
              type="submit"
              form="purchase-request-form"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={submitting}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Simpan
            </button>
          </div>
        }
      >
        <form id="purchase-request-form" onSubmit={handleSubmit} className="space-y-5">
          <section className="grid gap-4 sm:grid-cols-2">
            <FormInput
              label="Project"
              name="project_id"
              type="select"
              value={formData.project_id}
              onChange={handleHeaderChange}
              options={projectOptions}
              required
              error={formErrors.project_id}
            />
            <FormInput
              label="Priority"
              name="priority"
              type="select"
              value={formData.priority}
              onChange={handleHeaderChange}
              options={priorityOptions}
              required
            />
            <FormInput label="Request Date" name="request_date" type="date" value={formData.request_date} onChange={handleHeaderChange} />
            <FormInput label="Needed Date" name="needed_date" type="date" value={formData.needed_date} onChange={handleHeaderChange} />
          </section>

          <section className="rounded-lg border border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Purchase Request Items</h3>
                <p className="mt-1 text-xs text-slate-500">Pilih item master atau ketik nama barang bebas.</p>
              </div>
              <button
                type="button"
                className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
                onClick={addItem}
              >
                <Plus className="h-4 w-4" />
                Tambah Item
              </button>
            </div>

            <datalist id="purchase-request-item-options">
              {itemOptions.map((option) => (
                <option key={option.value} value={option.label} />
              ))}
            </datalist>

            <div className="divide-y divide-slate-100">
              {requestItems.map((item, index) => (
                <div key={index} className="grid gap-4 px-4 py-4 sm:grid-cols-2">
                  <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
                    <span>
                      Item / Barang <span className="text-rose-600">*</span>
                    </span>
                    <input
                      list="purchase-request-item-options"
                      value={item.item_name || ""}
                      onChange={(event) => handleItemNameChange(index, event.target.value)}
                      placeholder="Ketik nama barang atau pilih dari master item"
                      className="mt-1 block h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
                    />
                    {item.item_id ? <span className="mt-1 block text-xs text-slate-500">Linked to master item.</span> : null}
                    {formErrors[`item_${index}`] ? <span className="mt-1 block text-xs font-medium text-rose-600">{formErrors[`item_${index}`]}</span> : null}
                  </label>

                  <FormInput
                    label="Cost Code"
                    name={`cost_code_${index}`}
                    type="select"
                    value={item.cost_code_id}
                    onChange={(event) => updateRequestItem(index, { cost_code_id: event.target.value })}
                    options={costCodeOptions}
                  />
                  <FormInput
                    label="Unit"
                    name={`unit_${index}`}
                    value={item.unit}
                    onChange={(event) => updateRequestItem(index, { unit: event.target.value })}
                    placeholder="pcs, set, meter"
                  />
                  <FormInput
                    label="Quantity"
                    name={`quantity_${index}`}
                    type="number"
                    value={item.quantity}
                    onChange={(event) => updateRequestItem(index, { quantity: event.target.value })}
                  />
                  <FormInput
                    label="Est. Unit Price"
                    name={`estimated_price_${index}`}
                    type="number"
                    value={item.estimated_price}
                    onChange={(event) => updateRequestItem(index, { estimated_price: event.target.value })}
                  />
                  <div className="sm:col-span-2">
                    <FormInput
                      label="Item Summary"
                      name={`item_summary_${index}`}
                      type="textarea"
                      value={item.item_summary}
                      onChange={(event) => updateRequestItem(index, { item_summary: event.target.value })}
                      rows={3}
                      required
                      error={formErrors[`summary_${index}`]}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:col-span-2">
                    <p className="text-sm text-slate-500">
                      Item total: <span className="font-semibold text-slate-800">{currency(normalizeNumber(item.quantity, 1) * normalizeNumber(item.estimated_price, 0))}</span>
                    </p>
                    <button
                      type="button"
                      className="inline-flex h-9 items-center gap-2 rounded-md border border-rose-200 bg-white px-3 text-sm font-medium text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={() => removeItem(index)}
                      disabled={requestItems.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                      Hapus Item
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <FormInput
              label="Notes"
              name="notes"
              type="textarea"
              value={formData.notes}
              onChange={handleHeaderChange}
              rows={3}
            />
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <p className="text-xs uppercase tracking-wider text-slate-500">Estimated Amount</p>
              <p className="mt-1 text-lg font-semibold text-slate-950">{currency(totalAmount)}</p>
            </div>
          </section>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(recordToDelete)}
        title="Delete Purchase Request"
        description="Are you sure you want to delete this purchase request?"
        loading={deleting}
        onCancel={() => setRecordToDelete(null)}
        onConfirm={handleDelete}
      />

      {toast ? (
        <div
          className={`fixed right-4 top-4 z-[60] flex max-w-sm items-start gap-3 rounded-lg border bg-white p-4 text-sm shadow-soft ${
            toast.type === "success"
              ? "border-emerald-200 text-emerald-800"
              : "border-rose-200 text-rose-800"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 flex-none" />
          )}
          <p>{toast.message}</p>
        </div>
      ) : null}
    </AppLayout>
  );
}

