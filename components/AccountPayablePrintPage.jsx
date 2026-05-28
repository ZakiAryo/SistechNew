"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import EnvitechLogo from "./EnvitechLogo";
import { formatCurrency, formatDate } from "@/lib/accountPayable";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";

const PRINT_SELECT = `
  *,
  suppliers(supplier_code, name, address),
  account_payable_items(
    id,
    invoice_number,
    invoice_date,
    delivery_note_number,
    delivery_note_date,
    po_number,
    po_date,
    project_name,
    amount,
    tax_amount,
    total_amount,
    currency
  )
`;

export default function AccountPayablePrintPage({ id }) {
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
      .from("account_payables")
      .select(PRINT_SELECT)
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

  useEffect(() => {
    loadRecord();
  }, [loadRecord]);

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
          }

          .print-table th,
          .print-table td {
            border: 1px solid #0f172a !important;
          }
        }
      `}</style>

      <div className="no-print mx-auto mb-4 flex max-w-5xl justify-between gap-2">
        <Link
          href={record ? `/finance/account-payable/${record.id}` : "/finance/account-payable"}
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
          Print
        </button>
      </div>

      <section className="print-sheet mx-auto min-h-[297mm] max-w-5xl rounded-sm border border-slate-200 bg-white p-8 shadow-sm print:min-h-0 print:max-w-none print:p-0">
        {loading ? (
          <p className="text-sm text-slate-500">Loading print document...</p>
        ) : error ? (
          <p className="text-sm text-rose-700">{error}</p>
        ) : record ? (
          <>
            <header className="grid grid-cols-[1fr_auto] gap-6 border-b-2 border-slate-950 pb-4">
              <div>
                <div className="flex items-center gap-3">
                  <EnvitechLogo className="h-20 w-52 object-contain" priority />
                  <div>
                    <p className="text-lg font-bold uppercase tracking-wide">SISTECH</p>
                    <p className="text-xs uppercase tracking-wide text-slate-600">Sistem Integrasi Envitech</p>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <h1 className="text-3xl font-bold uppercase tracking-wide">Tanda Terima</h1>
                <p className="mt-2 text-sm">No: <span className="font-semibold">{record.ap_number || "-"}</span></p>
                <p className="text-sm">Tgl: <span className="font-semibold">{formatDate(record.receive_date || record.ap_date)}</span></p>
              </div>
            </header>

            <section className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <p className="font-semibold uppercase text-slate-600">Supplier</p>
                <p className="mt-1 text-base font-semibold">{record.suppliers?.name || "-"}</p>
                <p className="mt-1 leading-6 text-slate-700">{record.suppliers?.address || "-"}</p>
              </div>
              <div className="text-right">
                <p><span className="font-semibold">Payment Term:</span> {record.payment_term || "-"}</p>
                <p><span className="font-semibold">Receive Name:</span> {record.receive_name || "-"}</p>
                <p><span className="font-semibold">Due Date:</span> {formatDate(record.due_date)}</p>
              </div>
            </section>

            <table className="print-table mt-6 w-full border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100">
                  {["No", "Faktur No", "Faktur Tgl", "Surat Jalan No", "Surat Jalan Tgl", "P.O No", "P.O Tgl", "Project Name", "Nilai"].map((header) => (
                    <th key={header} className="border border-slate-950 px-2 py-2 text-left font-semibold">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(record.account_payable_items || []).map((item, index) => (
                  <tr key={item.id}>
                    <td className="border border-slate-950 px-2 py-2 text-center">{index + 1}</td>
                    <td className="border border-slate-950 px-2 py-2">{item.invoice_number || "-"}</td>
                    <td className="border border-slate-950 px-2 py-2">{formatDate(item.invoice_date)}</td>
                    <td className="border border-slate-950 px-2 py-2">{item.delivery_note_number || "-"}</td>
                    <td className="border border-slate-950 px-2 py-2">{formatDate(item.delivery_note_date)}</td>
                    <td className="border border-slate-950 px-2 py-2">{item.po_number || "-"}</td>
                    <td className="border border-slate-950 px-2 py-2">{formatDate(item.po_date)}</td>
                    <td className="border border-slate-950 px-2 py-2">{item.project_name || "-"}</td>
                    <td className="border border-slate-950 px-2 py-2 text-right">{formatCurrency(item.total_amount || item.amount, item.currency || record.currency)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td className="border border-slate-950 px-2 py-2 text-right font-bold" colSpan={8}>
                    Total
                  </td>
                  <td className="border border-slate-950 px-2 py-2 text-right font-bold">
                    {formatCurrency(record.total_amount || record.amount, record.currency || "IDR")}
                  </td>
                </tr>
              </tfoot>
            </table>

            <section className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
              <div className="min-h-24 rounded border border-slate-950 p-3">
                <p className="font-semibold">Keterangan / Payment Term</p>
                <p className="mt-2 leading-6">{record.payment_term || "-"}</p>
              </div>
              <div className="min-h-24 rounded border border-slate-950 p-3">
                <p className="font-semibold">Catatan / Remark</p>
                <p className="mt-2 leading-6">{record.remark || record.notes || "-"}</p>
              </div>
            </section>

            <section className="mt-12 grid grid-cols-2 gap-12 text-center text-sm">
              <div>
                <p>Yang Menerima</p>
                <div className="mx-auto mt-20 w-52 border-t border-slate-950 pt-2">
                  {record.receive_name || "Nama Penerima"}
                </div>
              </div>
              <div>
                <p>Supplier</p>
                <div className="mx-auto mt-20 w-52 border-t border-slate-950 pt-2">
                  {record.suppliers?.name || "Nama Supplier"}
                </div>
              </div>
            </section>
          </>
        ) : null}
      </section>
    </main>
  );
}
