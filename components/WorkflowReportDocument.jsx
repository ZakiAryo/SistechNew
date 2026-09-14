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
  const subtotal = poItems.reduce(
    (total, row) =>
      total + Number(row.total_price || row.quantity * row.unit_price || 0),
    0
  );

  // purchase_orders.total_amount menyimpan total setelah diskon.
  // Diskon dihitung dari selisih subtotal dengan total_amount.
  const finalAmount = Number(record?.total_amount ?? subtotal);

  const discount = Math.max(0, subtotal - finalAmount);

  const discountPercent =
    subtotal > 0 ? (discount / subtotal) * 100 : 0;

  // PPN belum dimasukkan ke total_amount PO.
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

        .po-doc th {
          border: 1px solid #000;  
        }
        .po-doc td {
          border-left: 1px solid #000;
          border-right: 1px solid #000;
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
            <p>Page/Hal : 1 of/dari 1</p>
          </div>
        </header>

        <section className="mt-2 border-x border-t border-black">
          <div className="grid grid-cols-[135mm_59mm]">
            <div className="border-r border-black flex flex-col">
              <div className="border-b border-black p-1.5 flex-1">
                <div className="inline-block border-b border-black pb-0.5 mb-0.5">Supplier / Pemasok :</div>
                <p className="font-bold">{supplier?.name || "-"}</p>
                <p className="whitespace-pre-line leading-snug">{supplier?.address || "-"}</p>
                <div className="mt-1 flex gap-4">
                  <p>Fax. : -</p>
                  <p>Telp. : {supplier?.phone || "-"}</p>
                </div>
              </div>
              <div className="border-b border-black px-1.5 py-1">
                <div className="inline-block border-b border-black pb-0.5 mb-0.5 leading-none">Delivery Date</div>
                <div className="leading-none flex mt-0.5">
                  <div className="w-[30mm]">Tgl. Pengiriman</div>
                  <div>: {formatDate(deliveryDate)}</div>
                </div>
              </div>
              <div className="border-b border-black px-1.5 py-1">
                <div className="inline-block border-b border-black pb-0.5 mb-0.5 leading-none">Terms of Delivery</div>
                <div className="leading-none flex mt-0.5">
                  <div className="w-[30mm]">Syarat Pengiriman</div>
                  <div>: {record?.delivery_status || ""}</div>
                </div>
              </div>
              <div className="px-1.5 py-1">
                <div className="inline-block border-b border-black pb-0.5 mb-0.5 leading-none">Partial Shipment / Pengiriman Sebagian :</div>
                <div className="leading-none mt-1 flex gap-4">
                  <div className="flex gap-1 items-end">
                    <div>
                      <div className="inline-block border-b border-black pb-0.5 mb-0.5">Allowed</div>
                      <div>Diijinkan</div>
                    </div>
                    <span>:</span>
                    <div className="w-5 h-3 border border-black mb-0.5"></div>
                  </div>
                  <div className="flex gap-1 items-end">
                    <div>
                      <div className="inline-block border-b border-black pb-0.5 mb-0.5">Not Allowed</div>
                      <div>Tdk Diijinkan</div>
                    </div>
                    <span>:</span>
                    <div className="w-5 h-3 border border-black mb-0.5 flex items-center justify-center font-bold">✓</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col text-[7.5px]">
              <div className="grid grid-cols-[30mm_1fr] border-b border-black">
                <div className="border-r border-black px-1 py-0.5">P.O. No.</div>
                <div className="px-1 py-0.5">{record?.po_number}</div>
              </div>
              <div className="grid grid-cols-[30mm_1fr] border-b border-black">
                <div className="border-r border-black px-1 py-0.5">Date/Tanggal</div>
                <div className="px-1 py-0.5">{formatDate(orderDate)}</div>
              </div>
              <div className="grid grid-cols-[30mm_1fr] border-b border-black">
                <div className="border-r border-black px-1 py-0.5 leading-none">P.R. No./No. Permintaan Pembelian</div>
                <div className="px-1 py-0.5">{purchaseRequest?.pr_number}</div>
              </div>
              <div className="grid grid-cols-[30mm_1fr] border-b border-black">
                <div className="border-r border-black px-1 py-0.5 leading-none">C.C. No./No. Pembebanan Biaya</div>
                <div className="px-1 py-0.5">{project?.project_code}</div>
              </div>
              <div className="grid grid-cols-[30mm_1fr] border-b border-black">
                <div className="border-r border-black px-1 py-0.5 leading-none">Your Reference/Menunjuk Pada</div>
                <div className="px-1 py-0.5">{deliveryOrder?.do_number || "-"}</div>
              </div>
              <div className="border-b border-black px-1 py-0.5">
                Location/Lokasi : {project?.project_name || project?.project_code || "-"}
              </div>
              <div className="px-1 py-0.5 flex-1">
                Consignee Address / Alamat Penerima :<br/>
                PT. ENVITECH PERKASA<br/>
                {project?.project_name || project?.project_code || "-"}<br/>
              </div>
            </div>
          </div>
          <div className="border-t border-black px-1.5 py-1 text-[7.5px]">
            Please furnish the following materials/equipment as described below subject to all terms and conditions set forth on back side of the Purchase Order
            <br />
            Harap dipenuhi barang-barang/peralatan tersebut di bawah ini sesuai dengan seluruh ketentuan-ketentuan dan syarat-syarat yang tercantum pada bagian belakang Pesanan Pembelian ini.
          </div>
        </section>

        <table className="w-full text-[8px]">
          <thead>
            <tr>
              <th className="w-[9mm] px-1 py-1 text-center align-top">
                <div className="inline-block border-b border-black pb-0.5 mb-0.5">Item</div>
                <div>No.</div>
              </th>
              <th className="w-[18mm] px-1 py-1 text-center align-top">
                <div className="inline-block border-b border-black pb-0.5 mb-0.5">Qty</div>
                <div>Jumlah</div>
              </th>
              <th className="w-[18mm] px-1 py-1 text-center align-top">
                <div className="inline-block border-b border-black pb-0.5 mb-0.5">Unit</div>
                <div>Satuan</div>
              </th>
              <th className="px-1 py-1 text-center align-top">
                <div className="inline-block border-b border-black pb-0.5 mb-0.5">Description</div>
                <div>Penjelasan</div>
              </th>
              <th className="w-[29mm] px-1 py-1 text-center align-top">
                <div className="inline-block border-b border-black pb-0.5 mb-0.5">Unit Price</div>
                <div>Harga Sat. (IDR)</div>
              </th>
              <th className="w-[30mm] px-1 py-1 text-center align-top">
                <div className="inline-block border-b border-black pb-0.5 mb-0.5">Total Amount</div>
                <div>Jumlah (IDR)</div>
              </th>
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
                    <p>{itemName}</p>
                    {itemCode ? <p>{itemCode}</p> : null}
                    {row.description ? <p className="mt-1 whitespace-pre-line">{row.description}</p> : null}
                    <div className="mt-8 space-y-0.5">
                      <p>GENERAL TERM &amp; CONDITION:</p>
                      <p>- Delivery time : {record?.delivery_status || "Ready stock"}</p>
                      <p>- Franco {project?.project_name || project?.project_code || "-"}</p>
                      <p>- Penalty : One Permile per Day max 5%</p>
                      <p>- Grand Total Prices is INCLUDED PPN 11%</p>
                      <p>- Kepatuhan SMK3L (Sistem Manajemen Kesehatan, Keselamatan Kerja dan Lingkungan)</p>
                      <p>- Other Term &amp; Condition refer to Qtn</p>
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

        <section className="border-x border-t border-b border-black text-[8px]">
          <div className="grid grid-cols-[135mm_59mm]">
            <div className="border-r border-black p-1.5 flex flex-col justify-between">
              <div>
                <p>Terms of Payment / Syarat Pembayaran :</p>
                <div className="inline-block border-b border-black pb-0.5 mb-0.5 mt-1">Payment Will be Proceed After BAP :</div>
                <p>100%, 4 weeks After Goods &amp; Invoice received</p>
              </div>
            </div>
            <div>
              <div className="grid grid-cols-[29mm_30mm] border-b border-black">
                <div className="px-1.5 py-1">SUB TOTAL</div>
                <div className="border-l border-black px-1.5 py-1 text-right">{formatNumber(subtotal)}</div>
              </div>
              <div className="grid grid-cols-[29mm_30mm] border-b border-black">
                <div className="px-1.5 py-1">DISCOUNT</div>
                <div className="border-l border-black px-1.5 py-1 text-right">
                  {discount > 0
                    ? `${discountPercent.toFixed(2)}% (${formatNumber(discount)})`
                    : formatNumber(0)}
              </div>
              </div>
              <div className="grid grid-cols-[29mm_30mm] border-b border-black">
                <div className="px-1.5 py-1">TOTAL</div>
                <div className="border-l border-black px-1.5 py-1 text-right">{formatNumber(subtotal - discount)}</div>
              </div>
              <div className="grid grid-cols-[29mm_30mm] border-b border-black">
                <div className="px-1.5 py-1">TAX 11%</div>
                <div className="border-l border-black px-1.5 py-1 text-right">{formatNumber(tax)}</div>
              </div>
              <div className="grid grid-cols-[29mm_30mm]">
                <div className="px-1.5 py-1">GRAND TOTAL</div>
                <div className="border-l border-black px-1.5 py-1 text-right">{formatNumber(total)}</div>
              </div>
            </div>
          </div>
          
          <div className="border-t border-b border-black p-1.5">
            (Terbilang : )
          </div>

          <div className="grid grid-cols-[30mm_105mm_29mm_30mm]">
            <div className="border-r border-black p-1.5">
              Note / Catatan :
            </div>
            <div className="border-r border-black p-1.5 flex flex-col justify-between min-h-[30mm]">
              <div>
                Supplier Acceptance / Persetujuan Pemasok<br/>
                {supplier?.name || "-"}
              </div>
              <div>Signature / Date :</div>
            </div>
            <div className="border-r border-black p-1.5 flex flex-col justify-end text-center">
              Purchasing Mgr.
            </div>
            <div className="p-1.5 flex flex-col justify-end text-center">
              Director
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}

function PrApprovalBox({ label, subLabel }) {
  return (
    <div className="flex min-h-[23mm] flex-col justify-end text-center">
      <div className="border-t border-black px-1 py-1 text-[8px] leading-tight">
        <div className="inline-block border-b border-black pb-0.5 mb-0.5">
          {label}
        </div>
        <div>{subLabel}</div>
      </div>
    </div>
  );
}

function PurchaseRequestDocument({ record, relatedPo }) {
  const item = record?.items;
  const project = record?.projects;
  const supplier = relatedPo?.suppliers;
  const detailItems = Array.isArray(record?.purchase_request_items) && record.purchase_request_items.length
    ? record.purchase_request_items
    : [
        {
          item_id: record?.item_id,
          item_name: item?.name || record?.item_summary || "-",
          description: record?.item_summary || "-",
          quantity: record?.quantity || 1,
          unit: record?.unit || item?.unit || "LOT",
          estimated_price: record?.estimated_unit_price || 0,
          items: item,
          cost_codes: null
        }
      ];
  const costCodeSummary = detailItems
    .map((detail) => detail.cost_code || [detail.cost_codes?.code, detail.cost_codes?.name].filter(Boolean).join(" - "))
    .filter(Boolean)
    .filter((value, index, array) => array.indexOf(value) === index)
    .join(", ");

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

        .pr-items-table tbody td {
          border-top: 0;
          border-bottom: 0;
        }

        .pr-items-table tbody tr:last-child td {
          border-bottom: 1px solid #000;
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
              <span className="font-semibold">No. :</span>
              <span className="font-bold">{record?.pr_number || "-"}</span>
              <span>Attachment / Lampiran :</span>
              <span>-</span>
            </div>
          </div>
        </header>

        <table className="pr-items-table mt-2 w-full text-[8px]">
          <thead>
            <tr>
              <th className="w-[15mm] px-1 py-1 text-center align-top">
                <div className="inline-block border-b border-black pb-0.5 mb-0.5">Item</div>
                <div>No.</div>
              </th>
              <th className="w-[18mm] px-1 py-1 text-center align-top">
                <div className="inline-block border-b border-black pb-0.5 mb-0.5">Quantity</div>
                <div>Jumlah</div>
              </th>
              <th className="w-[20mm] px-1 py-1 text-center align-top">
                <div className="inline-block border-b border-black pb-0.5 mb-0.5">Unit</div>
                <div>Satuan</div>
              </th>
              <th className="px-1 py-1 text-center align-top">
                <div className="inline-block border-b border-black pb-0.5 mb-0.5">Description</div>
                <div>Penjelasan</div>
              </th>
              <th className="w-[42mm] px-1 py-1 text-center align-top">
                <div className="inline-block border-b border-black pb-0.5 mb-0.5">Remarks</div>
                <div>Keterangan</div>
              </th>
            </tr>
          </thead>
          <tbody>
            {detailItems.map((detail, index) => {
              const detailItem = detail.items || {};
              const itemDescription = [
                detail.item_name || detailItem.name,
                detailItem.item_code,
              ].filter(Boolean);

              return (
                <tr key={detail.id || index} className="align-top">
                  <td className="px-1 py-2 text-center">{index + 1}</td>
                  <td className="px-1 py-2 text-center">{formatNumber(detail.quantity || 1)}</td>
                  <td className="px-1 py-2 text-center">{detail.unit || detailItem.unit || "LOT"}</td>
                  <td className="h-[24mm] px-2 py-2 leading-snug">
                    {itemDescription.map((line, lineIndex) => (
                      <p key={`${detail.id || index}-${lineIndex}`} className="whitespace-pre-line">{line}</p>
                    ))}
                  </td>
                  <td className="whitespace-pre-line px-2 py-2 leading-snug">{detail.description || "-"}</td>
                </tr>
              );
            })}
            <tr>
              <td className="h-[76mm] px-1 py-2" />
              <td className="h-[76mm] px-1 py-2" />
              <td className="h-[76mm] px-1 py-2" />
              <td className="h-[76mm] px-1 py-2" />
              <td className="h-[76mm] px-1 py-2" />
            </tr>
          </tbody>
        </table>

        <section className="border-x border-b border-black">
          <div className="grid grid-cols-[53mm_1fr] border-b border-black">
            <div className="px-2 py-1">
              <div className="inline-block border-b border-black pb-0.5 mb-0.5">
                Required For / Date
              </div>
              <div>Diperlukan untuk / Tgl.</div>
            </div>
            <div className="px-2 py-1">
              : {project?.project_name || project?.project_code || "-"} / {formatShortDate(record?.needed_date || record?.request_date)}
            </div>
          </div>

          <div className="grid grid-cols-[53mm_1fr_63mm] border-b border-black">
            <div className="px-2 py-2">
              <div className="inline-block border-b border-black pb-0.5 mb-0.5">
                Ref. Supplier
              </div>
              <div>Ref. Pemasok</div>
            </div>
            <div className="px-2 py-2">
              : {supplier?.name || relatedPo?.suppliers?.supplier_code || ""}
            </div>
            <div className="grid grid-cols-3 divide-x divide-black border-l border-black">
              <PrApprovalBox label="Requested by" subLabel="Diminta oleh" />
              <PrApprovalBox label="Approved by" subLabel="Disetujui oleh" />
              <PrApprovalBox label="Approved by" subLabel="Disetujui oleh" />
            </div>
          </div>

          <div className="grid grid-cols-[1fr_63mm]">
            <div className="px-2 py-2">
              Cost Code No. : {costCodeSummary || "-"}
            </div>
            <div className="border-l border-black px-2 py-2">
              <div className="inline-block border-b border-black pb-0.5 mb-0.5">
                Remarks
              </div>
              <div>Keterangan</div>
              <div className="mt-1 whitespace-pre-line">{record?.notes || "-"}</div>
            </div>
          </div>
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
