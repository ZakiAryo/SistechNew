export const apStatuses = [
  { value: "draft", label: "Draft" },
  { value: "received", label: "Received" },
  { value: "waiting_payment", label: "Waiting Payment" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
  { value: "cancelled", label: "Cancelled" }
];

export const paymentTerms = [
  { value: "CBD", label: "CBD" },
  { value: "COD", label: "COD" },
  { value: "NET 7", label: "NET 7" },
  { value: "NET 14", label: "NET 14" },
  { value: "NET 21", label: "NET 21" },
  { value: "NET 30", label: "NET 30" },
  { value: "NET 45", label: "NET 45" },
  { value: "NET 60", label: "NET 60" },
  { value: "NET 90", label: "NET 90" },
  { value: "NET 30 / Termin 1", label: "NET 30 / Termin 1" },
  { value: "NET 60 / Termin 2", label: "NET 60 / Termin 2" },
  { value: "NET 90 / Termin 3", label: "NET 90 / Termin 3" },
  { value: "TERMIN 1", label: "Termin 1" },
  { value: "TERMIN 2", label: "Termin 2" },
  { value: "TERMIN 3", label: "Termin 3" },
  { value: "DP 30% / PELUNASAN 70%", label: "DP 30% / Pelunasan 70%" },
  { value: "DP 50% / PELUNASAN 50%", label: "DP 50% / Pelunasan 50%" }
];

export const currencies = [
  { value: "IDR", label: "IDR" },
  { value: "USD", label: "USD" },
  { value: "SGD", label: "SGD" },
  { value: "EUR", label: "EUR" }
];

export const agingCategories = [
  { value: "current", label: "Current" },
  { value: "1-30", label: "1-30 Days" },
  { value: "31-60", label: "31-60 Days" },
  { value: "61-90", label: "61-90 Days" },
  { value: "over_90", label: "Over 90 Days" }
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

export function getAgingDays(row, baseDate = todayIso()) {
  if (!row?.due_date || ["paid", "cancelled"].includes(row.status)) {
    return 0;
  }

  const dueDate = new Date(`${row.due_date}T00:00:00`);
  const today = new Date(`${baseDate}T00:00:00`);
  const days = Math.floor((today.getTime() - dueDate.getTime()) / 86400000);

  return Math.max(days, 0);
}

export function getAgingCategory(row) {
  const days = getAgingDays(row);

  if (days <= 0) {
    return "current";
  }

  if (days <= 30) {
    return "1-30";
  }

  if (days <= 60) {
    return "31-60";
  }

  if (days <= 90) {
    return "61-90";
  }

  return "over_90";
}

export function agingClass(category) {
  if (category === "current") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  }

  if (category === "1-30" || category === "31-60") {
    return "bg-amber-50 text-amber-700 ring-amber-100";
  }

  if (category === "61-90") {
    return "bg-orange-50 text-orange-700 ring-orange-100";
  }

  return "bg-rose-50 text-rose-700 ring-rose-100";
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
