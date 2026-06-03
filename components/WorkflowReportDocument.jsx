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

function formatShortDate(value) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

function formatNumber(value) {
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 2
  }).format(Number(value || 0));
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

function PoInfoCell({ label, value }) {
  return (
    <div className="grid grid-cols-[92px_1fr] border-b border-black last:border-b-0">
      <div className="border-r border-black px-1.5 py-1 font-semibold">{label}</div>
      <div className="px-1.5 py-1 font-semibold">{value || "-"}</div>
    </div>
  );
}

function PoCheckBox({ checked }) {
  return (
    <span className="inline-flex h-5 w-8 items-center justify-center border border-black text-[10px] font-bold">
      {checked ? "✓" : ""}
    </span>
  );
}

function PurchaseOrderDocument({ record, deliveryOrders = [] }) {
  const item = record?.items;
  const project = record?.projects;
  const supplier = record?.suppliers;
  const purchaseRequest = record?.purchase_requests;
  const deliveryOrder = deliveryOrders[0] || null;
  const orderDate = record?.order_date || record?.created_at;
  const deliveryDate = deliveryOrder?.delivery_date || purchaseRequest?.needed_date;
  const quantityFallback = Number(purchaseRequest?.quantity || 1);
  const unitFallback = record?.unit || purchaseRequest?.unit || item?.unit || "unit";
  const amount = Number(record?.total_amount || purchaseRequest?.estimated_amount || 0);
  const unitPriceFallback = quantityFallback > 0 ? amount / quantityFallback : amount;
  const poItems = Array.isArray(record?.purchase_order_items) && record.purchase_order_items.length
    ? record.purchase_order_items
    : [
        {
          item_name: item?.name || purchaseRequest?.item_summary || "Purchase item",
          description: purchaseRequest?.item_summary || item?.name || "-",
          quantity: quantityFallback,
          unit: unitFallback,
          unit_price: unitPriceFallback,
          total_price: amount,
          items: item
        }
      ];
  const subtotal = poItems.reduce((total, row) => total + Number(row.total_price || row.quantity * row.unit_price || 0), 0);
  const discount = 0;
  const tax = 0;
  const total = subtotal - discount + tax;

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-black print:bg-white print:p-0">
      <style>{`
        @page {
          size: A4;
          margin: 8mm;
        }

        @media print {
          .no-print {
            display: none !important;
          }

          body {
            background: white !important;
          }

          .po-sheet {
            box-shadow: none !important;
            border: 0 !important;
            width: 100% !important;
            min-height: auto !important;
            padding: 0 !important;
          }
        }

        .po-doc table {
          border-collapse: collapse;
        }

        .po-doc,
        .po-doc * {
          font-family: "Century Schoolbook", "Century Schoolbook L", Georgia, serif !important;
        }

        .po-doc {
          font-size: 11px;
        }

        .po-doc p,
        .po-doc span,
        .po-doc div,
        .po-doc th,
        .po-doc td {
          font-size: 11px;
        }

        .po-doc th,
        .po-doc td {
          border: 1px solid #000;
        }
      `}</style>

      <div className="no-print mx-auto mb-4 flex max-w-[210mm] justify-between gap-2">
        <Link
          href="/purchasing/purchase-orders/outstanding"
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

      <section className="po-doc po-sheet mx-auto min-h-[297mm] w-[210mm] bg-white p-[8mm] text-[11px] leading-tight shadow-sm print:w-auto print:p-0">
        <header className="grid grid-cols-[58mm_1fr_40mm] items-start gap-2">
          <div>
            <EnvitechLogo className="h-[22mm] w-[50mm] object-contain object-left" priority />
            <p className="mt-1 text-[7px] leading-tight">
              Wisma Pondok Indah 1, Suite 306-307, Jl. Sultan Iskandar Muda
              <br />
              Kav. V-TA, Jakarta Selatan, Phone : 75819050 - Fax. : 75819040
            </p>
          </div>
          <div className="pt-2 text-center">
            <h1 className="inline-block border-b-2 border-black text-[20px] font-bold leading-none">
              PURCHASE ORDER
            </h1>
            <p className="mt-1 text-[10px] font-bold uppercase">Pesanan Pembelian</p>
          </div>
          <div className="pt-7 text-right text-[8px]">
            <p>Page-1 of 1 : Original</p>
          </div>
        </header>

        <section className="mt-2 border border-black">
          <div className="grid grid-cols-[1.1fr_1fr]">
            <div className="min-h-[34mm] border-r border-black p-1.5">
              <p className="font-bold">Kepada / Vendor :</p>
              <p className="mt-1 font-bold">{supplier?.name || "-"}</p>
              <p className="mt-1 whitespace-pre-line leading-snug">{supplier?.address || "-"}</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <p>Fax : -</p>
                <p>Telp. : {supplier?.phone || "-"}</p>
              </div>
            </div>
            <div>
              <PoInfoCell label="P.O. No." value={record?.po_number} />
              <PoInfoCell label="Date / Tanggal" value={formatShortDate(orderDate)} />
              <PoInfoCell label="P.R. No." value={purchaseRequest?.pr_number} />
              <PoInfoCell label="C.C. No." value={project?.project_code} />
              <PoInfoCell label="Your Reference" value={deliveryOrder?.do_number || "-"} />
            </div>
          </div>
          <div className="grid grid-cols-[1.1fr_1fr] border-t border-black">
            <div className="grid grid-cols-[105px_1fr] border-r border-black">
              <div className="border-r border-black px-1.5 py-1 font-semibold">Delivery Date</div>
              <div className="px-1.5 py-1 font-semibold">{formatShortDate(deliveryDate)}</div>
            </div>
            <div className="grid grid-cols-[126px_1fr]">
              <div className="border-r border-black px-1.5 py-1 font-semibold">Charging Address / Alamat Penerima</div>
              <div className="px-1.5 py-1">{project?.project_name || supplier?.address || "-"}</div>
            </div>
          </div>
          <div className="grid grid-cols-[1.1fr_1fr] border-t border-black">
            <div className="grid grid-cols-[105px_1fr] border-r border-black">
              <div className="border-r border-black px-1.5 py-1 font-semibold">Term of Delivery</div>
              <div className="px-1.5 py-1 font-semibold">{record?.delivery_status || "Ready Stock"}</div>
            </div>
            <div className="px-1.5 py-1">
              {deliveryOrder?.notes || "Delivery note will follow purchase order processing."}
            </div>
          </div>
        </section>

        <section className="border-x border-b border-black p-1.5">
          <p className="font-bold">Dear Sir,</p>
          <p className="mt-0.5">
            Please furnish the following material/equipment as described below subject to all terms and conditions set forth on back side of the Purchase Order.
          </p>
          <div className="mt-1 grid grid-cols-[72px_1fr] gap-3">
            <div className="grid grid-cols-2 gap-x-2 gap-y-1">
              <span>Direct</span><PoCheckBox checked />
              <span>Indirect</span><PoCheckBox />
            </div>
            <div className="text-[8px] leading-snug">
              Harap dipenuhi barang-barang/peralatan tersebut di bawah ini sesuai dengan seluruh ketentuan dan syarat-syarat yang tercantum pada bagian belakang Pesanan Pembelian ini.
            </div>
          </div>
        </section>

        <table className="w-full text-[8px]">
          <thead>
            <tr>
              <th className="w-[9mm] px-1 py-1 text-center">Item<br />No.</th>
              <th className="w-[18mm] px-1 py-1 text-center">Qty<br />Jumlah</th>
              <th className="w-[18mm] px-1 py-1 text-center">Unit<br />Satuan</th>
              <th className="px-1 py-1 text-center">Description<br />Penjelasan</th>
              <th className="w-[29mm] px-1 py-1 text-center">Unit Price<br />Harga Sat. (IDR)</th>
              <th className="w-[30mm] px-1 py-1 text-center">Total Amount<br />Jumlah (IDR)</th>
            </tr>
          </thead>
          <tbody>
            {poItems.map((row, index) => {
              const quantity = Number(row.quantity || 0);
              const unitPrice = Number(row.unit_price || (quantity ? row.total_price / quantity : row.total_price) || 0);
              const totalPrice = Number(row.total_price || quantity * unitPrice || 0);
              const itemName = row.items?.name || row.item_name || item?.name || "-";
              const itemCode = row.items?.item_code || item?.item_code;

              return (
                <tr key={`${itemName}-${index}`} className="align-top">
                  <td className="px-1 py-2 text-center">{index + 1}</td>
                  <td className="px-1 py-2 text-center">{formatNumber(quantity || 1)}</td>
                  <td className="px-1 py-2 text-center">{row.unit || row.items?.unit || unitFallback}</td>
                  <td className="min-h-[70mm] px-2 py-2 leading-snug">
                    <p className="font-bold">{itemName}</p>
                    {itemCode ? <p>{itemCode}</p> : null}
                    {row.description ? <p className="mt-1 whitespace-pre-line">{row.description}</p> : null}
                    <div className="mt-3 space-y-1">
                      <p>- Delivery Time : {record?.delivery_status || "Ready Stock"}</p>
                      <p>- Project : {project?.project_name || project?.project_code || "-"}</p>
                      <p>- PR No. : {purchaseRequest?.pr_number || "-"}</p>
                      <p>- Payment : {record?.payment_status || "unpaid"}</p>
                      <p>- Other Terms &amp; Condition refer to PO terms.</p>
                    </div>
                  </td>
                  <td className="px-1 py-2 text-right">{formatNumber(unitPrice)}</td>
                  <td className="px-1 py-2 text-right">{formatNumber(totalPrice)}</td>
                </tr>
              );
            })}
            <tr>
              <td className="h-[35mm] px-1 py-1" />
              <td className="px-1 py-1" />
              <td className="px-1 py-1" />
              <td className="px-1 py-1" />
              <td className="px-1 py-1" />
              <td className="px-1 py-1" />
            </tr>
          </tbody>
        </table>

        <section className="grid grid-cols-[1fr_55mm] border-x border-b border-black">
          <div className="border-r border-black p-1.5 text-[8px]">
            <p className="font-bold">Terms of Payment / Syarat Pembayaran :</p>
            <p className="mt-1">Payment will be processed after BAP / delivery document and invoice are received.</p>
            <p className="mt-2 font-semibold">Notes / Catatan :</p>
            <p>{purchaseRequest?.item_summary || deliveryOrder?.notes || "-"}</p>
          </div>
          <div className="text-[8px]">
            <div className="grid grid-cols-[1fr_23mm] border-b border-black">
              <div className="px-1.5 py-1 font-bold">SUB TOTAL</div>
              <div className="border-l border-black px-1.5 py-1 text-right">{formatNumber(subtotal)}</div>
            </div>
            <div className="grid grid-cols-[1fr_23mm] border-b border-black">
              <div className="px-1.5 py-1 font-bold">DISCOUNT</div>
              <div className="border-l border-black px-1.5 py-1 text-right">{formatNumber(discount)}</div>
            </div>
            <div className="grid grid-cols-[1fr_23mm] border-b border-black">
              <div className="px-1.5 py-1 font-bold">TOTAL</div>
              <div className="border-l border-black px-1.5 py-1 text-right">{formatNumber(subtotal - discount)}</div>
            </div>
            <div className="grid grid-cols-[1fr_23mm] border-b border-black">
              <div className="px-1.5 py-1 font-bold">TAX 11%</div>
              <div className="border-l border-black px-1.5 py-1 text-right">{formatNumber(tax)}</div>
            </div>
            <div className="grid grid-cols-[1fr_23mm]">
              <div className="px-1.5 py-1 font-bold">GRAND TOTAL</div>
              <div className="border-l border-black px-1.5 py-1 text-right font-bold">{formatNumber(total)}</div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-[1fr_55mm] border-x border-b border-black text-[8px]">
          <div className="grid grid-cols-[42mm_1fr] border-r border-black">
            <div className="border-r border-black p-1.5">
              <p className="font-bold">Notes / Catatan :</p>
            </div>
            <div>
              <div className="grid grid-cols-[44mm_1fr] border-b border-black">
                <div className="border-r border-black p-1.5 font-semibold">Supplier Acceptance / Persetujuan Pemasok</div>
                <div className="p-1.5">{supplier?.name || "-"}</div>
              </div>
              <div className="grid grid-cols-[44mm_1fr]">
                <div className="border-r border-black p-1.5 font-semibold">Signature / Date :</div>
                <div className="min-h-[14mm] p-1.5" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 text-center font-semibold">
            <div className="flex min-h-[24mm] items-end justify-center border-r border-black p-1.5">Purchasing Mgr.</div>
            <div className="flex min-h-[24mm] items-end justify-center p-1.5">Director</div>
          </div>
        </section>
      </section>
    </main>
  );
}

function PrApprovalBox({ label }) {
  return (
    <div className="flex min-h-[23mm] flex-col justify-end border-l border-black text-center">
      <div className="border-t border-black px-1 py-1 text-[7px] font-semibold leading-tight">
        {label}
        <br />
        Disetujui oleh
      </div>
    </div>
  );
}

function PurchaseRequestDocument({ record, relatedPo }) {
  const item = record?.items;
  const project = record?.projects;
  const supplier = relatedPo?.suppliers;
  const quantity = Number(record?.quantity || 1);
  const unit = record?.unit || item?.unit || "LOT";
  const description = item?.name || record?.item_summary || "-";
  const remarks = record?.notes || record?.priority || "-";

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-black print:bg-white print:p-0">
      <style>{`
        @page {
          size: A4;
          margin: 8mm;
        }

        @media print {
          .no-print {
            display: none !important;
          }

          body {
            background: white !important;
          }

          .pr-sheet {
            box-shadow: none !important;
            border: 0 !important;
            width: 100% !important;
            min-height: auto !important;
            padding: 0 !important;
          }
        }

        .pr-doc table {
          border-collapse: collapse;
        }

        .pr-doc,
        .pr-doc * {
          font-family: "Century Schoolbook", "Century Schoolbook L", Georgia, serif !important;
        }

        .pr-doc {
          font-size: 11px;
        }

        .pr-doc p,
        .pr-doc span,
        .pr-doc div,
        .pr-doc th,
        .pr-doc td {
          font-size: 11px;
        }

        .pr-doc th,
        .pr-doc td {
          border: 1px solid #000;
        }
      `}</style>

      <div className="no-print mx-auto mb-4 flex max-w-[210mm] justify-between gap-2">
        <Link
          href="/engineering/purchase-requests"
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

      <section className="pr-doc pr-sheet mx-auto min-h-[297mm] w-[210mm] bg-white p-[8mm] text-[11px] leading-tight shadow-sm print:w-auto print:p-0">
        <header className="grid grid-cols-[48mm_1fr_50mm] items-start gap-2">
          <div>
            <EnvitechLogo className="h-[24mm] w-[44mm] object-contain object-left" priority />
            <p className="text-[7px] font-semibold">PT Envitech Perkasa</p>
            <p className="text-[6.8px] leading-tight">
              Wisma Pondok Indah 1, Suite 306-307, 3rd floor
              <br />
              Jl. Sultan Iskandar Muda Kav. V-TA
              <br />
              Jakarta Selatan
              <br />
              Phone : 62-21 75819050
              <br />
              Fax. : 62-21 75819040
            </p>
          </div>
          <div className="pt-3 text-center">
            <h1 className="text-[18px] font-bold tracking-wide">PURCHASE REQUEST</h1>
          </div>
          <div className="pt-4 text-left">
            <p className="text-[7px] uppercase tracking-wide">Draft - Phase Created</p>
            <div className="mt-5 grid grid-cols-[42px_1fr] gap-x-1 text-[8px]">
              <span className="font-semibold">No. PR :</span>
              <span className="font-bold">{record?.pr_number || "-"}</span>
              <span>Attachment / Lampiran :</span>
              <span>-</span>
            </div>
          </div>
        </header>

        <table className="mt-2 w-full text-[8px]">
          <thead>
            <tr>
              <th className="w-[15mm] px-1 py-1 text-center">Item<br />No.</th>
              <th className="w-[18mm] px-1 py-1 text-center">Quantity<br />Jumlah</th>
              <th className="w-[20mm] px-1 py-1 text-center">Unit<br />Satuan</th>
              <th className="px-1 py-1 text-center">Description<br />Penjelasan</th>
              <th className="w-[42mm] px-1 py-1 text-center">Remarks<br />Keterangan</th>
            </tr>
          </thead>
          <tbody>
            <tr className="align-top">
              <td className="px-1 py-2 text-center">1</td>
              <td className="px-1 py-2 text-center">{formatNumber(quantity)}</td>
              <td className="px-1 py-2 text-center">{unit}</td>
              <td className="h-[122mm] px-2 py-2 leading-snug">
                <p>{description}</p>
                {item?.item_code ? <p>{item.item_code}</p> : null}
                {record?.needed_date ? <p>Waktu dibutuhkan {formatShortDate(record.needed_date)}</p> : null}
                {project?.project_name ? <p className="mt-2">Project : {project.project_name}</p> : null}
              </td>
              <td className="px-2 py-2 leading-snug">{remarks}</td>
            </tr>
          </tbody>
        </table>

        <section className="grid grid-cols-[50mm_1fr] border-x border-b border-black">
          <div className="border-r border-black px-2 py-1 font-semibold">
            Required For / Date
            <br />
            Diperlukan untuk / Tgl.
          </div>
          <div className="px-2 py-1">
            {project?.project_name || project?.project_code || "-"} / {formatShortDate(record?.needed_date || record?.request_date)}
          </div>
        </section>

        <section className="grid grid-cols-[50mm_1fr_78mm] border-x border-b border-black">
          <div className="border-r border-black px-2 py-2">
            <p className="font-semibold">Ref. Supplier</p>
            <p>Ref. Pemasok</p>
          </div>
          <div className="border-r border-black px-2 py-2">
            {supplier?.name || relatedPo?.suppliers?.supplier_code || "-"}
          </div>
          <div className="grid grid-cols-3">
            <PrApprovalBox label="Requested by" />
            <PrApprovalBox label="Approved by" />
            <PrApprovalBox label="Approved by" />
          </div>
        </section>

        <section className="grid grid-cols-[50mm_1fr_78mm] border-x border-b border-black">
          <div className="border-r border-black px-2 py-2">
            <p>Cost Code No. : {project?.project_code || "-"}</p>
          </div>
          <div className="border-r border-black px-2 py-2">
            <p className="font-semibold">Remarks</p>
            <p>Keterangan</p>
            <p className="mt-1">{record?.notes || "-"}</p>
          </div>
          <div />
        </section>
      </section>
    </main>
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

  if (isPurchaseOrder) {
    return <PurchaseOrderDocument record={record} deliveryOrders={deliveryOrders} />;
  }

  if (!isPurchaseOrder) {
    return <PurchaseRequestDocument record={record} relatedPo={relatedPo} />;
  }

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

        .print-sheet,
        .print-sheet * {
          font-family: "Century Schoolbook", "Century Schoolbook L", Georgia, serif !important;
        }

        .print-sheet {
          font-size: 11px;
        }

        .print-sheet p,
        .print-sheet span,
        .print-sheet div,
        .print-sheet dt,
        .print-sheet dd,
        .print-sheet th,
        .print-sheet td {
          font-size: 11px;
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
