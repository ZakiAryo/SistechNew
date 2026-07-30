"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Banknote,
  CheckCircle2,
  Clock,
  Eye,
  FileCheck,
  FileText,
  Filter,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Trash2
} from "lucide-react";
import AppLayout from "./AppLayout";
import ConfirmDialog from "./ConfirmDialog";
import CostRequestFormModal from "./CostRequestFormModal";
import DataTable from "./DataTable";
import PageHeader from "./PageHeader";
import StatCard from "./StatCard";
import { writeAuditLog } from "@/lib/audit";
import { canProfileAccessPath } from "@/lib/menuConfig";
import { fetchProfileByUserId } from "@/lib/profile";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";

function formatCurrency(val) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(Number(val || 0));
}

function formatDate(dateStr) {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  } catch {
    return dateStr;
  }
}

const statusBadges = {
  draft: "bg-slate-100 text-slate-700 border-slate-300",
  submitted: "bg-amber-50 text-amber-700 border-amber-300",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-300",
  rejected: "bg-rose-50 text-rose-700 border-rose-300",
  paid: "bg-cyan-50 text-cyan-700 border-cyan-300",
  cancelled: "bg-slate-200 text-slate-600 border-slate-400"
};

export default function CostRequestPage() {
  const router = useRouter();
  const [rows, setRows] = useState([]);
  const [projects, setProjects] = useState([]);
  const [costCodes, setCostCodes] = useState([]);
  const [profile, setProfile] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const supabase = useMemo(() => {
    try {
      return createSupabaseBrowserClient();
    } catch {
      return null;
    }
  }, []);

  const loadData = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const [{ data: prjData }, { data: ccData }, { data: pbData, error: pbErr }] = await Promise.all([
        supabase.from("projects").select("id, project_code, project_name").order("project_name"),
        supabase.from("cost_codes").select("id, code, name").order("code"),
        supabase
          .from("cost_requests")
          .select("*, cost_request_items(*)")
          .order("created_at", { ascending: false })
      ]);

      if (pbErr) throw pbErr;

      if (prjData) setProjects(prjData);
      if (ccData) setCostCodes(ccData);
      setRows(pbData || []);
    } catch (err) {
      setError(err.message || "Gagal memuat data Permohonan Biaya.");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    async function initAuth() {
      if (!supabase) return;
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        setCurrentUser(data.user);
        const p = await fetchProfileByUserId(supabase, data.user.id);
        setProfile(p);
      }
    }
    initAuth();
    loadData();
  }, [supabase, loadData]);

  const canManage = useMemo(() => {
    if (!profile) return true;
    return canProfileAccessPath(profile, "/finance/cost-requests");
  }, [profile]);

  // Unique departments for filter dropdown
  const departments = useMemo(() => {
    const set = new Set();
    rows.forEach((r) => {
      if (r.department) set.add(r.department);
    });
    return Array.from(set).sort();
  }, [rows]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      const matchSearch =
        !searchTerm.trim() ||
        (r.pb_number || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.project_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.project_code || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.requested_by_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.description || "").toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus = statusFilter === "all" || r.status === statusFilter;
      const matchDept = departmentFilter === "all" || r.department === departmentFilter;

      return matchSearch && matchStatus && matchDept;
    });
  }, [rows, searchTerm, statusFilter, departmentFilter]);

  // Statistics
  const stats = useMemo(() => {
    const totalCount = rows.length;
    const totalAmount = rows.reduce((sum, r) => sum + (Number(r.total_amount) || 0), 0);
    const draftCount = rows.filter((r) => r.status === "draft").length;
    const approvedCount = rows.filter((r) => r.status === "approved" || r.status === "paid").length;

    return { totalCount, totalAmount, draftCount, approvedCount };
  }, [rows]);

  async function handleCreateOrUpdate(formPayload) {
    if (!supabase) return;
    setSubmitting(true);

    try {
      const { header, items } = formPayload;

      if (editingRecord) {
        // UPDATE
        const { error: updateErr } = await supabase
          .from("cost_requests")
          .update({
            pb_number: header.pb_number || editingRecord.pb_number,
            request_date: header.request_date,
            project_id: header.project_id || null,
            project_name: header.project_name,
            project_code: header.project_code || null,
            requested_by_name: header.requested_by_name,
            position: header.position || null,
            department: header.department,
            description: header.description || null,
            status: header.status,
            total_amount: header.total_amount,
            updated_at: new Date().toISOString()
          })
          .eq("id", editingRecord.id);

        if (updateErr) throw updateErr;

        // Sync items
        await supabase.from("cost_request_items").delete().eq("cost_request_id", editingRecord.id);

        if (items.length > 0) {
          const itemRows = items.map((item) => ({
            cost_request_id: editingRecord.id,
            cost_code_id: item.cost_code_id || null,
            cost_code: item.cost_code || "-",
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unit_price: item.unit_price,
            total_amount: item.total_amount
          }));
          const { error: itemsErr } = await supabase.from("cost_request_items").insert(itemRows);
          if (itemsErr) throw itemsErr;
        }

        await writeAuditLog(supabase, {
          userId: currentUser?.id,
          action: "UPDATE_COST_REQUEST",
          module: "cost_requests",
          tableName: "cost_requests",
          recordId: editingRecord.id,
          metadata: { pb_number: editingRecord.pb_number }
        });

        setToast({ type: "success", message: "Permohonan Biaya berhasil diperbarui." });
      } else {
        // CREATE
        const { data: newHead, error: insertHeadErr } = await supabase
          .from("cost_requests")
          .insert({
            pb_number: header.pb_number.trim() || undefined,
            request_date: header.request_date,
            project_id: header.project_id || null,
            project_name: header.project_name,
            project_code: header.project_code || null,
            requested_by: currentUser?.id || null,
            requested_by_name: header.requested_by_name,
            position: header.position || null,
            department: header.department,
            description: header.description || null,
            status: header.status || "draft",
            total_amount: header.total_amount,
            created_by: currentUser?.id || null
          })
          .select()
          .single();

        if (insertHeadErr) throw insertHeadErr;

        if (items.length > 0 && newHead) {
          const itemRows = items.map((item) => ({
            cost_request_id: newHead.id,
            cost_code_id: item.cost_code_id || null,
            cost_code: item.cost_code || "-",
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unit_price: item.unit_price,
            total_amount: item.total_amount
          }));
          const { error: insertItemsErr } = await supabase.from("cost_request_items").insert(itemRows);
          if (insertItemsErr) throw insertItemsErr;
        }

        await writeAuditLog(supabase, {
          userId: currentUser?.id,
          action: "CREATE_COST_REQUEST",
          module: "cost_requests",
          tableName: "cost_requests",
          recordId: newHead.id,
          metadata: { pb_number: newHead.pb_number }
        });

        setToast({ type: "success", message: "Permohonan Biaya baru berhasil dibuat." });
      }

      setFormModalOpen(false);
      setEditingRecord(null);
      await loadData();
    } catch (err) {
      setToast({ type: "error", message: err.message || "Gagal menyimpan Permohonan Biaya." });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!supabase || !deleteTarget) return;
    setDeleting(true);

    try {
      const { error: delErr } = await supabase.from("cost_requests").delete().eq("id", deleteTarget.id);
      if (delErr) throw delErr;

      await writeAuditLog(supabase, {
        userId: currentUser?.id,
        action: "DELETE_COST_REQUEST",
        module: "cost_requests",
        tableName: "cost_requests",
        recordId: deleteTarget.id,
        metadata: { pb_number: deleteTarget.pb_number }
      });

      setToast({ type: "success", message: `PB (${deleteTarget.pb_number}) berhasil dihapus.` });
      setDeleteTarget(null);
      await loadData();
    } catch (err) {
      setToast({ type: "error", message: err.message || "Gagal menghapus Permohonan Biaya." });
    } finally {
      setDeleting(false);
    }
  }

  const columns = [
    {
      key: "pb_number",
      label: "No. PB",
      sortable: true,
      render: (row) => (
        <Link
          href={`/finance/cost-requests/${row.id}`}
          className="font-semibold text-cyan-600 hover:underline"
        >
          {row.pb_number || "Draft PB"}
        </Link>
      )
    },
    {
      key: "request_date",
      label: "Tanggal",
      sortable: true,
      render: (row) => formatDate(row.request_date)
    },
    {
      key: "project_name",
      label: "Proyek",
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-semibold text-slate-950">{row.project_name}</p>
          {row.project_code ? (
            <p className="text-[11px] text-slate-500 font-mono">{row.project_code}</p>
          ) : null}
        </div>
      )
    },
    {
      key: "requested_by_name",
      label: "Diminta Oleh",
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-medium text-slate-900">{row.requested_by_name}</p>
          <p className="text-[11px] text-slate-500">{row.department}</p>
        </div>
      )
    },
    {
      key: "description",
      label: "Keterangan",
      render: (row) => (
        <p className="max-w-xs truncate text-slate-700" title={row.description}>
          {row.description || "-"}
        </p>
      )
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (row) => (
        <span
          className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium uppercase ${
            statusBadges[row.status] || "bg-slate-100 text-slate-700"
          }`}
        >
          {row.status}
        </span>
      )
    },
    {
      key: "total_amount",
      label: "Total Nominal",
      sortable: true,
      render: (row) => (
        <span className="font-bold text-slate-950">{formatCurrency(row.total_amount)}</span>
      )
    },
    {
      key: "actions",
      label: "Aksi",
      render: (row) => (
        <div className="flex items-center gap-1">
          <Link
            href={`/finance/cost-requests/${row.id}`}
            className="rounded p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            title="Lihat Detail"
          >
            <Eye className="h-4 w-4" />
          </Link>

          <Link
            href={`/finance/cost-requests/${row.id}/print`}
            target="_blank"
            className="rounded p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            title="Cetak / Export PDF"
          >
            <Printer className="h-4 w-4" />
          </Link>

          {canManage ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setEditingRecord(row);
                  setFormModalOpen(true);
                }}
                className="rounded p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                title="Edit"
              >
                <FileText className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => setDeleteTarget(row)}
                className="rounded p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700"
                title="Hapus"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          ) : null}
        </div>
      )
    }
  ];

  return (
    <AppLayout>
      <div className="space-y-6 pb-12">
        {toast ? (
          <div
            className={`flex items-center justify-between rounded-lg p-4 text-sm font-medium ${
              toast.type === "success"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-rose-50 text-rose-800 border border-rose-200"
            }`}
          >
            <div className="flex items-center gap-2">
              {toast.type === "success" ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
              <span>{toast.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="text-xs underline hover:opacity-75"
            >
              Tutup
            </button>
          </div>
        ) : null}

        <PageHeader
          title="Permohonan Biaya"
          subtitle="Kelola pengajuan permohonan biaya operasional & proyek (Cost Requests)"
          actions={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={loadData}
                disabled={loading}
                className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </button>

              {canManage ? (
                <button
                  type="button"
                  onClick={() => {
                    setEditingRecord(null);
                    setFormModalOpen(true);
                  }}
                  className="inline-flex h-10 items-center gap-2 rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800"
                >
                  <Plus className="h-4 w-4" />
                  Tambah Permohonan Biaya
                </button>
              ) : null}
            </div>
          }
        />

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Permohonan Biaya"
            value={stats.totalCount}
            subtitle="Semua PB terdaftar"
            icon={FileText}
          />
          <StatCard
            title="Total Nominal PB"
            value={formatCurrency(stats.totalAmount)}
            subtitle="Akumulasi nominal biaya"
            icon={Banknote}
          />
          <StatCard
            title="Status Draft"
            value={stats.draftCount}
            subtitle="Memerlukan tindakan"
            icon={Clock}
          />
          <StatCard
            title="Status Approved / Paid"
            value={stats.approvedCount}
            subtitle="Selesai & disetujui"
            icon={FileCheck}
          />
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="relative flex-1 min-w-[260px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari No. PB, Proyek, Pemohon, Keterangan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-md border border-slate-300 pl-9 pr-4 py-2 text-sm text-slate-950 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
              <Filter className="h-3.5 w-3.5" />
              <span>Status:</span>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 focus:border-slate-900 focus:outline-none"
            >
              <option value="all">Semua Status</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="paid">Paid</option>
              <option value="cancelled">Cancelled</option>
            </select>

            {departments.length > 0 ? (
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 focus:border-slate-900 focus:outline-none"
              >
                <option value="all">Semua Departemen</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            ) : null}
          </div>
        </div>

        {/* Data Table */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <DataTable
            columns={columns}
            data={filteredRows}
            loading={loading}
            emptyMessage="Belum ada data Permohonan Biaya."
          />
        </div>

        {/* Form Modal */}
        {formModalOpen ? (
          <CostRequestFormModal
            open={formModalOpen}
            onClose={() => {
              setFormModalOpen(false);
              setEditingRecord(null);
            }}
            onSubmit={handleCreateOrUpdate}
            initialData={editingRecord}
            projects={projects}
            costCodes={costCodes}
            currentUserProfile={profile}
            submitting={submitting}
          />
        ) : null}

        {/* Confirm Delete */}
        {deleteTarget ? (
          <ConfirmDialog
            open={Boolean(deleteTarget)}
            title="Hapus Permohonan Biaya"
            message={`Apakah Anda yakin ingin menghapus Permohonan Biaya (${deleteTarget.pb_number})?`}
            onConfirm={handleDeleteConfirm}
            onCancel={() => setDeleteTarget(null)}
            loading={deleting}
          />
        ) : null}
      </div>
    </AppLayout>
  );
}
