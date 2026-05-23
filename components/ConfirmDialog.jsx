"use client";

import { Loader2, Trash2 } from "lucide-react";
import Modal from "./Modal";

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Delete",
  loading,
  onCancel,
  onConfirm
}) {
  return (
    <Modal
      open={open}
      title={title}
      description={description}
      onClose={loading ? undefined : onCancel}
      footer={
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-rose-600 px-4 text-sm font-medium text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-70"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            {confirmLabel}
          </button>
        </div>
      }
    >
      <div className="rounded-lg border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">
        This action cannot be undone.
      </div>
    </Modal>
  );
}
