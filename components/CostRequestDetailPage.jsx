"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Edit,
  FileText,
  FolderKanban,
  Printer,
  Trash2,
  User,
  AlertCircle
} from "lucide-react";
import AppLayout from "./AppLayout";
import ConfirmDialog from "./ConfirmDialog";
import CostRequestFormModal from "./CostRequestFormModal";
import Modal from "./Modal";
import PageHeader from "./PageHeader";
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

export default function CostRequestDetailPage({ id }) {
  const router = useRouter();
  const [record, setRecord] = useState(null);
  const [projects, setProjects] = useState([]);
  const [costCodes, setCostCodes] = useState([]);
  const [profile, setProfile] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  const supabase = useMemo(() => {
    try {
      return createSupabaseBrowserClient();
    } catch {
      return null;
    }
  }, []);

  const loadRecord = useCallback(async () => {
    if (!supabase || !id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    const { data, error: queryError } = await supabase
      .from("cost_requests")
      .select("*, cost_request_items(*)")
      .eq("id", id)
      .single();

    if (queryError) {
      setError(queryError.message);
      setRecord(null);
    } else {
      setRecord(data);
    }

    setLoading(false);
  }, [id, supabase]);

  const loadAuxData = useCallback(async () => {
    if (!supabase) return;

    const [{ data: prjData }, { data: ccData }] = await Promise.all([
      supabase.from("projects").select("id, project_code, project_name").order("project_name"),
      supabase.from("cost_codes").select("id, code, name").order("code")
    ]);

    if (prjData) setProjects(prjData);
    if (ccData) setCostCodes(ccData);
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
    loadAuxData();
    loadRecord();
  }, [supabase, loadAuxData, loadRecord]);

  const canManage = useMemo(() => {
    if (!profile) return true;
    return canProfileAccessPath(profile, "/finance/cost-requests");
  }, [profile]);

  async function handleUpdate(formPayload) {
    if (!supabase || !record) return;

    setSubmitting(true);
    try {
      const { header, items } = formPayload;

      const { error: headerErr } = await supabase
        .from("cost_requests")
        .update({
          pb_number: header.pb_number || record.pb_number,
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
        .eq("id", record.id);

      if (headerErr) throw headerErr;

      // Delete existing items and insert new ones
      await supabase.from("cost_request_items").delete().eq("cost_request_id", record.id);

      if (items.length > 0) {
        const itemRows = items.map((item) => ({
          cost_request_id: record.id,
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
        recordId: record.id,
        metadata: { pb_number: record.pb_number }
      });

      setToast({ type: "success", message: "Permohonan Biaya berhasil diperbarui." });
      setEditModalOpen(false);
      await loadRecord();
    } catch (err) {
      setToast({ type: "error", message: err.message || "Gagal memperbarui Permohonan Biaya." });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!supabase || !record) return;

    setDeleting(true);
    try {
      const { error: delErr } = await supabase.from("cost_requests").delete().eq("id", record.id);
      if (delErr) throw delErr;

      await writeAuditLog(supabase, {
        userId: currentUser?.id,
        action: "DELETE_COST_REQUEST",
        module: "cost_requests",
        tableName: "cost_requests",
        recordId: record.id,
        metadata: { pb_number: record.pb_number }
      });

      router.push("/finance/cost-requests");
    } catch (err) {
      setToast({ type: "error", message: err.message || "Gagal menghapus Permohonan Biaya." });
      setDeleting(false);
      setDeleteConfirmOpen(false);
    }
  }

  const items = Array.isArray(record?.cost_request_items) ? record.cost_request_items : [];

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
          title={`Permohonan Biaya: ${record?.pb_number || "Detail"}`}
          subtitle="Rincian informasi permohonan biaya operasional / proyek"
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/finance/cost-requests"
                className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                <ArrowLeft className="h-4 w-4" />
                Kembali
              </Link>

              {record ? (
                <>
                  <button
                    type="button"
                    onClick={() => setPreviewModalOpen(true)}
                    className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
                  >
                    <FileText className="h-4 w-4 text-cyan-600" />
                    Preview Report
                  </button>

                  <Link
                    href={`/finance/cost-requests/${record.id}/print`}
                    target="_blank"
                    className="inline-flex h-10 items-center gap-2 rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800"
                  >
                    <Printer className="h-4 w-4" />
                    Print / PDF
                  </Link>

                  {canManage ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setEditModalOpen(true)}
                        className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
                      >
                        <Edit className="h-4 w-4" />
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeleteConfirmOpen(true)}
                        className="inline-flex h-10 items-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 text-sm font-medium text-rose-700 hover:bg-rose-100"
                      >
                        <Trash2 className="h-4 w-4" />
                        Hapus
                      </button>
                    </>
                  ) : null}
                </>
              ) : null}
            </div>
          }
        />

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500 shadow-sm">
            Memuat rincian permohonan biaya...
          </div>
        ) : error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700 shadow-sm">
            {error}
          </div>
        ) : record ? (
          <div className="space-y-6">
            {/* Header Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">No. PB</p>
                <p className="mt-1 text-lg font-bold text-slate-950">{record.pb_number || "-"}</p>
                <span
                  className={`mt-2 inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium uppercase ${
                    statusBadges[record.status] || "bg-slate-100 text-slate-700"
                  }`}
                >
                  {record.status}
                </span>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Tanggal PB</p>
                <div className="mt-1 flex items-center gap-2 text-slate-950">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  <span className="text-base font-semibold">{formatDate(record.request_date)}</span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Nominal</p>
                <p className="mt-1 text-xl font-bold text-cyan-700">
                  {formatCurrency(record.total_amount)}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Diminta Oleh</p>
                <div className="mt-1 flex items-center gap-2 text-slate-950">
                  <User className="h-4 w-4 text-slate-400" />
                  <span className="text-base font-semibold">{record.requested_by_name || "-"}</span>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">{record.position} ({record.department})</p>
              </div>
            </div>

            {/* Information Details Box */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-3 mb-4">
                Informasi Proyek & Permohonan
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 text-sm">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Nama Proyek</p>
                  <p className="mt-1 font-semibold text-slate-950">{record.project_name || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Kode Proyek</p>
                  <p className="mt-1 font-semibold text-slate-950">{record.project_code || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Departemen</p>
                  <p className="mt-1 font-semibold text-slate-950">{record.department || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Jabatan</p>
                  <p className="mt-1 font-semibold text-slate-950">{record.position || "-"}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Keterangan</p>
                  <p className="mt-1 font-medium text-slate-800">{record.description || "-"}</p>
                </div>
              </div>
            </div>

            {/* Items Table Box */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-3 mb-4">
                Rincian Detail Biaya ({items.length} Item)
              </h3>

              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-700 uppercase tracking-wider font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-3 text-center w-12">No</th>
                      <th className="px-3 py-3 w-32">Kode Biaya</th>
                      <th className="px-4 py-3 min-w-[240px]">Uraian Biaya</th>
                      <th className="px-3 py-3 text-center w-28">Jumlah / Satuan</th>
                      <th className="px-3 py-3 text-right w-36">Harga Satuan</th>
                      <th className="px-4 py-3 text-right w-40">Total (Rp)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {items.length > 0 ? (
                      items.map((item, idx) => {
                        const itemTotal = Number(item.total_amount) || (Number(item.quantity) * Number(item.unit_price)) || 0;
                        return (
                          <tr key={item.id || idx} className="hover:bg-slate-50/50">
                            <td className="px-3 py-3 text-center font-medium text-slate-500">{idx + 1}</td>
                            <td className="px-3 py-3 font-semibold text-slate-800">{item.cost_code || "-"}</td>
                            <td className="px-4 py-3 text-slate-900 font-medium leading-relaxed">{item.description}</td>
                            <td className="px-3 py-3 text-center text-slate-700">
                              {item.quantity} {item.unit || "lot"}
                            </td>
                            <td className="px-3 py-3 text-right text-slate-700">{formatCurrency(item.unit_price)}</td>
                            <td className="px-4 py-3 text-right font-bold text-slate-950">{formatCurrency(itemTotal)}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-slate-500">
                          Tidak ada rincian item biaya.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t-2 border-slate-300 font-semibold text-slate-900">
                    <tr>
                      <td colSpan={5} className="px-4 py-3 text-right uppercase tracking-wider text-xs">
                        Total Keseluruhan:
                      </td>
                      <td className="px-4 py-3 text-right text-base text-cyan-700 font-bold">
                        {formatCurrency(record.total_amount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        ) : null}

        {/* Modal Form Edit */}
        {editModalOpen ? (
          <CostRequestFormModal
            open={editModalOpen}
            onClose={() => setEditModalOpen(false)}
            onSubmit={handleUpdate}
            initialData={record}
            projects={projects}
            costCodes={costCodes}
            currentUserProfile={profile}
            submitting={submitting}
          />
        ) : null}

        {/* Modal Preview Report */}
        {previewModalOpen ? (
          <Modal
            open={previewModalOpen}
            onClose={() => setPreviewModalOpen(false)}
            title={`Preview Report - ${record?.pb_number}`}
            maxWidth="max-w-5xl"
          >
            <div className="space-y-4">
              <div className="flex justify-end gap-2 border-b border-slate-200 pb-3">
                <Link
                  href={`/finance/cost-requests/${record?.id}/print`}
                  target="_blank"
                  className="inline-flex h-9 items-center gap-2 rounded-md bg-slate-900 px-3 text-xs font-medium text-white hover:bg-slate-800"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Buka / Cetak di Tab Baru
                </Link>
              </div>

              <div className="h-[650px] w-full overflow-hidden rounded-md border border-slate-300 bg-slate-200">
                <iframe
                  src={`/finance/cost-requests/${record?.id}/print`}
                  className="h-full w-full border-0"
                  title="Report Preview"
                />
              </div>
            </div>
          </Modal>
        ) : null}

        {/* Confirm Delete */}
        {deleteConfirmOpen ? (
          <ConfirmDialog
            open={deleteConfirmOpen}
            title="Hapus Permohonan Biaya"
            message={`Apakah Anda yakin ingin menghapus Permohonan Biaya (${record?.pb_number})? Tindakan ini tidak dapat dibatalkan.`}
            onConfirm={handleDeleteConfirm}
            onCancel={() => setDeleteConfirmOpen(false)}
            loading={deleting}
          />
        ) : null}
      </div>
    </AppLayout>
  );
}
