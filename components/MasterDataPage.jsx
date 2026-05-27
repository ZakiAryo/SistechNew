"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2, Plus, RefreshCw, Search, ShieldAlert } from "lucide-react";
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

function getNestedValue(row, key) {
  return key.split(".").reduce((value, part) => value?.[part], row);
}

function createEmptyFormData(fields) {
  return fields.reduce((formData, field) => {
    formData[field.name] = field.defaultValue || "";
    return formData;
  }, {});
}

function buildOptionLabel(record, labelKeys) {
  return labelKeys
    .map((key) => getNestedValue(record, key))
    .filter(Boolean)
    .join(" - ");
}

function formatSupabaseError(error) {
  if (!error) {
    return "Unexpected error.";
  }

  if (error.code === "23505") {
    return "A record with the same unique code already exists.";
  }

  if (error.message?.toLowerCase().includes("row-level security")) {
    return "Permission denied by Row Level Security. Your role is not allowed to perform this action.";
  }

  return error.message || "Unexpected Supabase error.";
}

export default function MasterDataPage({
  title,
  description,
  tableName,
  entityName,
  selectQuery = "*",
  orderBy = "created_at",
  searchColumns,
  columns,
  fields,
  allowedRoles = ["admin"],
  userIdField,
  detailBasePath,
  documentUrlKey,
  useMenuAccessForManage = true
}) {
  const [rows, setRows] = useState([]);
  const [profile, setProfile] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [lookupOptions, setLookupOptions] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [formErrors, setFormErrors] = useState({});
  const [formData, setFormData] = useState(() => createEmptyFormData(fields));
  const [editingRecord, setEditingRecord] = useState(null);
  const [recordToDelete, setRecordToDelete] = useState(null);
  const [toast, setToast] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const pathname = usePathname();

  const supabase = useMemo(() => {
    try {
      return createSupabaseBrowserClient();
    } catch {
      return null;
    }
  }, []);

  const canManage = Boolean(
    profile?.role &&
      (profile.role === "admin" ||
        allowedRoles.includes(profile.role) ||
        (useMenuAccessForManage && canProfileAccessPath(profile, pathname)))
  );

  const hydratedFields = useMemo(() => {
    return fields.map((field) => {
      if (!field.optionsTable) {
        return field;
      }

      return {
        ...field,
        options: lookupOptions[field.optionsTable] || []
      };
    });
  }, [fields, lookupOptions]);

  const visibleRows = useMemo(() => {
    if (!searchTerm.trim()) {
      return rows;
    }

    const normalizedSearch = searchTerm.trim().toLowerCase();

    return rows.filter((row) => {
      return searchColumns.some((key) => {
        const value = getNestedValue(row, key);
        return String(value || "").toLowerCase().includes(normalizedSearch);
      });
    });
  }, [rows, searchColumns, searchTerm]);

  const loadRows = useCallback(async () => {
    if (!supabase) {
      setError("Supabase environment is not configured. Check .env.local.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    const { data, error: queryError } = await supabase
      .from(tableName)
      .select(selectQuery)
      .order(orderBy, { ascending: false });

    if (queryError) {
      setError(formatSupabaseError(queryError));
      setRows([]);
    } else {
      setRows(data || []);
    }

    setLoading(false);
  }, [orderBy, selectQuery, supabase, tableName]);

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
      setProfile(null);
      setError(profileError.message);
      return;
    }

    setProfile(currentProfile);
  }, [supabase]);

  const loadLookups = useCallback(async () => {
    if (!supabase) {
      return;
    }

    const lookupFields = fields.filter((field) => field.optionsTable);
    const optionsMap = {};

    await Promise.all(
      lookupFields.map(async (field) => {
        const { data, error: lookupError } = await supabase
          .from(field.optionsTable)
          .select(field.optionSelect || "*")
          .order(field.optionOrder || "name", { ascending: true });

        if (!lookupError) {
          optionsMap[field.optionsTable] = (data || []).map((record) => ({
            value: record[field.optionValue || "id"],
            label:
              buildOptionLabel(record, field.optionLabelKeys || ["name"]) ||
              record.name ||
              record.id
          }));
        }
      })
    );

    setLookupOptions(optionsMap);
  }, [fields, supabase]);

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

  function openCreateForm() {
    if (!canManage) {
      setToast({ type: "error", message: "Your role is not allowed to add records here." });
      return;
    }

    setEditingRecord(null);
    setFormData(createEmptyFormData(fields));
    setFormErrors({});
    setIsFormOpen(true);
  }

  function openEditForm(record) {
    if (!canManage) {
      setToast({ type: "error", message: "Your role is not allowed to edit records here." });
      return;
    }

    const nextData = createEmptyFormData(fields);
    fields.forEach((field) => {
      const value = getNestedValue(record, field.name);
      nextData[field.name] = value ?? "";
    });

    setEditingRecord(record);
    setFormData(nextData);
    setFormErrors({});
    setIsFormOpen(true);
  }

  function handleInputChange(event) {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
    setFormErrors((current) => ({ ...current, [name]: undefined }));
  }

  function validateForm() {
    const errors = {};

    fields.forEach((field) => {
      const value = String(formData[field.name] || "").trim();

      if (field.required && !value) {
        errors[field.name] = `${field.label} is required.`;
      }

      if (field.type === "email" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        errors[field.name] = "Enter a valid email address.";
      }
    });

    if (formData.start_date && formData.end_date && formData.start_date > formData.end_date) {
      errors.end_date = "End date must be after start date.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function buildPayload() {
    return fields.reduce((payload, field) => {
      let value = formData[field.name];

      if (typeof value === "string") {
        value = value.trim();
      }

      if (value === "" && (field.nullable || field.type === "date" || field.type === "select")) {
        value = null;
      }

      if ((value === null || value === "") && field.defaultValue) {
        value = field.defaultValue;
      }

      payload[field.name] = value;
      return payload;
    }, {});
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!canManage) {
      setToast({ type: "error", message: "Your role is not allowed to perform this action." });
      return;
    }

    if (!validateForm() || !supabase) {
      return;
    }

    setSubmitting(true);
    const payload = buildPayload();
    if (userIdField && currentUser?.id && !editingRecord) {
      payload[userIdField] = currentUser.id;
    }

    const request = editingRecord
      ? supabase.from(tableName).update(payload).eq("id", editingRecord.id)
      : supabase.from(tableName).insert(payload);

    const { data: mutationData, error: mutationError } = await request.select("id").maybeSingle();

    if (mutationError) {
      setToast({ type: "error", message: formatSupabaseError(mutationError) });
    } else {
      await writeAuditLog(supabase, {
        userId: currentUser?.id,
        action: editingRecord ? "update" : "create",
        module: entityName,
        tableName,
        recordId: editingRecord?.id || mutationData?.id,
        metadata: payload
      });
      setToast({
        type: "success",
        message: `${entityName} ${editingRecord ? "updated" : "created"} successfully.`
      });
      setIsFormOpen(false);
      setEditingRecord(null);
      await loadRows();
    }

    setSubmitting(false);
  }

  async function handleDelete() {
    if (!recordToDelete || !supabase) {
      return;
    }

    if (!canManage) {
      setToast({ type: "error", message: "Your role is not allowed to perform this action." });
      return;
    }

    setDeleting(true);

    const { error: deleteError } = await supabase
      .from(tableName)
      .delete()
      .eq("id", recordToDelete.id);

    if (deleteError) {
      setToast({ type: "error", message: formatSupabaseError(deleteError) });
    } else {
      await writeAuditLog(supabase, {
        userId: currentUser?.id,
        action: "delete",
        module: entityName,
        tableName,
        recordId: recordToDelete.id,
        metadata: recordToDelete
      });
      setToast({ type: "success", message: `${entityName} deleted successfully.` });
      setRecordToDelete(null);
      await loadRows();
    }

    setDeleting(false);
  }

  return (
    <AppLayout>
      <PageHeader
        title={title}
        description={description}
        eyebrow="Master Data"
        actions={
          <>
            <button
              type="button"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
              onClick={loadRows}
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              type="button"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={openCreateForm}
              disabled={!canManage}
              title={canManage ? `Add ${entityName}` : "Role permission required"}
            >
              <Plus className="h-4 w-4" />
              Add
            </button>
          </>
        }
      />

      {!canManage ? (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <ShieldAlert className="mt-0.5 h-4 w-4 flex-none" />
          <p>
            Current RLS policies allow all authenticated users to read master data. Insert,
            update, and delete actions require an allowed operational role.
          </p>
        </div>
      ) : null}

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
        <p className="text-sm text-slate-500">
          Showing <span className="font-medium text-slate-800">{visibleRows.length}</span> of{" "}
          <span className="font-medium text-slate-800">{rows.length}</span> records
        </p>
      </div>

      <DataTable
        columns={columns}
        rows={visibleRows}
        loading={loading}
        error={error}
        emptyTitle={`No ${title.toLowerCase()} found`}
        emptyDescription="Try another keyword or add a new record."
        onEdit={openEditForm}
        onDelete={setRecordToDelete}
        canManage={canManage}
        detailBasePath={detailBasePath}
        documentUrlKey={documentUrlKey}
      />

      <Modal
        open={isFormOpen}
        title={editingRecord ? `Edit ${entityName}` : `Add ${entityName}`}
        description="Fill in the required fields and keep master data consistent."
        onClose={submitting ? undefined : () => setIsFormOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
              onClick={() => setIsFormOpen(false)}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              form={`${tableName}-form`}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={submitting}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Save
            </button>
          </div>
        }
      >
        <form id={`${tableName}-form`} onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          {hydratedFields.map((field) => (
            <div key={field.name} className={field.fullWidth ? "sm:col-span-2" : ""}>
              <FormInput
                label={field.label}
                name={field.name}
                type={field.type}
                value={formData[field.name]}
                onChange={handleInputChange}
                placeholder={field.placeholder}
                required={field.required}
                error={formErrors[field.name]}
                options={field.options}
                rows={field.rows}
                readOnly={field.readOnly}
                disabled={field.disabled}
                helperText={field.helperText}
              />
            </div>
          ))}
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(recordToDelete)}
        title={`Delete ${entityName}`}
        description={`Are you sure you want to delete this ${entityName.toLowerCase()}?`}
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
