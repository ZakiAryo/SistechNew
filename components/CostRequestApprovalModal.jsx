"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import Modal from "./Modal";

export default function CostRequestApprovalModal({
  open,
  mode = "approve",
  pbNumber = "",
  loading = false,
  onClose,
  onConfirm
}) {
  const [notes, setNotes] = useState("");
  const [reason, setReason] = useState("");
  const [validationError, setValidationError] = useState("");

  const isApprove = mode === "approve";

  function handleClose() {
    if (loading) return;
    setNotes("");
    setReason("");
    setValidationError("");
    onClose?.();
  }

  function handleConfirm() {
    setValidationError("");

    if (!isApprove && !reason.trim()) {
      setValidationError("Alasan penolakan wajib diisi.");
      return;
    }

    onConfirm?.(isApprove ? notes.trim() : reason.trim());
  }

  return (
    <Modal
      open={open}
      title={isApprove ? "Setujui Permohonan Biaya" : "Tolak Permohonan Biaya"}
      description={
        pbNumber
          ? `Konfirmasi ${isApprove ? "persetujuan" : "penolakan"} untuk PB ${pbNumber}.`
          : undefined
      }
      onClose={handleClose}
      footer={
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className={`inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium text-white disabled:opacity-50 ${
              isApprove ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
            }`}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isApprove ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            {isApprove ? "Setujui" : "Tolak"}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {validationError ? (
          <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {validationError}
          </div>
        ) : null}

        {isApprove ? (
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
              Catatan Approval (Opsional)
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Tambahkan catatan persetujuan jika diperlukan..."
              className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 focus:border-slate-900 focus:outline-none"
            />
          </div>
        ) : (
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
              Alasan Penolakan <span className="text-rose-600">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Jelaskan alasan penolakan..."
              className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 focus:border-slate-900 focus:outline-none"
              required
            />
          </div>
        )}
      </div>
    </Modal>
  );
}
