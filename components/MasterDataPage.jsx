"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { usePathname } from "next/navigation";

import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert
} from "lucide-react";

import AppLayout from "./AppLayout";
import ConfirmDialog from "./ConfirmDialog";
import DataTable from "./DataTable";
import FormInput from "./FormInput";
import { useLanguage } from "./LanguageProvider";
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
  const { t } = useLanguage();

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
  const [formData, setFormData] = useState(() =>
    createEmptyFormData(fields)
  );
  const [editingRecord, setEditingRecord] = useState(null);
  const [recordToDelete, setRecordToDelete] = useState(null);
  const [toast, setToast] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const pathname = usePathname();

  const pageTitle = t(`page.${title}`, title);
  const entityLabel = t(`entity.${entityName}`, entityName);

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

  /*
   * ============================================================
   * HYDRATE FIELD OPTIONS
   * ============================================================
   *
   * Field biasa:
   *   lookupOptions[field.optionsTable]
   *
   * Field dependent:
   *   lookupOptions[field.name]
   *
   * Contoh:
   * item_id -> lookupOptions["item_id"]
   */
  const hydratedFields = useMemo(() => {
    return fields.map((field) => {
      if (!field.optionsTable) {
        return field;
      }

      return {
        ...field,
        options: field.dependsOn
          ? lookupOptions[field.name] || []
          : lookupOptions[field.optionsTable] || []
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

        return String(value || "")
          .toLowerCase()
          .includes(normalizedSearch);
      });
    });
  }, [rows, searchColumns, searchTerm]);

  const loadRows = useCallback(async () => {
    if (!supabase) {
      setError(
        "Supabase environment is not configured. Check .env.local."
      );
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

    const {
      profile: currentProfile,
      error: profileError
    } = await fetchProfileByUserId(supabase, user.id);

    if (profileError) {
      setProfile(null);
      setError(profileError.message);
      return;
    }

    setProfile(currentProfile);
  }, [supabase]);

  /*
   * ============================================================
   * LOAD NORMAL LOOKUPS
   * ============================================================
   *
   * Field yang punya dependsOn TIDAK dimuat di sini.
   * Contohnya item_id karena item harus menunggu Purchase Request.
   */
  const loadLookups = useCallback(async () => {
    if (!supabase) {
      return;
    }

    const lookupFields = fields.filter(
      (field) => field.optionsTable && !field.dependsOn
    );

    const optionsMap = {};

    await Promise.all(
      lookupFields.map(async (field) => {
        const { data, error: lookupError } = await supabase
          .from(field.optionsTable)
          .select(field.optionSelect || "*")
          .order(field.optionOrder || "name", {
            ascending: true
          });

        if (!lookupError) {
          optionsMap[field.optionsTable] = (data || []).map(
            (record) => ({
              value: record[field.optionValue || "id"],
              label:
                buildOptionLabel(
                  record,
                  field.optionLabelKeys || ["name"]
                ) ||
                record.name ||
                record.id
            })
          );
        }
      })
    );

    setLookupOptions(optionsMap);
  }, [fields, supabase]);

  /*
   * ============================================================
   * LOAD DEPENDENT OPTIONS
   * ============================================================
   *
   * Contoh:
   *
   * Purchase Request
   *       ↓
   * purchase_request_items
   *       ↓
   * item_id
   *       ↓
   * items
   *       ↓
   * Item / Barang dropdown
   */
  const loadDependentOptions = useCallback(
    async (field, dependencyValue) => {
      if (!supabase || !dependencyValue) {
        setLookupOptions((current) => ({
          ...current,
          [field.name]: []
        }));

        return;
      }

      /*
       * 1. Ambil item_id dari purchase_request_items
       * berdasarkan Purchase Request yang dipilih.
       */
      const {
        data: relationRows,
        error: relationError
      } = await supabase
        .from(field.dependsOnTable)
        .select(field.dependsOnItemColumn || "item_id")
        .eq(
          field.dependsOnColumn || field.dependsOn,
          dependencyValue
        );

      if (relationError) {
        console.error(
          "Failed to load dependent options:",
          relationError
        );

        setLookupOptions((current) => ({
          ...current,
          [field.name]: []
        }));

        return;
      }

      /*
       * 2. Ambil semua item_id.
       */
      const itemIds = [
        ...new Set(
          (relationRows || [])
            .map(
              (row) =>
                row[
                  field.dependsOnItemColumn || "item_id"
                ]
            )
            .filter(Boolean)
        )
      ];

      /*
       * Tidak ada item pada PR.
       */
      if (!itemIds.length) {
        setLookupOptions((current) => ({
          ...current,
          [field.name]: []
        }));

        return;
      }

      /*
       * 3. Ambil detail item dari tabel items.
       */
      const {
        data,
        error: itemError
      } = await supabase
        .from(field.optionsTable)
        .select(field.optionSelect || "*")
        .in(
          field.optionValue || "id",
          itemIds
        )
        .order(field.optionOrder || "name", {
          ascending: true
        });

      if (itemError) {
        console.error(
          "Failed to load item options:",
          itemError
        );

        setLookupOptions((current) => ({
          ...current,
          [field.name]: []
        }));

        return;
      }

      /*
       * 4. Bentuk option untuk FormInput.
       */
      const options = (data || []).map((record) => ({
        value: record[field.optionValue || "id"],
        label:
          buildOptionLabel(
            record,
            field.optionLabelKeys || ["name"]
          ) ||
          record.name ||
          record.id
      }));

      /*
       * 5. Simpan berdasarkan nama field.
       *
       * Contoh:
       * lookupOptions["item_id"]
       */
      setLookupOptions((current) => ({
        ...current,
        [field.name]: options
      }));
    },
    [supabase]
  );

  useEffect(() => {
    loadProfile();
    loadLookups();
    loadRows();
  }, [loadLookups, loadProfile, loadRows]);

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timer = window.setTimeout(
      () => setToast(null),
      3200
    );

    return () => window.clearTimeout(timer);
  }, [toast]);

  function openCreateForm() {
    if (!canManage) {
      setToast({
        type: "error",
        message: t(
          "master.addDenied",
          "Your role is not allowed to add records here."
        )
      });

      return;
    }

    setEditingRecord(null);
    setFormData(createEmptyFormData(fields));
    setFormErrors({});

    /*
     * Bersihkan option dari field dependent
     * supaya tidak membawa item dari PR sebelumnya.
     */
    setLookupOptions((current) => {
      const next = { ...current };

      fields
        .filter((field) => field.dependsOn)
        .forEach((field) => {
          next[field.name] = [];
        });

      return next;
    });

    setIsFormOpen(true);
  }

  async function openEditForm(record) {
    if (!canManage) {
      setToast({
        type: "error",
        message: t(
          "master.editDenied",
          "Your role is not allowed to edit records here."
        )
      });

      return;
    }

    const nextData = createEmptyFormData(fields);

    fields.forEach((field) => {
      const value = getNestedValue(
        record,
        field.name
      );

      nextData[field.name] = value ?? "";
    });

    setEditingRecord(record);
    setFormData(nextData);
    setFormErrors({});

    /*
     * Kalau sedang edit PO yang sudah memiliki PR,
     * load item berdasarkan PR tersebut.
     */
    const dependentFields = fields.filter(
      (field) => field.dependsOn
    );

    await Promise.all(
      dependentFields.map((field) =>
        loadDependentOptions(
          field,
          nextData[field.dependsOn]
        )
      )
    );

    setIsFormOpen(true);
  }

  function handleInputChange(event) {
    const { name, value } = event.target;

    /*
     * Cari field yang bergantung kepada field ini.
     *
     * Contoh:
     * purchase_request_id
     *       ↓
     * item_id
     */
    const dependentFields = fields.filter(
      (field) => field.dependsOn === name
    );

    /*
     * Simpan value baru sekaligus kosongkan
     * field turunannya.
     */
    setFormData((current) => {
      const next = {
        ...current,
        [name]: value
      };

      dependentFields.forEach((field) => {
        next[field.name] = "";
      });

      return next;
    });

    setFormErrors((current) => ({
      ...current,
      [name]: undefined
    }));

    /*
     * Setelah Purchase Request berubah,
     * ambil Item yang ada di PR tersebut.
     */
    dependentFields.forEach((field) => {
      loadDependentOptions(field, value);
    });
  }

  function validateForm() {
    const errors = {};

    fields.forEach((field) => {
      const value = String(
        formData[field.name] || ""
      ).trim();

      if (field.required && !value) {
        errors[field.name] = t(
          "validation.required",
          "{{field}} is required.",
          {
            field: t(
              `field.${field.label}`,
              field.label
            )
          }
        );
      }

      if (
        field.type === "email" &&
        value &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
      ) {
        errors[field.name] = t(
          "validation.email",
          "Enter a valid email address."
        );
      }
    });

    if (
      formData.start_date &&
      formData.end_date &&
      formData.start_date > formData.end_date
    ) {
      errors.end_date = t(
        "validation.endDateAfterStart",
        "End date must be after start date."
      );
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

      if (
        value === "" &&
        (
          field.nullable ||
          field.type === "date" ||
          field.type === "select"
        )
      ) {
        value = null;
      }

      if (
        (value === null || value === "") &&
        field.defaultValue
      ) {
        value = field.defaultValue;
      }

      payload[field.name] = value;

      return payload;
    }, {});
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!canManage) {
      setToast({
        type: "error",
        message: t(
          "master.actionDenied",
          "Your role is not allowed to perform this action."
        )
      });

      return;
    }

    if (!validateForm() || !supabase) {
      return;
    }

    setSubmitting(true);

    const payload = buildPayload();

    if (
      userIdField &&
      currentUser?.id &&
      !editingRecord
    ) {
      payload[userIdField] = currentUser.id;
    }

    const request = editingRecord
      ? supabase
          .from(tableName)
          .update(payload)
          .eq("id", editingRecord.id)
      : supabase
          .from(tableName)
          .insert(payload);

    const {
      data: mutationData,
      error: mutationError
    } = await request
      .select("id")
      .maybeSingle();

    if (mutationError) {
      setToast({
        type: "error",
        message: formatSupabaseError(
          mutationError
        )
      });
    } else {
      await writeAuditLog(supabase, {
        userId: currentUser?.id,
        action: editingRecord
          ? "update"
          : "create",
        module: entityName,
        tableName,
        recordId:
          editingRecord?.id ||
          mutationData?.id,
        metadata: payload
      });

      setToast({
        type: "success",
        message: t(
          editingRecord
            ? "master.updated"
            : "master.created",
          "{{entity}} saved successfully.",
          {
            entity: entityLabel
          }
        )
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
      setToast({
        type: "error",
        message: t(
          "master.actionDenied",
          "Your role is not allowed to perform this action."
        )
      });

      return;
    }

    setDeleting(true);

    const { error: deleteError } =
      await supabase
        .from(tableName)
        .delete()
        .eq("id", recordToDelete.id);

    if (deleteError) {
      setToast({
        type: "error",
        message: formatSupabaseError(
          deleteError
        )
      });
    } else {
      await writeAuditLog(supabase, {
        userId: currentUser?.id,
        action: "delete",
        module: entityName,
        tableName,
        recordId: recordToDelete.id,
        metadata: recordToDelete
      });

      setToast({
        type: "success",
        message: t(
          "master.deleted",
          "{{entity}} deleted successfully.",
          {
            entity: entityLabel
          }
        )
      });

      setRecordToDelete(null);

      await loadRows();
    }

    setDeleting(false);
  }

  return (
    <AppLayout>
      <PageHeader
        title={pageTitle}
        description={t(
          `pageDescription.${title}`,
          description
        )}
        eyebrow={t(
          "section.Master Data",
          "Master Data"
        )}
        actions={
          <>
            <button
              type="button"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
              onClick={loadRows}
              title={t(
                "common.refresh",
                "Refresh"
              )}
            >
              <RefreshCw className="h-4 w-4" />

              <span className="hidden sm:inline">
                {t(
                  "common.refresh",
                  "Refresh"
                )}
              </span>
            </button>

            <button
              type="button"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={openCreateForm}
              disabled={!canManage}
              title={
                canManage
                  ? t(
                      "master.addEntity",
                      "Add {{entity}}",
                      {
                        entity: entityLabel
                      }
                    )
                  : t(
                      "master.rolePermissionRequired",
                      "Role permission required"
                    )
              }
            >
              <Plus className="h-4 w-4" />

              {t("common.add", "Add")}
            </button>
          </>
        }
      />

      {!canManage ? (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <ShieldAlert className="mt-0.5 h-4 w-4 flex-none" />

          <p>
            {t(
              "master.readOnlyNotice",
              "Current RLS policies allow all authenticated users to read master data. Insert, update, and delete actions require an allowed operational role."
            )}
          </p>
        </div>
      ) : null}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative block w-full sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

          <input
            value={searchTerm}
            onChange={(event) =>
              setSearchTerm(event.target.value)
            }
            placeholder={t(
              "master.searchPlaceholder",
              "Search {{title}}",
              {
                title: pageTitle.toLowerCase()
              }
            )}
            className="h-10 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
          />
        </label>

        <p className="text-sm text-slate-500">
          {t(
            "master.showing",
            "Showing {{visible}} of {{total}} records",
            {
              visible: visibleRows.length,
              total: rows.length
            }
          )}
        </p>
      </div>

      <DataTable
        columns={columns}
        rows={visibleRows}
        loading={loading}
        error={error}
        emptyTitle={t(
          "master.emptyTitle",
          "No {{title}} found",
          {
            title: pageTitle.toLowerCase()
          }
        )}
        emptyDescription={t(
          "master.emptyDescription",
          "Try another keyword or add a new record."
        )}
        onEdit={openEditForm}
        onDelete={setRecordToDelete}
        canManage={canManage}
        detailBasePath={detailBasePath}
        documentUrlKey={documentUrlKey}
      />

      <Modal
        open={isFormOpen}
        title={
          editingRecord
            ? t(
                "master.editEntity",
                "Edit {{entity}}",
                {
                  entity: entityLabel
                }
              )
            : t(
                "master.addEntity",
                "Add {{entity}}",
                {
                  entity: entityLabel
                }
              )
        }
        description={t(
          "master.formDescription",
          "Fill in the required fields and keep master data consistent."
        )}
        onClose={
          submitting
            ? undefined
            : () => setIsFormOpen(false)
        }
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
              onClick={() =>
                setIsFormOpen(false)
              }
              disabled={submitting}
            >
              {t(
                "common.cancel",
                "Cancel"
              )}
            </button>

            <button
              type="submit"
              form={`${tableName}-form`}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}

              {t(
                "common.save",
                "Save"
              )}
            </button>
          </div>
        }
      >
        <form
          id={`${tableName}-form`}
          onSubmit={handleSubmit}
          className="grid gap-4 sm:grid-cols-2"
        >
          {hydratedFields.map((field) => (
            <div
              key={field.name}
              className={
                field.fullWidth
                  ? "sm:col-span-2"
                  : ""
              }
            >
              <FormInput
                label={t(
                  `field.${field.label}`,
                  field.label
                )}
                name={field.name}
                type={field.type}
                value={formData[field.name]}
                onChange={handleInputChange}
                placeholder={
                  field.placeholder
                    ? t(
                        `field.placeholder.${field.placeholder}`,
                        field.placeholder
                      )
                    : undefined
                }
                required={field.required}
                error={
                  formErrors[field.name]
                }
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
        title={t(
          "master.deleteEntity",
          "Delete {{entity}}",
          {
            entity: entityLabel
          }
        )}
        description={t(
          "master.deleteConfirm",
          "Are you sure you want to delete this {{entity}}?",
          {
            entity:
              entityLabel.toLowerCase()
          }
        )}
        loading={deleting}
        onCancel={() =>
          setRecordToDelete(null)
        }
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