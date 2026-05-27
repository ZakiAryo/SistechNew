"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, Pencil, Plus, RefreshCw, Search } from "lucide-react";
import AppLayout from "./AppLayout";
import FormInput from "./FormInput";
import Modal from "./Modal";
import PageHeader from "./PageHeader";
import { formatCurrency, formatDate, paymentTerms, todayIso } from "@/lib/accountPayable";
import { writeAuditLog } from "@/lib/audit";
import { fetchProfileByUserId } from "@/lib/profile";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";

const AR_SELECT = `
  *,
  contracts(contract_number, contract_title, contract_value, payment_term, due_date),
  customers(customer_code, name),
  projects(project_code, project_name)
`;

const CONTRACT_SELECT = `
  id,
  contract_number,
  contract_title,
  contract_value,
  payment_term,
  due_date,
  status,
  project_id,
  customer_id,
  customers(customer_code, name),
  projects(project_code, project_name)
`;

const arStatuses = [
  { value: "draft", label: "Draft" },
  { value: "invoiced", label: "Invoiced" },
  { value: "partial_paid", label: "Partial Paid" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
  { value: "cancelled", label: "Cancelled" }
];

function createInitialForm() {
  return {
    contract_id: "",
    project_id: "",
    customer_id: "",
    contract_number: "",
    contract_value: "0",
    payment_term: "",
    invoice_date: todayIso(),
    due_date: "",
    amount: "0",
    paid_amount: "0",
    status: "draft",
    payment_date: "",
    notes: ""
  };
}

function resolveArStatus(row) {
  if (!row) {
    return "draft";
  }

  if (["paid", "cancelled", "overdue"].includes(row.status)) {
    return row.status;
  }

  if (row.due_date && row.due_date < todayIso()) {
    return "overdue";
  }

  return row.status || "draft";
}

function statusClass(status) {
  const value = String(status || "").toLowerCase();

  if (value === "paid") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  }

  if (value === "invoiced" || value === "partial_paid") {
    return "bg-cyan-50 text-cyan-700 ring-cyan-100";
  }

  if (value === "draft") {
    return "bg-amber-50 text-amber-700 ring-amber-100";
  }

  if (value === "overdue" || value === "cancelled") {
    return "bg-rose-50 text-rose-700 ring-rose-100";
  }

  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium capitalize ring-1 ${statusClass(status)}`}>
      {String(status || "draft").replaceAll("_", " ")}
    </span>
  );
}

export default function AccountReceivablePage() {
  const [rows, setRows] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [profile, setProfile] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [formData, setFormData] = useState(createInitialForm);
  const [formErrors, setFormErrors] = useState({});
  const [editingRecord, setEditingRecord] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const supabase = useMemo(() => {
    try {
      return createSupabaseBrowserClient();
    } catch {
      return null;
    }
  }, []);

  const canManage = profile?.role === "admin" || profile?.role === "finance";

  const contractOptions = contracts.map((contract) => ({
    value: contract.id,
    label: `${contract.contract_number || "-"} - ${contract.contract_title || contract.customers?.name || "Contract"}`
  }));

  const visibleRows = rows.filter((row) => {
    const resolvedStatus = resolveArStatus(row);
    const haystack = [
      row.invoice_number,
      row.contract_number,
      row.contracts?.contract_number,
      row.customers?.name,
      row.projects?.project_name,
      row.status
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (statusFilter && resolvedStatus !== statusFilter) {
      return false;
    }

    return !searchTerm || haystack.includes(searchTerm.toLowerCase());
  });

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
    } else {
      setProfile(currentProfile);
    }
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
      .from("account_receivables")
      .select(AR_SELECT)
      .order("created_at", { ascending: false });

    if (queryError) {
      setRows([]);
      setError(queryError.message);
    } else {
      setRows(data || []);
    }

    setLoading(false);
  }, [supabase]);

  const loadContracts = useCallback(async () => {
    if (!supabase) {
      return;
    }

    const { data, error: queryError } = await supabase
      .from("contracts")
      .select(CONTRACT_SELECT)
      .not("status", "eq", "cancelled")
      .order("contract_date", { ascending: false });

    if (queryError) {
      setContracts([]);
      setError(queryError.message);
    } else {
      setContracts(data || []);
    }
  }, [supabase]);

  useEffect(() => {
    loadProfile();
    loadContracts();
    loadRows();
  }, [loadContracts, loadProfile, loadRows]);

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timer = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function applyContract(contractId) {
    const contract = contracts.find((item) => item.id === contractId);

    if (!contract) {
      setFormData((current) => ({
        ...current,
        contract_id: contractId
      }));
      return;
    }

    setFormData((current) => ({
      ...current,
      contract_id: contract.id,
      project_id: contract.project_id || "",
      customer_id: contract.customer_id || "",
      contract_number: contract.contract_number || "",
      contract_value: String(contract.contract_value || 0),
      payment_term: contract.payment_term || "",
      due_date: contract.due_date || current.due_date,
      amount: String(contract.contract_value || current.amount || 0)
    }));
  }

  function handleInputChange(event) {
    const { name, value } = event.target;

    if (name === "contract_id") {
      applyContract(value);
    } else {
      setFormData((current) => ({ ...current, [name]: value }));
    }

    setFormErrors((current) => ({ ...current, [name]: undefined }));
  }

  function openCreateForm(contractId = "") {
    if (!canManage) {
      setToast("Your role is not allowed to create Account Receivable.");
      return;
    }

    setEditingRecord(null);
    setFormErrors({});
    setFormData(createInitialForm());
    setIsFormOpen(true);

    if (contractId) {
      window.setTimeout(() => applyContract(contractId), 0);
    }
  }

  function openEditForm(row) {
    if (!canManage) {
      setToast("Your role is not allowed to edit Account Receivable.");
      return;
    }

    setEditingRecord(row);
    setFormErrors({});
    setFormData({
      contract_id: row.contract_id || "",
      project_id: row.project_id || "",
      customer_id: row.customer_id || "",
      contract_number: row.contract_number || row.contracts?.contract_number || "",
      contract_value: String(row.contract_value || row.contracts?.contract_value || 0),
      payment_term: row.payment_term || row.contracts?.payment_term || "",
      invoice_date: row.invoice_date || todayIso(),
      due_date: row.due_date || "",
      amount: String(row.amount || 0),
      paid_amount: String(row.paid_amount || 0),
      status: row.status || "draft",
      payment_date: row.payment_date || "",
      notes: row.notes || ""
    });
    setIsFormOpen(true);
  }

  function validateForm() {
    const errors = {};

    if (!formData.contract_id) {
      errors.contract_id = "Contract is required.";
    }

    if (!formData.customer_id || !formData.project_id) {
      errors.contract_id = "Select a valid contract with customer and project.";
    }

    if (!formData.invoice_date) {
      errors.invoice_date = "Invoice date is required.";
    }

    if (!formData.due_date) {
      errors.due_date = "Due date is required.";
    }

    if (Number(formData.amount || 0) < 0 || Number(formData.paid_amount || 0) < 0) {
      errors.amount = "Amount cannot be negative.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!validateForm() || !supabase || !canManage) {
      return;
    }

    setSubmitting(true);
    const payload = {
      contract_id: formData.contract_id,
      project_id: formData.project_id,
      customer_id: formData.customer_id,
      contract_number: formData.contract_number || null,
      contract_value: Number(formData.contract_value || 0),
      payment_term: formData.payment_term || null,
      invoice_date: formData.invoice_date || null,
      due_date: formData.due_date || null,
      amount: Number(formData.amount || 0),
      paid_amount: Number(formData.paid_amount || 0),
      status: formData.payment_date ? "paid" : formData.status,
      payment_date: formData.payment_date || null,
      notes: formData.notes || null,
      updated_by: currentUser?.id || null
    };

    if (!editingRecord) {
      payload.created_by = currentUser?.id || null;
    }

    const request = editingRecord
      ? supabase.from("account_receivables").update(payload).eq("id", editingRecord.id)
      : supabase.from("account_receivables").insert(payload);

    const { data, error: mutationError } = await request.select("id, invoice_number").single();

    if (mutationError) {
      setToast(mutationError.message);
      setSubmitting(false);
      return;
    }

    await writeAuditLog(supabase, {
      userId: currentUser?.id,
      action: editingRecord ? "update_ar" : "create_ar_from_contract",
      module: "Finance",
      tableName: "account_receivables",
      recordId: data?.id || editingRecord?.id,
      metadata: payload
    });

    setToast(`Account Receivable ${data?.invoice_number || ""} saved successfully.`);
    setIsFormOpen(false);
    setSubmitting(false);
    await loadRows();
  }

  return (
    <AppLayout>
      <PageHeader
        title="Account Receivable"
        description="Create customer invoices from Marketing contracts and track payment status."
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
              onClick={() => openCreateForm()}
              disabled={!canManage}
            >
              <Plus className="h-4 w-4" />
              New AR
            </button>
          </div>
        }
      />

      {toast ? <div className="mb-4 rounded-lg border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-800">{toast}</div> : null}
      {error ? <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div> : null}

      <div className="mb-5 grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-3">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search invoice, contract, customer"
            className="h-10 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
          />
        </label>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
        >
          <option value="">All status</option>
          {arStatuses.map((status) => (
            <option key={status.value} value={status.value}>{status.label}</option>
          ))}
        </select>
        <p className="flex items-center text-sm text-slate-500">
          Showing <span className="mx-1 font-semibold text-slate-800">{visibleRows.length}</span> of {rows.length} records
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[1080px] divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                {["Invoice", "Contract", "Customer", "Project", "Due Date", "Amount", "Paid", "Status", "Actions"].map((header) => (
                  <th key={header} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td className="px-4 py-6 text-sm text-slate-500" colSpan={9}>Loading Account Receivable...</td></tr>
              ) : visibleRows.length ? (
                visibleRows.map((row) => {
                  const resolvedStatus = resolveArStatus(row);

                  return (
                    <tr key={row.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm font-semibold text-slate-900">{row.invoice_number || "-"}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{row.contract_number || row.contracts?.contract_number || "-"}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{row.customers?.name || "-"}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{row.projects?.project_code || row.projects?.project_name || "-"}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{formatDate(row.due_date)}</td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-800">{formatCurrency(row.amount, row.currency || "IDR")}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{formatCurrency(row.paid_amount, row.currency || "IDR")}</td>
                      <td className="px-4 py-3 text-sm"><StatusBadge status={resolvedStatus} /></td>
                      <td className="px-4 py-3 text-sm">
                        <button
                          type="button"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                          onClick={() => openEditForm(row)}
                          disabled={!canManage}
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr><td className="px-4 py-8 text-center text-sm text-slate-500" colSpan={9}>No Account Receivable found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={isFormOpen}
        title={editingRecord ? "Edit Account Receivable" : "New Account Receivable"}
        description="Select a Marketing contract, then complete invoice and payment information."
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
              form="account-receivable-form"
              className="inline-flex h-10 items-center gap-2 rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-70"
              disabled={submitting}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Save AR
            </button>
          </div>
        }
      >
        <form id="account-receivable-form" onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <FormInput label="Contract" name="contract_id" type="select" value={formData.contract_id} onChange={handleInputChange} options={contractOptions} required error={formErrors.contract_id} />
          <FormInput label="Contract Number" name="contract_number" value={formData.contract_number} onChange={() => {}} placeholder="Auto from contract" readOnly />
          <FormInput label="Customer" name="customer_display" value={contracts.find((contract) => contract.id === formData.contract_id)?.customers?.name || ""} onChange={() => {}} placeholder="Auto from contract" readOnly />
          <FormInput label="Project" name="project_display" value={contracts.find((contract) => contract.id === formData.contract_id)?.projects?.project_name || ""} onChange={() => {}} placeholder="Auto from contract" readOnly />
          <FormInput label="Contract Value" name="contract_value" type="number" value={formData.contract_value} onChange={handleInputChange} />
          <FormInput label="Payment Term" name="payment_term" type="select" value={formData.payment_term} onChange={handleInputChange} options={paymentTerms} placeholder="Select payment term" />
          <FormInput label="Invoice Date" name="invoice_date" type="date" value={formData.invoice_date} onChange={handleInputChange} required error={formErrors.invoice_date} />
          <FormInput label="Due Date" name="due_date" type="date" value={formData.due_date} onChange={handleInputChange} required error={formErrors.due_date} />
          <FormInput label="Amount" name="amount" type="number" value={formData.amount} onChange={handleInputChange} error={formErrors.amount} />
          <FormInput label="Paid Amount" name="paid_amount" type="number" value={formData.paid_amount} onChange={handleInputChange} />
          <FormInput label="Status" name="status" type="select" value={formData.status} onChange={handleInputChange} options={arStatuses} required />
          <FormInput label="Payment Date" name="payment_date" type="date" value={formData.payment_date} onChange={handleInputChange} />
          <div className="sm:col-span-2">
            <FormInput label="Notes" name="notes" type="textarea" value={formData.notes} onChange={handleInputChange} />
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
