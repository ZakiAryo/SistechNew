"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, Pencil, RefreshCw, Search } from "lucide-react";
import AppLayout from "./AppLayout";
import FormInput from "./FormInput";
import Modal from "./Modal";
import PageHeader from "./PageHeader";
import { writeAuditLog } from "@/lib/audit";
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

const activeOptions = [
  { value: "true", label: "Active" },
  { value: "false", label: "Inactive" }
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
  const [rows, setRows] = useState([]);
  const [profile, setProfile] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    role: "user",
    is_active: "true"
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
  const title = mode === "access" ? "Access Control" : "Manage User";
  const description =
    mode === "access"
      ? "Review and update user role access without changing Supabase Auth passwords."
      : "Manage profile information and role assignment for registered users.";

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

    const { data, error: queryError } = await supabase
      .from("profiles")
      .select("id, full_name, email, role, is_active, created_at, updated_at")
      .order("updated_at", { ascending: false });

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
      setToast("Only admin can manage users.");
      return;
    }

    setEditingUser(row);
    setFormErrors({});
    setFormData({
      full_name: row.full_name || "",
      email: row.email || "",
      role: row.role || "user",
      is_active: String(row.is_active !== false)
    });
    setIsFormOpen(true);
  }

  function handleInputChange(event) {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
    setFormErrors((current) => ({ ...current, [name]: undefined }));
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
      is_active: formData.is_active === "true"
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

    setToast("User profile updated successfully.");
    setIsFormOpen(false);
    setSubmitting(false);
    await loadRows();
  }

  return (
    <AppLayout>
      <PageHeader
        title={title}
        description={description}
        eyebrow="Administration"
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

      {toast ? <div className="mb-4 rounded-lg border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-800">{toast}</div> : null}
      {error ? <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div> : null}

      <div className="mb-4 grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-3">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search user name, email, role"
            className="h-10 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
          />
        </label>
        <select
          value={roleFilter}
          onChange={(event) => setRoleFilter(event.target.value)}
          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
        >
          <option value="">All roles</option>
          {roleOptions.map((role) => (
            <option key={role.value} value={role.value}>{role.label}</option>
          ))}
        </select>
        <p className="flex items-center text-sm text-slate-500">
          Showing <span className="mx-1 font-semibold text-slate-800">{visibleRows.length}</span> of {rows.length} users
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[920px] divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                {["Name", "Email", "Role", "Status", "Updated", "Action"].map((header) => (
                  <th key={header} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td className="px-4 py-6 text-sm text-slate-500" colSpan={6}>Loading users...</td></tr>
              ) : visibleRows.length ? (
                visibleRows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-semibold text-slate-900">{row.full_name || "-"}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{row.email || "-"}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium capitalize ring-1 ${badgeClass(row.role)}`}>
                        {row.role || "user"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ring-1 ${badgeClass(row.is_active === false ? "inactive" : "active")}`}>
                        {row.is_active === false ? "Inactive" : "Active"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{row.updated_at ? new Date(row.updated_at).toLocaleDateString("id-ID") : "-"}</td>
                    <td className="px-4 py-3 text-sm">
                      <button
                        type="button"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={() => openEditForm(row)}
                        disabled={!isAdmin}
                        title="Edit user access"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td className="px-4 py-8 text-center text-sm text-slate-500" colSpan={6}>No user profile found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={isFormOpen}
        title="Edit User Access"
        description="Update profile data and role access stored in public.profiles."
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
              form="user-management-form"
              className="inline-flex h-10 items-center gap-2 rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-70"
              disabled={submitting}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Save User
            </button>
          </div>
        }
      >
        <form id="user-management-form" onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <FormInput label="Full Name" name="full_name" value={formData.full_name} onChange={handleInputChange} />
          <FormInput label="Email" name="email" type="email" value={formData.email} onChange={handleInputChange} required error={formErrors.email} />
          <FormInput label="Role" name="role" type="select" value={formData.role} onChange={handleInputChange} options={roleOptions} required error={formErrors.role} />
          <FormInput label="Status" name="is_active" type="select" value={formData.is_active} onChange={handleInputChange} options={activeOptions} required />
        </form>
      </Modal>
    </AppLayout>
  );
}
