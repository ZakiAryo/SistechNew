"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, Pencil, RefreshCw, Search } from "lucide-react";
import AppLayout from "./AppLayout";
import FormInput from "./FormInput";
import { useLanguage } from "./LanguageProvider";
import Modal from "./Modal";
import PageHeader from "./PageHeader";
import { writeAuditLog } from "@/lib/audit";
import {
  getMenuTranslationKey,
  getRoleTranslationKey,
  getSectionTranslationKey
} from "@/lib/i18n";
import { getBaseMenuHrefsForRole, getMenuAccessCatalog, normalizeMenuAccess } from "@/lib/menuConfig";
import { fetchProfileByUserId } from "@/lib/profile";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";

const roleOptions = [
  { value: "admin", label: "Admin" },
  { value: "marketing", label: "Marketing" },
  { value: "engineering", label: "Engineering" },
  { value: "purchasing", label: "Purchasing" },
  { value: "finance", label: "Finance" },
  { value: "user", label: "User" }
];

function badgeClass(value) {
  if (value === "admin") {
    return "bg-slate-900 text-white ring-slate-900";
  }

  if (value === "inactive") {
    return "bg-rose-50 text-rose-700 ring-rose-100";
  }

  return "bg-cyan-50 text-cyan-700 ring-cyan-100";
}

export default function UserManagementPage({ mode = "users" }) {
  const { locale, t } = useLanguage();
  const [rows, setRows] = useState([]);
  const [profile, setProfile] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    role: "user",
    is_active: "true",
    menu_access: []
  });
  const [formErrors, setFormErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const supabase = useMemo(() => {
    try {
      return createSupabaseBrowserClient();
    } catch {
      return null;
    }
  }, []);

  const isAdmin = profile?.role === "admin";
  const currentProfileId = currentUser?.id || profile?.id;
  const isEditingCurrentAdmin = Boolean(
    editingUser?.id && editingUser.id === currentProfileId && editingUser?.role === "admin"
  );
  const title = mode === "access" ? t("users.accessControl", "Access Control") : t("users.manageUser", "Manage User");
  const description =
    mode === "access"
      ? t(
          "users.accessDescription",
          "Review and update user role access without changing Supabase Auth passwords."
        )
      : t("users.manageDescription", "Manage profile information and role assignment for registered users.");
  const translatedRoleOptions = useMemo(
    () =>
      roleOptions.map((role) => ({
        ...role,
        label: t(getRoleTranslationKey(role.value), role.label)
      })),
    [t]
  );
  const translatedActiveOptions = useMemo(
    () => [
      { value: "true", label: t("common.active", "Active") },
      { value: "false", label: t("common.inactive", "Inactive") }
    ],
    [t]
  );
  const menuCatalog = useMemo(() => getMenuAccessCatalog(), []);
  const baseMenuHrefs = useMemo(() => getBaseMenuHrefsForRole(formData.role), [formData.role]);
  const adminOnlyMenuHrefs = useMemo(
    () =>
      new Set(
        menuCatalog.flatMap((section) =>
          section.items.filter((item) => item.adminOnly).map((item) => item.href)
        )
      ),
    [menuCatalog]
  );

  const visibleRows = rows.filter((row) => {
    const haystack = [row.full_name, row.email, row.role].filter(Boolean).join(" ").toLowerCase();

    if (roleFilter && row.role !== roleFilter) {
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

    let { data, error: queryError } = await supabase
      .from("profiles")
      .select("id, full_name, email, role, is_active, menu_access, created_at, updated_at")
      .order("updated_at", { ascending: false });

    if (queryError?.message?.includes("menu_access")) {
      const fallbackResult = await supabase
        .from("profiles")
        .select("id, full_name, email, role, is_active, created_at, updated_at")
        .order("updated_at", { ascending: false });

      data = fallbackResult.data?.map((row) => ({ ...row, menu_access: [] })) || [];
      queryError = fallbackResult.error;
    }

    if (queryError) {
      setRows([]);
      setError(queryError.message);
    } else {
      setRows(data || []);
    }

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadProfile();
    loadRows();
  }, [loadProfile, loadRows]);

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timer = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function openEditForm(row) {
    if (!isAdmin) {
      setToast(t("users.onlyAdmin", "Only admin can manage users."));
      return;
    }

    setEditingUser(row);
    setFormErrors({});
    setFormData({
      full_name: row.full_name || "",
      email: row.email || "",
      role: row.role || "user",
      is_active: String(row.is_active !== false),
      menu_access: normalizeMenuAccess(row.menu_access)
    });
    setIsFormOpen(true);
  }

  function handleInputChange(event) {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
    setFormErrors((current) => ({ ...current, [name]: undefined }));
  }

  function handleMenuAccessChange(href) {
    setFormData((current) => {
      const currentAccess = normalizeMenuAccess(current.menu_access);
      const exists = currentAccess.includes(href);
      const nextAccess = exists
        ? currentAccess.filter((item) => item !== href)
        : [...currentAccess, href];

      return {
        ...current,
        menu_access: nextAccess
      };
    });
  }

  function validateForm() {
    const errors = {};
    const validRoles = roleOptions.map((role) => role.value);

    if (!formData.email.trim()) {
      errors.email = "Email is required.";
    }

    if (!validRoles.includes(formData.role)) {
      errors.role = "User role is invalid.";
    }

    if (editingUser?.id === currentProfileId && editingUser?.role === "admin") {
      if (formData.role !== "admin") {
        errors.role = t(
          "users.selfAdminRoleLocked",
          "You cannot change your own admin role. Ask another admin to make this change."
        );
      }

      if (formData.is_active !== "true") {
        errors.is_active = t(
          "users.selfAdminStatusLocked",
          "You cannot deactivate your own admin profile."
        );
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!editingUser || !validateForm() || !supabase || !isAdmin) {
      return;
    }

    setSubmitting(true);
    const previousRole = editingUser.role;
    const payload = {
      full_name: formData.full_name.trim() || null,
      email: formData.email.trim(),
      role: formData.role,
      is_active: formData.is_active === "true",
      menu_access: normalizeMenuAccess(formData.menu_access).filter((href) => !adminOnlyMenuHrefs.has(href))
    };

    const { error: updateError } = await supabase
      .from("profiles")
      .update(payload)
      .eq("id", editingUser.id);

    if (updateError) {
      setToast(updateError.message);
      setSubmitting(false);
      return;
    }

    await writeAuditLog(supabase, {
      userId: currentUser?.id,
      action: previousRole === formData.role ? "update_user_profile" : "change_user_role",
      module: "Administration",
      tableName: "profiles",
      recordId: editingUser.id,
      metadata: { previous_role: previousRole, next_role: formData.role, is_active: payload.is_active }
    });

    if (previousRole !== formData.role) {
      await supabase.from("notifications").insert({
        user_id: editingUser.id,
        target_role: formData.role,
        module: "profiles",
        record_id: editingUser.id,
        action_url: "/dashboard",
        title: "Role Access Updated",
        message: `Your SISTECH role has been changed to ${formData.role}.`
      });
    }

    setToast(t("users.updatedSuccess", "User profile updated successfully."));
    setIsFormOpen(false);
    setSubmitting(false);
    await loadRows();
  }

  return (
    <AppLayout>
      <PageHeader
        title={title}
        description={description}
        eyebrow={t("section.Administration", "Administration")}
        actions={
          <button
            type="button"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
            onClick={loadRows}
          >
            <RefreshCw className="h-4 w-4" />
            {t("common.refresh", "Refresh")}
          </button>
        }
      />

      {toast ? <div className="mb-4 rounded-lg border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-800">{toast}</div> : null}
      {error ? <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div> : null}

      <div className="mb-4 grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-3">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder={t("users.searchPlaceholder", "Search user name, email, role")}
            className="h-10 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
          />
        </label>
        <select
          value={roleFilter}
          onChange={(event) => setRoleFilter(event.target.value)}
          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
        >
          <option value="">{t("common.allRoles", "All roles")}</option>
          {translatedRoleOptions.map((role) => (
            <option key={role.value} value={role.value}>{role.label}</option>
          ))}
        </select>
        <p className="flex items-center text-sm text-slate-500">
          {t("users.showing", "Showing {{visible}} of {{total}} users", {
            visible: visibleRows.length,
            total: rows.length
          })}
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[920px] divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                {[
                  t("common.name", "Name"),
                  t("common.email", "Email"),
                  t("common.role", "Role"),
                  t("common.status", "Status"),
                  mode === "access" ? t("users.extraAccess", "Extra Access") : t("common.updated", "Updated"),
                  t("common.action", "Action")
                ].map((header) => (
                  <th key={header} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-slate-500" colSpan={6}>
                    {t("common.loadingProfile", "Loading profile")}...
                  </td>
                </tr>
              ) : visibleRows.length ? (
                visibleRows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-semibold text-slate-900">{row.full_name || "-"}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{row.email || "-"}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium capitalize ring-1 ${badgeClass(row.role)}`}>
                        {t(getRoleTranslationKey(row.role || "user"), row.role || "user")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ring-1 ${badgeClass(row.is_active === false ? "inactive" : "active")}`}>
                        {row.is_active === false ? t("common.inactive", "Inactive") : t("common.active", "Active")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {mode === "access"
                          ? `${normalizeMenuAccess(row.menu_access).length} menu`
                          : row.updated_at
                          ? new Date(row.updated_at).toLocaleDateString(locale === "id" ? "id-ID" : "en-US")
                          : "-"}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <button
                        type="button"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={() => openEditForm(row)}
                        disabled={!isAdmin}
                        title={t("users.editUserAccess", "Edit User Access")}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-8 text-center text-sm text-slate-500" colSpan={6}>
                    {t("users.noProfile", "No user profile found.")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={isFormOpen}
        title={t("users.editUserAccess", "Edit User Access")}
        description={t("users.updateDescription", "Update profile data and role access stored in public.profiles.")}
        onClose={submitting ? undefined : () => setIsFormOpen(false)}
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              className="inline-flex h-10 items-center rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-100"
              onClick={() => setIsFormOpen(false)}
              disabled={submitting}
            >
              {t("common.cancel", "Cancel")}
            </button>
            <button
              type="submit"
              form="user-management-form"
              className="inline-flex h-10 items-center gap-2 rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-70"
              disabled={submitting}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {t("common.saveUser", "Save User")}
            </button>
          </div>
        }
      >
        <form id="user-management-form" onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          {isEditingCurrentAdmin ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-800 sm:col-span-2">
              {t(
                "users.selfAdminProtection",
                "This is your current admin account. Role and active status are locked to prevent accidental admin lockout."
              )}
            </div>
          ) : null}
          <FormInput label={t("common.fullName", "Full Name")} name="full_name" value={formData.full_name} onChange={handleInputChange} />
          <FormInput label={t("common.email", "Email")} name="email" type="email" value={formData.email} onChange={handleInputChange} required error={formErrors.email} />
          <FormInput
            label={t("common.role", "Role")}
            name="role"
            type="select"
            value={formData.role}
            onChange={handleInputChange}
            options={translatedRoleOptions}
            required
            error={formErrors.role}
            disabled={isEditingCurrentAdmin}
            helperText={isEditingCurrentAdmin ? t("users.adminSelfLockedHelper", "Locked for your current admin account.") : undefined}
          />
          <FormInput
            label={t("common.status", "Status")}
            name="is_active"
            type="select"
            value={formData.is_active}
            onChange={handleInputChange}
            options={translatedActiveOptions}
            required
            error={formErrors.is_active}
            disabled={isEditingCurrentAdmin}
            helperText={isEditingCurrentAdmin ? t("users.adminSelfLockedHelper", "Locked for your current admin account.") : undefined}
          />
          {mode === "access" ? (
            <div className="sm:col-span-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-950">{t("users.menuAccess", "Menu Access")}</h3>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {t(
                        "users.menuAccessDescription",
                        "Role default access is checked and locked. Check additional menus to grant extra access."
                      )}
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-2 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                    {normalizeMenuAccess(formData.menu_access).length} {t("common.extra", "extra")}
                  </span>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  {menuCatalog.map((section) => (
                    <div key={section.title} className="rounded-md border border-slate-200 bg-white p-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        {t(getSectionTranslationKey(section.title), section.title)}
                      </p>
                      <div className="mt-3 space-y-2">
                        {section.items.map((item) => {
                          const roleDefault = baseMenuHrefs.includes(item.href);
                          const adminOnlyLocked = item.adminOnly && !roleDefault;
                          const checked =
                            roleDefault ||
                            (!item.adminOnly && normalizeMenuAccess(formData.menu_access).includes(item.href));

                          return (
                            <label key={item.href} className="flex items-start gap-2 text-sm text-slate-700">
                              <input
                                type="checkbox"
                                className="mt-1 h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 disabled:opacity-60"
                                checked={checked}
                                disabled={roleDefault || adminOnlyLocked}
                                onChange={() => handleMenuAccessChange(item.href)}
                              />
                              <span>
                                <span className="font-medium text-slate-800">
                                  {t(getMenuTranslationKey(item.href), item.label)}
                                </span>
                                {roleDefault ? (
                                  <span className="ml-2 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-500">
                                    {t("common.roleBadge", "Role")}
                                  </span>
                                ) : null}
                                {adminOnlyLocked ? (
                                  <span className="ml-2 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-700">
                                    {t("common.adminOnly", "Admin only")}
                                  </span>
                                ) : null}
                                <span className="block text-xs text-slate-400">{item.href}</span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </form>
      </Modal>
    </AppLayout>
  );
}
