"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import FormInput from "./FormInput";
import Modal from "./Modal";

const statusOptions = [
  { value: "draft", label: "Draft" },
  { value: "submitted", label: "Submitted" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "paid", label: "Paid" },
  { value: "cancelled", label: "Cancelled" }
];

const emptyItem = {
  cost_code_id: "",
  cost_code: "",
  description: "",
  quantity: "1",
  unit: "lot",
  unit_price: "0",
  total_amount: "0"
};

function formatCurrency(val) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(Number(val || 0));
}

export default function CostRequestFormModal({
  open,
  onClose,
  onSubmit,
  initialData = null,
  projects = [],
  costCodes = [],
  currentUserProfile = null,
  submitting = false
}) {
  const [formData, setFormData] = useState({
    pb_number: "",
    request_date: new Date().toISOString().split("T")[0],
    project_id: "",
    project_name: "",
    project_code: "",
    requested_by_name: "",
    position: "",
    department: "",
    description: "",
    status: "draft"
  });

  const [items, setItems] = useState([{ ...emptyItem }]);
  const [validationError, setValidationError] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }

    setValidationError("");
    if (initialData) {
      setFormData({
        pb_number: initialData.pb_number || "",
        request_date: initialData.request_date || new Date().toISOString().split("T")[0],
        project_id: initialData.project_id || "",
        project_name: initialData.project_name || "",
        project_code: initialData.project_code || "",
        requested_by_name: initialData.requested_by_name || "",
        position: initialData.position || "",
        department: initialData.department || "",
        description: initialData.description || "",
        status: initialData.status || "draft"
      });

      if (Array.isArray(initialData.cost_request_items) && initialData.cost_request_items.length > 0) {
        setItems(
          initialData.cost_request_items.map((item) => ({
            id: item.id,
            cost_code_id: item.cost_code_id || "",
            cost_code: item.cost_code || "",
            description: item.description || "",
            quantity: String(item.quantity ?? 1),
            unit: item.unit || "lot",
            unit_price: String(item.unit_price ?? 0),
            total_amount: String(item.total_amount ?? 0)
          }))
        );
      } else {
        setItems([{ ...emptyItem }]);
      }
    } else {
      setFormData({
        pb_number: "",
        request_date: new Date().toISOString().split("T")[0],
        project_id: "",
        project_name: "",
        project_code: "",
        requested_by_name: currentUserProfile?.full_name || "",
        position: "",
        department: "OPERATIONAL",
        description: "",
        status: "draft"
      });
      setItems([{ ...emptyItem }]);
    }
  }, [open, initialData, currentUserProfile]);

  function handleProjectChange(e) {
    const selectedId = e.target.value;
    const selectedProject = projects.find((p) => p.id === selectedId);

    if (selectedProject) {
      setFormData((prev) => ({
        ...prev,
        project_id: selectedProject.id,
        project_name: selectedProject.project_name || selectedProject.name || "",
        project_code: selectedProject.project_code || ""
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        project_id: selectedId,
        project_name: "",
        project_code: ""
      }));
    }
  }

  function handleItemChange(index, field, value) {
    setItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: value };

      if (field === "cost_code_id") {
        const found = costCodes.find((c) => c.id === value);
        if (found) {
          item.cost_code = found.code;
          if (!item.description && found.name) {
            item.description = found.name;
          }
        }
      }

      const qty = Number(field === "quantity" ? value : item.quantity) || 0;
      const price = Number(field === "unit_price" ? value : item.unit_price) || 0;
      item.total_amount = String(qty * price);

      updated[index] = item;
      return updated;
    });
  }

  function handleAddItem() {
    setItems((prev) => [...prev, { ...emptyItem }]);
  }

  function handleRemoveItem(index) {
    if (items.length <= 1) {
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  const grandTotal = items.reduce((sum, item) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unit_price) || 0;
    return sum + qty * price;
  }, 0);

  function handleSubmit(e) {
    e.preventDefault();
    setValidationError("");

    if (!formData.project_name.trim()) {
      setValidationError("Nama Proyek tidak boleh kosong.");
      return;
    }

    if (!formData.requested_by_name.trim()) {
      setValidationError("Diminta Oleh tidak boleh kosong.");
      return;
    }

    const validItems = items.filter((item) => item.description.trim() || item.cost_code.trim());
    if (validItems.length === 0) {
      setValidationError("Minimal satu detail item biaya harus diisi.");
      return;
    }

    onSubmit({
      header: {
        ...formData,
        total_amount: grandTotal
      },
      items: validItems.map((item) => ({
        id: item.id,
        cost_code_id: item.cost_code_id || null,
        cost_code: item.cost_code || "-",
        description: item.description || "-",
        quantity: Number(item.quantity) || 1,
        unit: item.unit || "lot",
        unit_price: Number(item.unit_price) || 0,
        total_amount: (Number(item.quantity) || 1) * (Number(item.unit_price) || 0)
      }))
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initialData ? "Edit Permohonan Biaya" : "Tambah Permohonan Biaya Baru"}
      maxWidth="max-w-4xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {validationError ? (
          <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {validationError}
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FormInput
            label="Nomor PB"
            name="pb_number"
            value={formData.pb_number}
            onChange={(e) => setFormData((prev) => ({ ...prev, pb_number: e.target.value }))}
            placeholder="Otomatis (contoh: 2607 - 00333)"
            helpText="Biarkan kosong untuk penomoran otomatis"
          />

          <FormInput
            label="Tanggal"
            type="date"
            name="request_date"
            value={formData.request_date}
            onChange={(e) => setFormData((prev) => ({ ...prev, request_date: e.target.value }))}
            required
          />

          <FormInput
            label="Status"
            type="select"
            name="status"
            value={formData.status}
            onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value }))}
            options={statusOptions}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.length > 0 ? (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                Pilih Master Proyek
              </label>
              <select
                className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                value={formData.project_id}
                onChange={handleProjectChange}
              >
                <option value="">-- Pilih Proyek --</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.project_code ? `[${p.project_code}] ` : ""}{p.project_name || p.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <FormInput
            label="Nama Proyek"
            name="project_name"
            value={formData.project_name}
            onChange={(e) => setFormData((prev) => ({ ...prev, project_name: e.target.value }))}
            placeholder="e.g. RETAIL-INSTALL IKN SPK.18/25"
            required
          />

          <FormInput
            label="Kode Proyek"
            name="project_code"
            value={formData.project_code}
            onChange={(e) => setFormData((prev) => ({ ...prev, project_code: e.target.value }))}
            placeholder="e.g. R-25-0018"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <FormInput
            label="Diminta Oleh"
            name="requested_by_name"
            value={formData.requested_by_name}
            onChange={(e) => setFormData((prev) => ({ ...prev, requested_by_name: e.target.value }))}
            placeholder="e.g. NAI"
            required
          />

          <FormInput
            label="Jabatan"
            name="position"
            value={formData.position}
            onChange={(e) => setFormData((prev) => ({ ...prev, position: e.target.value }))}
            placeholder="e.g. COMMISSIONING"
          />

          <FormInput
            label="Departemen"
            name="department"
            value={formData.department}
            onChange={(e) => setFormData((prev) => ({ ...prev, department: e.target.value }))}
            placeholder="e.g. OPERATIONAL"
            required
          />
        </div>

        <FormInput
          label="Keterangan"
          type="textarea"
          name="description"
          value={formData.description}
          onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
          placeholder="e.g. Mobil Juni - Juli"
          rows={2}
        />

        {/* Dynamic Items Table */}
        <div className="border-t border-slate-200 pt-4">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-800">
              Rincian Detail Biaya
            </h4>
            <button
              type="button"
              onClick={handleAddItem}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <Plus className="h-3.5 w-3.5" />
              Tambah Baris Item
            </button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 uppercase tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2 w-12 text-center">No</th>
                  <th className="px-3 py-2 w-32">Kode Biaya</th>
                  <th className="px-3 py-2 min-w-[200px]">Uraian</th>
                  <th className="px-3 py-2 w-20">Jumlah</th>
                  <th className="px-3 py-2 w-24">Satuan</th>
                  <th className="px-3 py-2 w-36">Harga (Rp)</th>
                  <th className="px-3 py-2 w-36 text-right">Total (Rp)</th>
                  <th className="px-3 py-2 w-12 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {items.map((item, idx) => {
                  const qty = Number(item.quantity) || 0;
                  const price = Number(item.unit_price) || 0;
                  const rowTotal = qty * price;

                  return (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="px-3 py-2 text-center text-slate-500 font-medium">
                        {idx + 1}
                      </td>
                      <td className="px-3 py-2">
                        {costCodes.length > 0 ? (
                          <div className="space-y-1">
                            <select
                              className="w-full rounded border border-slate-300 px-2 py-1 text-xs focus:border-slate-900 focus:outline-none"
                              value={item.cost_code_id}
                              onChange={(e) => handleItemChange(idx, "cost_code_id", e.target.value)}
                            >
                              <option value="">-- Pilih --</option>
                              {costCodes.map((cc) => (
                                <option key={cc.id} value={cc.id}>
                                  {cc.code} - {cc.name}
                                </option>
                              ))}
                            </select>
                            <input
                              type="text"
                              className="w-full rounded border border-slate-200 px-2 py-0.5 text-xs placeholder:text-slate-400"
                              placeholder="Kode Custom"
                              value={item.cost_code}
                              onChange={(e) => handleItemChange(idx, "cost_code", e.target.value)}
                            />
                          </div>
                        ) : (
                          <input
                            type="text"
                            className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
                            placeholder="e.g. 61403"
                            value={item.cost_code}
                            onChange={(e) => handleItemChange(idx, "cost_code", e.target.value)}
                          />
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <textarea
                          rows={2}
                          className="w-full rounded border border-slate-300 px-2 py-1 text-xs focus:border-slate-900 focus:outline-none"
                          placeholder="e.g. Sewa mobil operasional..."
                          value={item.description}
                          onChange={(e) => handleItemChange(idx, "description", e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          className="w-full rounded border border-slate-300 px-2 py-1 text-xs focus:border-slate-900 focus:outline-none"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, "quantity", e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          className="w-full rounded border border-slate-300 px-2 py-1 text-xs focus:border-slate-900 focus:outline-none"
                          placeholder="lot / pcs / bln"
                          value={item.unit}
                          onChange={(e) => handleItemChange(idx, "unit", e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          className="w-full rounded border border-slate-300 px-2 py-1 text-xs focus:border-slate-900 focus:outline-none"
                          value={item.unit_price}
                          onChange={(e) => handleItemChange(idx, "unit_price", e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-slate-900">
                        {formatCurrency(rowTotal)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          disabled={items.length <= 1}
                          className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-50 border-t-2 border-slate-300 font-semibold text-slate-900">
                <tr>
                  <td colSpan={6} className="px-4 py-2.5 text-right uppercase tracking-wider text-xs">
                    Total Keseluruhan (Rp):
                  </td>
                  <td className="px-3 py-2.5 text-right text-sm text-cyan-700 font-bold">
                    {formatCurrency(grandTotal)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-slate-900 px-5 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {submitting ? "Menyimpan..." : initialData ? "Simpan Perubahan" : "Buat Permohonan Biaya"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
