"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2, Plus, RefreshCw, Search, ShieldAlert } from "lucide-react";
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
  const [formData, setFormData] = useState(() => createEmptyFormData(fields));
  const [editingRecord, setEditingRecord] = useState(null);
  const [recordToDelete, setRecordToDelete] = useState(null);
  const [toast, setToast] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [poDetailItems, setPoDetailItems] = useState([]);
  const pathname = usePathname();
  const pageTitle = t(`page.${title}`, title);
  const entityLabel = t(`entity.${entityName}`, entityName);
  const isPurchaseOrder = tableName === "purchase_orders";

  const poSelectedItems = poDetailItems.filter((item) => item.selected);
  const poSubtotal = poSelectedItems.reduce(
    (sum, item) => sum + Number(item.quantity || 0) * Number(item.unit_price || 0),
    0
  );
  const poDiscountPercent = Math.min(100, Math.max(0, Number(formData.discount || 0)));
  const poDiscountAmount = poSubtotal * (poDiscountPercent / 100);
  const poTotal = poSubtotal - poDiscountAmount;

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

    // Lookup biasa dimuat saat halaman dibuka.
    // Field dependent (mis. item_id) menunggu field induknya dipilih.
    const lookupFields = fields.filter(
      (field) => field.optionsTable && !field.dependsOn
    );
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

    setLookupOptions((current) => ({
      ...current,
      ...optionsMap
    }));
  }, [fields, supabase]);

  /*
   * Load option untuk field yang bergantung pada field lain.
   *
   * Contoh PO:
   * Purchase Request -> purchase_request_items -> item_id -> items
   *
   * purchase_request_items pada data saat ini dapat memiliki item_id NULL,
   * jadi fungsi ini mendukung dua cara:
   * 1. cocokkan item berdasarkan item_id jika tersedia;
   * 2. fallback ke item_name jika item_id NULL.
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

      const relationTable = field.dependsOnTable || "purchase_request_items";
      const relationColumn = field.dependsOnColumn || field.dependsOn;
      const itemColumn = field.dependsOnItemColumn || "item_id";

      const { data: relationRows, error: relationError } = await supabase
        .from(relationTable)
        .select(`id, ${itemColumn}, item_name`)
        .eq(relationColumn, dependencyValue);

      if (relationError) {
        console.error("Failed to load dependent options:", relationError);
        setLookupOptions((current) => ({
          ...current,
          [field.name]: []
        }));
        return;
      }

      if (!relationRows?.length) {
        setLookupOptions((current) => ({
          ...current,
          [field.name]: []
        }));
        return;
      }

      // Ambil item_id yang benar-benar tersimpan pada PR.
      const itemIds = [
        ...new Set(
          relationRows
            .map((row) => row[itemColumn])
            .filter(Boolean)
        )
      ];

      let masterItems = [];

      // Prioritas pertama: item_id.
      if (itemIds.length) {
        const { data, error } = await supabase
          .from(field.optionsTable)
          .select(field.optionSelect || "*")
          .in(field.optionValue || "id", itemIds);

        if (error) {
          console.error("Failed to load items by ID:", error);
        } else {
          masterItems = data || [];
        }
      }

      // Fallback: data PR lama/current dapat memiliki item_id NULL.
      if (!masterItems.length) {
        const itemNames = [
          ...new Set(
            relationRows
              .map((row) => row.item_name?.trim())
              .filter(Boolean)
          )
        ];

        if (itemNames.length) {
          // Ambil master items lalu cocokkan nama secara normalized.
          // Ini menangani perbedaan kapitalisasi/spasi pada data lama.
          const { data, error } = await supabase
            .from(field.optionsTable)
            .select(field.optionSelect || "*")
            .order(field.optionOrder || "name", { ascending: true });

          if (error) {
            console.error("Failed to load items for name fallback:", error);
          } else {
            const normalizedNames = new Set(
              itemNames.map((name) => name.trim().toLowerCase())
            );

            masterItems = (data || []).filter((item) =>
              normalizedNames.has(item.name?.trim().toLowerCase())
            );
          }
        }
      }

      console.log("PR dependent lookup", {
        purchaseRequest: dependencyValue,
        relationRows,
        itemIds,
        masterItems
      });

      const options = relationRows
        .map((relationRow) => {
          const relationItemId = relationRow[itemColumn];
          const relationItemName = relationRow.item_name?.trim();

          const masterItem = masterItems.find((item) => {
            if (relationItemId && item[field.optionValue || "id"] === relationItemId) {
              return true;
            }

            return (
              relationItemName &&
              item.name?.trim().toLowerCase() === relationItemName.toLowerCase()
            );
          });

          if (!masterItem) {
            return null;
          }

          return {
            value: masterItem[field.optionValue || "id"],
            label:
              buildOptionLabel(
                masterItem,
                field.optionLabelKeys || ["name"]
              ) ||
              masterItem.name ||
              masterItem.id
          };
        })
        .filter(Boolean);

      // Hilangkan option duplikat jika item yang sama muncul lebih dari sekali
      // pada purchase_request_items.
      const uniqueOptions = options.filter(
        (option, index, array) =>
          array.findIndex((item) => item.value === option.value) === index
      );

      setLookupOptions((current) => ({
        ...current,
        [field.name]: uniqueOptions
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

    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function loadPurchaseOrderItems(purchaseRequestId, existingItems = []) {
    if (!isPurchaseOrder || !supabase || !purchaseRequestId) {
      setPoDetailItems([]);
      return;
    }

    const { data: requestItems, error } = await supabase
      .from("purchase_request_items")
      .select(`
        id,
        item_id,
        item_name,
        description,
        quantity,
        unit,
        estimated_price,
        cost_code_id,
        cost_code,
        items(item_code, name)
      `)
      .eq("purchase_request_id", purchaseRequestId);

    if (error) {
      console.error("Failed to load Purchase Request items:", error);
      setPoDetailItems([]);
      return;
    }

    const existingByRequestItem = new Map(
      existingItems
        .filter((item) => item.purchase_request_item_id)
        .map((item) => [item.purchase_request_item_id, item])
    );

    const requestRows = (requestItems || []).map((item) => {
      const existing = existingByRequestItem.get(item.id);
      return {
        ...item,
        manual: false,
        selected: Boolean(existing),
        quantity: String(existing?.quantity ?? item.quantity ?? 1),
        unit_price: String(existing?.unit_price ?? item.estimated_price ?? 0),
        unit: existing?.unit ?? item.unit ?? "",
        item_name: existing?.item_name ?? item.item_name ?? item.items?.name ?? "",
        description: existing?.description ?? item.description ?? ""
      };
    });

    const manualRows = existingItems
      .filter((item) => !item.purchase_request_item_id)
      .map((item, index) => ({
        id: item.id || `manual-existing-${index}`,
        item_id: item.item_id || null,
        item_name: item.item_name || "",
        description: item.description || "",
        quantity: String(item.quantity ?? 1),
        unit: item.unit || "",
        unit_price: String(item.unit_price ?? 0),
        cost_code_id: item.cost_code_id || null,
        items: item.items || null,
        manual: true,
        selected: true
      }));

    setPoDetailItems([...requestRows, ...manualRows]);
  }

  function addManualPoItem() {
    setPoDetailItems((current) => [
      ...current,
      {
        id: `manual-${Date.now()}-${current.length}`,
        item_id: null,
        item_name: "",
        description: "",
        quantity: "1",
        unit: "pcs",
        unit_price: "0",
        cost_code_id: null,
        items: null,
        manual: true,
        selected: true
      }
    ]);
  }

  function removePoDetailItem(index) {
    setPoDetailItems((current) =>
      current.filter((_, itemIndex) => itemIndex !== index)
    );
  }

  function updatePoDetailItem(index, changes) {
    setPoDetailItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...changes } : item
      )
    );
  }

  function openCreateForm() {
    if (!canManage) {
      setToast({ type: "error", message: t("master.addDenied", "Your role is not allowed to add records here.") });
      return;
    }

    setEditingRecord(null);
    const emptyData = createEmptyFormData(fields);
    setFormData({ ...emptyData, discount: isPurchaseOrder ? "" : emptyData.discount });
    setFormErrors({});
    setPoDetailItems([]);

    // Jangan tampilkan item dari Purchase Request sebelumnya.
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
      setToast({ type: "error", message: t("master.editDenied", "Your role is not allowed to edit records here.") });
      return;
    }

    const nextData = createEmptyFormData(fields);
    fields.forEach((field) => {
      const value = getNestedValue(record, field.name);
      nextData[field.name] = value ?? "";
    });

    setEditingRecord(record);
    setFormData({ ...nextData, discount: nextData.discount ?? "" });
    setFormErrors({});

    // Saat edit, isi kembali option dependent berdasarkan PR yang tersimpan.
    const dependentFields = fields.filter((field) => field.dependsOn);
    await Promise.all(
      dependentFields.map((field) =>
        loadDependentOptions(field, nextData[field.dependsOn])
      )
    );

    if (isPurchaseOrder && nextData.purchase_request_id) {
      const { data: existingItems } = await supabase
        .from("purchase_order_items")
        .select("purchase_request_item_id, item_id, item_name, description, quantity, unit_price")
        .eq("purchase_order_id", record.id);
      await loadPurchaseOrderItems(nextData.purchase_request_id, existingItems || []);
    } else {
      setPoDetailItems([]);
    }

    setIsFormOpen(true);
  }

  function handleInputChange(event) {
    const { name, value } = event.target;

    const dependentFields = fields.filter(
      (field) => field.dependsOn === name
    );

    // Simpan field induk dan kosongkan semua field turunannya.
    setFormData((current) => {
      const next = { ...current, [name]: value };

      dependentFields.forEach((field) => {
        next[field.name] = "";
      });

      return next;
    });

    setFormErrors((current) => ({
      ...current,
      [name]: undefined
    }));

    // Jika Purchase Request berubah, ambil item yang hanya berasal dari PR itu.
    dependentFields.forEach((field) => {
      loadDependentOptions(field, value);
    });

    if (isPurchaseOrder && name === "purchase_request_id") {
      loadPurchaseOrderItems(value);
    }
  }

  function validateForm() {
    const errors = {};

    fields.forEach((field) => {
      // PO menggunakan item_id dan total_amount dari detail rows, bukan input header biasa.
      if (isPurchaseOrder && (field.name === "item_id" || field.name === "total_amount")) {
        return;
      }

      const value = String(formData[field.name] || "").trim();

      if (field.required && !value) {
        errors[field.name] = t("validation.required", "{{field}} is required.", {
          field: t(`field.${field.label}`, field.label)
        });
      }

      if (field.type === "email" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        errors[field.name] = t("validation.email", "Enter a valid email address.");
      }
    });

    if (formData.start_date && formData.end_date && formData.start_date > formData.end_date) {
      errors.end_date = t("validation.endDateAfterStart", "End date must be after start date.");
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function buildPayload() {
    return fields.reduce((payload, field) => {
      let value = formData[field.name];

      if (isPurchaseOrder && field.name === "total_amount") {
        value = poTotal;
      }

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
      setToast({
        type: "error",
        message: t("master.actionDenied", "Your role is not allowed to perform this action.")
      });
      return;
    }

    if (!validateForm() || !supabase) {
      return;
    }

    if (isPurchaseOrder) {
      if (!formData.purchase_request_id) {
        setToast({ type: "error", message: "Purchase Request is required." });
        return;
      }
      if (!poSelectedItems.length) {
        setToast({ type: "error", message: "Select at least one item from the Purchase Request." });
        return;
      }
      if (
        poSelectedItems.some(
          (item) => !String(item.item_name || item.items?.name || "").trim()
        )
      ) {
        setToast({
          type: "error",
          message: "Nama item wajib diisi untuk setiap item yang dipilih."
        });
        return;
      }
      if (poSelectedItems.some((item) => Number(item.quantity || 0) <= 0)) {
        setToast({ type: "error", message: "Quantity must be greater than 0 for every selected item." });
        return;
      }
      if (poSelectedItems.some((item) => Number(item.unit_price || 0) < 0)) {
        setToast({ type: "error", message: "Unit price cannot be negative." });
        return;
      }
    }

    setSubmitting(true);
    const payload = buildPayload();
    if (userIdField && currentUser?.id && !editingRecord) {
      payload[userIdField] = currentUser.id;
    }

    let resolvedPoItems = poSelectedItems;

    if (isPurchaseOrder) {
      // Item manual tidak wajib dibuat menjadi master item.
      // Ini mencegah trigger/generator unique_code pada tabel `items`
      // menolak nama item manual yang kebetulan menghasilkan kode yang sudah ada.
      resolvedPoItems = [];

      for (const item of poSelectedItems) {
        let masterItemId = item.item_id || null;
        const itemName = String(item.item_name || item.items?.name || "").trim();

        // Hanya gunakan master item yang memang sudah terhubung dari PR.
        // Jangan membuat record baru di `items` dari nama item PO karena tabel
        // `items` memiliki unique_code yang dapat bentrok dengan data existing.
        // Item tanpa item_id disimpan sebagai detail PO biasa melalui item_name.
        if (!item.manual && masterItemId) {
          // masterItemId sudah berasal dari Purchase Request, jadi tidak perlu
          // INSERT/UPDATE ke tabel `items`.
        }

        resolvedPoItems.push({ ...item, item_id: masterItemId });
      }

      // Header PO memakai item master pertama yang tersedia.
      // Item manual boleh tidak memiliki item_id.
      payload.item_id = resolvedPoItems.find((item) => item.item_id)?.item_id || null;
      payload.total_amount = poTotal;
    }

    const request = editingRecord
      ? supabase.from(tableName).update(payload).eq("id", editingRecord.id)
      : supabase.from(tableName).insert(payload);

    const { data: mutationData, error: mutationError } = await request.select("id").maybeSingle();

    if (mutationError) {
      setToast({ type: "error", message: formatSupabaseError(mutationError) });
      setSubmitting(false);
      return;
    }

    const recordId = editingRecord?.id || mutationData?.id;

    if (isPurchaseOrder && recordId) {
      // Detail PO harus selalu mencerminkan pilihan terbaru pada form.
      const { error: deleteItemsError } = await supabase
        .from("purchase_order_items")
        .delete()
        .eq("purchase_order_id", recordId);

      if (deleteItemsError) {
        setToast({ type: "error", message: formatSupabaseError(deleteItemsError) });
        setSubmitting(false);
        return;
      }

      const detailRows = resolvedPoItems.map((item) => ({
        purchase_order_id: recordId,
        purchase_request_item_id: item.manual ? null : (item.id || null),
        item_id: item.item_id || null,
        cost_code_id: item.cost_code_id || null,
        item_name: item.item_name || item.items?.name || "Purchase item",
        description: item.description || "",
        quantity: Number(item.quantity || 1),
        unit: item.unit || null,
        unit_price: Number(item.unit_price || 0)
      }));

      const { error: insertItemsError } = await supabase
        .from("purchase_order_items")
        .insert(detailRows);

      if (insertItemsError) {
        setToast({ type: "error", message: formatSupabaseError(insertItemsError) });
        setSubmitting(false);
        return;
      }

      if (!editingRecord) {
        const { error: deliveryError } = await supabase
          .from("delivery_orders")
          .insert({ purchase_order_id: recordId, status: "waiting" });

        if (deliveryError) {
          setToast({ type: "error", message: formatSupabaseError(deliveryError) });
          setSubmitting(false);
          return;
        }
      }
    }

    await writeAuditLog(supabase, {
      userId: currentUser?.id,
      action: editingRecord ? "update" : "create",
      module: entityName,
      tableName,
      recordId,
      metadata: isPurchaseOrder
        ? {
            ...payload,
            subtotal: poSubtotal,
            discount_percent: poDiscountPercent,
            discount_amount: poDiscountAmount,
            total_amount: poTotal,
            item_count: poSelectedItems.length
          }
        : payload
    });

    setToast({
      type: "success",
      message: t(editingRecord ? "master.updated" : "master.created", "{{entity}} saved successfully.", {
        entity: entityLabel
      })
    });
    setIsFormOpen(false);
    setEditingRecord(null);
    setPoDetailItems([]);
    await loadRows();
    setSubmitting(false);
  }

  async function handleDelete() {
    if (!recordToDelete || !supabase) {
      return;
    }

    if (!canManage) {
      setToast({
        type: "error",
        message: t("master.actionDenied", "Your role is not allowed to perform this action.")
      });
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
      setToast({ type: "success", message: t("master.deleted", "{{entity}} deleted successfully.", { entity: entityLabel }) });
      setRecordToDelete(null);
      await loadRows();
    }

    setDeleting(false);
  }

  return (
    <AppLayout>
      <PageHeader
        title={pageTitle}
        description={t(`pageDescription.${title}`, description)}
        eyebrow={t("section.Master Data", "Master Data")}
        actions={
          <>
            <button
              type="button"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
              onClick={loadRows}
              title={t("common.refresh", "Refresh")}
            >
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">{t("common.refresh", "Refresh")}</span>
            </button>
            <button
              type="button"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={openCreateForm}
              disabled={!canManage}
              title={
                canManage
                  ? t("master.addEntity", "Add {{entity}}", { entity: entityLabel })
                  : t("master.rolePermissionRequired", "Role permission required")
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
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder={t("master.searchPlaceholder", "Search {{title}}", { title: pageTitle.toLowerCase() })}
            className="h-10 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
          />
        </label>
        <p className="text-sm text-slate-500">
          {t("master.showing", "Showing {{visible}} of {{total}} records", {
            visible: visibleRows.length,
            total: rows.length
          })}
        </p>
      </div>

      <DataTable
        columns={columns}
        rows={visibleRows}
        loading={loading}
        error={error}
        emptyTitle={t("master.emptyTitle", "No {{title}} found", { title: pageTitle.toLowerCase() })}
        emptyDescription={t("master.emptyDescription", "Try another keyword or add a new record.")}
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
            ? t("master.editEntity", "Edit {{entity}}", { entity: entityLabel })
            : t("master.addEntity", "Add {{entity}}", { entity: entityLabel })
        }
        description={t("master.formDescription", "Fill in the required fields and keep master data consistent.")}
        onClose={submitting ? undefined : () => setIsFormOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
              onClick={() => setIsFormOpen(false)}
              disabled={submitting}
            >
              {t("common.cancel", "Cancel")}
            </button>
            <button
              type="submit"
              form={`${tableName}-form`}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={submitting}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {t("common.save", "Save")}
            </button>
          </div>
        }
      >
        <form id={`${tableName}-form`} onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          {hydratedFields.map((field) => {
            if (isPurchaseOrder && (field.name === "item_id" || field.name === "total_amount")) {
              return null;
            }

            return (
              <div key={field.name} className={field.fullWidth ? "sm:col-span-2" : ""}>
                <FormInput
                  label={t(`field.${field.label}`, field.label)}
                  name={field.name}
                  type={field.type}
                  value={formData[field.name]}
                  onChange={handleInputChange}
                  placeholder={field.placeholder ? t(`field.placeholder.${field.placeholder}`, field.placeholder) : undefined}
                  required={field.required}
                  error={formErrors[field.name]}
                  options={field.options}
                  rows={field.rows}
                  readOnly={field.readOnly}
                  disabled={field.disabled}
                  helperText={field.helperText}
                />
              </div>
            );
          })}

          {isPurchaseOrder ? (
            <section className="sm:col-span-2 overflow-hidden rounded-md border border-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-3 py-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Purchase Order Items</h3>
                  <p className="mt-1 text-xs text-slate-500">Select items from the Purchase Request or add a manual item.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={addManualPoItem}
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-100"
                  >
                    <Plus className="h-4 w-4" />
                    Tambah Item Manual
                  </button>
                  <span className="rounded-full bg-cyan-50 px-2 py-1 text-xs font-semibold text-cyan-700">
                    {poSelectedItems.length} selected
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="w-12 px-3 py-2 text-center">Select</th>
                      <th className="px-3 py-2">Item / Barang</th>
                      <th className="w-24 px-3 py-2 text-right">Qty</th>
                      <th className="w-20 px-3 py-2">Unit</th>
                      <th className="w-36 px-3 py-2 text-right">Unit Price</th>
                      <th className="w-36 px-3 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {poDetailItems.length ? poDetailItems.map((item, index) => {
                      const lineTotal = Number(item.quantity || 0) * Number(item.unit_price || 0);
                      return (
                        <tr key={item.id || index} className={item.selected ? "bg-white" : "bg-slate-50/60"}>
                          <td className="px-3 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={Boolean(item.selected)}
                              onChange={(event) => updatePoDetailItem(index, { selected: event.target.checked })}
                              className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                            />
                          </td>
                          <td className="px-3 py-2">
                            {!item.manual && (
                              <div className="font-medium text-slate-800">
                                {item.items?.item_code || "-"}
                              </div>
                            )}
                            <input
                              type="text"
                              value={item.item_name ?? ""}
                              onChange={(event) =>
                                updatePoDetailItem(index, {
                                  item_name: event.target.value
                                })
                              }
                              disabled={!item.selected}
                              placeholder="Nama item / barang"
                              className="mt-1 h-9 w-full min-w-[220px] rounded-md border border-slate-300 bg-white px-2 text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                            />
                            {item.manual && (
                              <div className="mt-1 text-[11px] font-medium text-cyan-600">
                                Item Manual
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.quantity ?? ""}
                              onChange={(event) => updatePoDetailItem(index, { quantity: event.target.value })}
                              disabled={!item.selected}
                              className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-right text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={item.unit ?? ""}
                              onChange={(event) =>
                                updatePoDetailItem(index, {
                                  unit: event.target.value
                                })
                              }
                              disabled={!item.selected}
                              placeholder="pcs"
                              className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unit_price ?? ""}
                              onChange={(event) => updatePoDetailItem(index, { unit_price: event.target.value })}
                              disabled={!item.selected}
                              className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-right text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                            />
                          </td>
                          <td className="px-3 py-2 text-right font-medium text-slate-800">
                            <div className="flex items-center justify-end gap-2">
                              <span>
                                {new Intl.NumberFormat("id-ID", {
                                  style: "currency",
                                  currency: "IDR",
                                  maximumFractionDigits: 0
                                }).format(lineTotal)}
                              </span>
                              {item.manual && (
                                <button
                                  type="button"
                                  onClick={() => removePoDetailItem(index)}
                                  className="text-xs font-medium text-rose-600 hover:text-rose-700"
                                >
                                  Hapus
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    }) : (
                      <tr>
                        <td colSpan={6} className="px-3 py-6 text-center text-sm text-slate-500">
                          Select a Purchase Request first to load its items.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="border-t border-slate-200 bg-slate-50 p-4">
                <div className="ml-auto grid max-w-md gap-3 sm:grid-cols-2">
                  <div className="text-sm text-slate-600">Subtotal</div>
                  <div className="text-right text-sm font-semibold text-slate-900">
                    {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(poSubtotal)}
                  </div>

                  <div className="text-sm text-slate-600">Discount (%)</div>
                  <div>
                    <input
                      type="number"
                      name="discount"
                      min="0"
                      max="100"
                      step="0.01"
                      value={formData.discount ?? ""}
                      onChange={handleInputChange}
                      className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-right text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
                      placeholder="0"
                    />
                  </div>

                  <div className="text-sm text-slate-600">Discount Amount</div>
                  <div className="text-right text-sm font-medium text-rose-600">
                    - {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(poDiscountAmount)}
                  </div>

                  <div className="border-t border-slate-300 pt-2 text-sm font-semibold text-slate-950">Total Amount</div>
                  <div className="border-t border-slate-300 pt-2 text-right text-base font-bold text-slate-950">
                    {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(poTotal)}
                  </div>
                </div>
              </div>
            </section>
          ) : null}
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(recordToDelete)}
        title={t("master.deleteEntity", "Delete {{entity}}", { entity: entityLabel })}
        description={t("master.deleteConfirm", "Are you sure you want to delete this {{entity}}?", {
          entity: entityLabel.toLowerCase()
        })}
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
