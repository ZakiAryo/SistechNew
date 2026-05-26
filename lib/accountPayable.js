export const apStatuses = [
  { value: "draft", label: "Draft" },
  { value: "received", label: "Received" },
  { value: "waiting_payment", label: "Waiting Payment" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
  { value: "cancelled", label: "Cancelled" }
];

export const paymentTerms = [
  { value: "COD", label: "COD" },
  { value: "NET 7", label: "NET 7" },
  { value: "NET 14", label: "NET 14" },
  { value: "NET 30", label: "NET 30" },
  { value: "NET 45", label: "NET 45" },
  { value: "NET 60", label: "NET 60" }
];

export const currencies = [
  { value: "IDR", label: "IDR" },
  { value: "USD", label: "USD" },
  { value: "SGD", label: "SGD" },
  { value: "EUR", label: "EUR" }
];

export function formatCurrency(value, currency = "IDR") {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

export function formatDate(value) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function resolveApStatus(row) {
  if (!row) {
    return "draft";
  }

  if (["paid", "cancelled", "overdue"].includes(row.status)) {
    return row.status;
  }

  if (row.due_date && row.due_date < todayIso()) {
    return "overdue";
  }

  return row.status || "draft";
}

export function apStatusClass(status) {
  const value = String(status || "").toLowerCase();

  if (value === "paid") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  }

  if (value === "received") {
    return "bg-cyan-50 text-cyan-700 ring-cyan-100";
  }

  if (value === "waiting_payment") {
    return "bg-amber-50 text-amber-700 ring-amber-100";
  }

  if (["overdue", "cancelled"].includes(value)) {
    return "bg-rose-50 text-rose-700 ring-rose-100";
  }

  return "bg-slate-100 text-slate-700 ring-slate-200";
}
