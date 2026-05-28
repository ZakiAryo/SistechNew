"use client";

import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import EnvitechLogo from "./EnvitechLogo";

function formatCurrency(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(new Date(value));
}

function statusBadgeClass(status) {
  const value = String(status || "").toLowerCase();

  if (["approved", "paid", "delivered", "processed"].includes(value)) {
    return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  }

  if (["pending", "waiting", "draft"].includes(value)) {
    return "bg-amber-50 text-amber-700 ring-amber-100";
  }

  if (["cancelled", "rejected", "overdue"].includes(value)) {
    return "bg-rose-50 text-rose-700 ring-rose-100";
  }

  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function ReportField({ label, value }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</dt>
      <dd className="mt-1 min-h-6 text-sm font-medium text-slate-900">{value || "-"}</dd>
    </div>
  );
}

function SignatureBox({ title, name }) {
  return (
    <div className="text-center text-sm">
      <p className="font-medium text-slate-700">{title}</p>
      <div className="mx-auto mt-20 w-52 border-t border-slate-950 pt-2 text-slate-800">
        {name || "Nama / Tanda Tangan"}
      </div>
    </div>
  );
}

export default function WorkflowReportDocument({ type, record, relatedPo, deliveryOrders = [] }) {
  const isPurchaseOrder = type === "po";
  const reportTitle = isPurchaseOrder ? "PURCHASE ORDER REPORT" : "PURCHASE REQUEST REPORT";
  const reportNumber = isPurchaseOrder ? record?.po_number : record?.pr_number;
  const sourceNumber = isPurchaseOrder ? record?.purchase_requests?.pr_number : relatedPo?.po_number;
  const documentDate = isPurchaseOrder ? record?.order_date : record?.request_date;
  const backHref = isPurchaseOrder
    ? "/purchasing/purchase-orders/outstanding"
    : "/engineering/purchase-requests";
  const item = record?.items;
  const project = record?.projects;
  const supplier = record?.suppliers;
  const deliverySummary = deliveryOrders
    .map((delivery) => delivery.do_number || delivery.status)
    .filter(Boolean)
    .join(", ");

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950 print:bg-white print:p-0">
      <style>{`
        @page {
          size: A4;
          margin: 14mm;
        }

        @media print {
          .no-print {
            display: none !important;
          }

          body {
            background: white !important;
          }

          .print-sheet {
            box-shadow: none !important;
            border: 0 !important;
            width: 100% !important;
            min-height: auto !important;
            padding: 0 !important;
          }

          .report-table th,
          .report-table td {
            border: 1px solid #0f172a !important;
          }
        }
      `}</style>

      <div className="no-print mx-auto mb-4 flex max-w-5xl justify-between gap-2">
        <Link
          href={backHref}
          className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <button
          type="button"
          className="inline-flex h-10 items-center gap-2 rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800"
          onClick={() => window.print()}
        >
          <Printer className="h-4 w-4" />
          Print Report
        </button>
      </div>

      <section className="print-sheet mx-auto min-h-[297mm] max-w-5xl rounded-sm border border-slate-200 bg-white p-8 shadow-sm print:min-h-0 print:max-w-none">
        <header className="grid gap-5 border-b-2 border-slate-950 pb-4 sm:grid-cols-[1fr_auto]">
          <div className="flex items-center gap-4">
            <EnvitechLogo className="h-24 w-64 object-contain" priority />
            <div>
              <p className="text-lg font-bold uppercase tracking-wide">SISTECH</p>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Sistem Integrasi Envitech
              </p>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <h1 className="text-2xl font-bold uppercase tracking-wide">{reportTitle}</h1>
            <p className="mt-2 text-sm">
              No: <span className="font-semibold">{reportNumber || "-"}</span>
            </p>
            <p className="text-sm">
              Tgl: <span className="font-semibold">{formatDate(documentDate)}</span>
            </p>
            <span
              className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ${statusBadgeClass(
                record?.status
              )}`}
            >
              {String(record?.status || "-").replaceAll("_", " ")}
            </span>
          </div>
        </header>

        <section className="mt-6 rounded-md border border-slate-300">
          <div className="border-b border-slate-300 bg-slate-50 px-4 py-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              Workflow Reference
            </h2>
          </div>
          <dl className="grid gap-4 p-4 sm:grid-cols-3">
            <ReportField label="Purchase Request" value={isPurchaseOrder ? sourceNumber : reportNumber} />
            <ReportField label="Purchase Order" value={isPurchaseOrder ? reportNumber : sourceNumber || "Belum diproses"} />
            <ReportField label="Delivery Order" value={deliverySummary || "-"} />
          </dl>
        </section>

        <section className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-md border border-slate-300 p-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">Project Information</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <ReportField label="Project Code" value={project?.project_code} />
              <ReportField label="Project Name" value={project?.project_name} />
              <ReportField label="Item Code" value={item?.item_code} />
              <ReportField label="Item Name" value={item?.name || record?.item_summary} />
            </dl>
          </div>

          <div className="rounded-md border border-slate-300 p-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              {isPurchaseOrder ? "Supplier Information" : "Request Information"}
            </h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              {isPurchaseOrder ? (
                <>
                  <ReportField label="Supplier Code" value={supplier?.supplier_code} />
                  <ReportField label="Supplier Name" value={supplier?.name} />
                  <ReportField label="Payment Status" value={record?.payment_status} />
                  <ReportField label="Delivery Status" value={record?.delivery_status} />
                </>
              ) : (
                <>
                  <ReportField label="Priority" value={record?.priority} />
                  <ReportField label="Needed Date" value={formatDate(record?.needed_date)} />
                  <ReportField label="Quantity" value={record?.quantity} />
                  <ReportField label="Unit" value={record?.unit || item?.unit} />
                </>
              )}
            </dl>
          </div>
        </section>

        <table className="report-table mt-6 w-full border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100">
              {[
                "No",
                "Document No",
                "Project",
                "Item / Description",
                "Qty",
                "Unit",
                "Amount",
                "Status"
              ].map((header) => (
                <th key={header} className="border border-slate-950 px-2 py-2 text-left font-semibold">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-slate-950 px-2 py-2 text-center">1</td>
              <td className="border border-slate-950 px-2 py-2">{reportNumber || "-"}</td>
              <td className="border border-slate-950 px-2 py-2">
                {project?.project_code || "-"}
                <br />
                <span className="text-slate-600">{project?.project_name || "-"}</span>
              </td>
              <td className="border border-slate-950 px-2 py-2">
                {item?.item_code || "-"}
                <br />
                <span className="text-slate-600">{item?.name || record?.item_summary || "-"}</span>
              </td>
              <td className="border border-slate-950 px-2 py-2 text-right">
                {record?.quantity || (isPurchaseOrder ? "1" : "-")}
              </td>
              <td className="border border-slate-950 px-2 py-2">{record?.unit || item?.unit || "-"}</td>
              <td className="border border-slate-950 px-2 py-2 text-right">
                {formatCurrency(isPurchaseOrder ? record?.total_amount : record?.estimated_amount)}
              </td>
              <td className="border border-slate-950 px-2 py-2 capitalize">
                {String(record?.status || "-").replaceAll("_", " ")}
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td className="border border-slate-950 px-2 py-2 text-right font-bold" colSpan={6}>
                Total
              </td>
              <td className="border border-slate-950 px-2 py-2 text-right font-bold">
                {formatCurrency(isPurchaseOrder ? record?.total_amount : record?.estimated_amount)}
              </td>
              <td className="border border-slate-950 px-2 py-2" />
            </tr>
          </tfoot>
        </table>

        <section className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
          <div className="min-h-24 rounded border border-slate-950 p-3">
            <p className="font-semibold">Notes / Catatan</p>
            <p className="mt-2 leading-6">{record?.notes || record?.item_summary || "-"}</p>
          </div>
          <div className="min-h-24 rounded border border-slate-950 p-3">
            <p className="font-semibold">Supplier Address / Delivery Note</p>
            <p className="mt-2 leading-6">
              {supplier?.address || deliveryOrders[0]?.notes || "-"}
            </p>
          </div>
        </section>

        <section className="mt-12 grid grid-cols-3 gap-6 text-center">
          <SignatureBox title="Engineering / Requester" />
          <SignatureBox title="Purchasing" />
          <SignatureBox title="Approved By" />
        </section>
      </section>
    </main>
  );
}
