"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Printer, Download } from "lucide-react";
import EnvitechLogo from "./EnvitechLogo";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";

function formatDateID(dateStr) {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "Long",
      year: "numeric"
    });
  } catch {
    return dateStr;
  }
}

function formatNumberID(val) {
  const num = Number(val || 0);
  return new Intl.NumberFormat("id-ID").format(num);
}

export default function CostRequestPrintPage({ id }) {
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

  useEffect(() => {
    loadRecord();
  }, [loadRecord]);

  const items = Array.isArray(record?.cost_request_items) ? record.cost_request_items : [];

  const grandTotal = items.reduce((sum, item) => {
    return sum + (Number(item.total_amount) || (Number(item.quantity) * Number(item.unit_price)) || 0);
  }, 0);

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950 print:bg-white print:p-0">
      <style>{`
        @page {
          size: A4 portrait;
          margin: 12mm 15mm;
        }

        @media print {
          .no-print {
            display: none !important;
          }

          body {
            background: white !important;
            color: black !important;
          }

          .print-sheet {
            box-shadow: none !important;
            border: 0 !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          .pb-table th,
          .pb-table td {
            border: 1px solid #000 !important;
          }
        }

        .pb-document,
        .pb-document * {
          font-family: Arial, Helvetica, sans-serif !important;
        }
      `}</style>

      <div className="no-print mx-auto mb-4 flex max-w-4xl justify-between gap-2">
        <Link
          href={record ? `/finance/cost-requests/${record.id}` : "/finance/cost-requests"}
          className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </Link>
        <div className="flex gap-2">
          <button
            type="button"
            className="inline-flex h-10 items-center gap-2 rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800"
            onClick={() => window.print()}
          >
            <Printer className="h-4 w-4" />
            Cetak / Export PDF
          </button>
        </div>
      </div>

      <section className="pb-document print-sheet mx-auto max-w-4xl rounded-sm border border-slate-300 bg-white p-10 shadow-sm print:max-w-none print:p-0">
        {loading ? (
          <p className="py-8 text-center text-sm text-slate-500">Memuat dokumen permohonan biaya...</p>
        ) : error ? (
          <p className="py-8 text-center text-sm text-rose-700">{error}</p>
        ) : record ? (
          <div className="space-y-6 text-sm text-black">
            {/* Header: Logo & Title */}
            <div className="flex items-start justify-between">
              <div>
                <EnvitechLogo className="h-16 w-52 object-contain" priority />
              </div>
              <div className="pt-2 text-right">
                <h1 className="text-2xl font-bold uppercase tracking-wider text-black">
                  PERMOHONAN BIAYA
                </h1>
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-[1fr_auto] gap-8 pt-2 text-[13px] leading-relaxed">
              <table className="w-full text-left font-medium">
                <tbody>
                  <tr>
                    <td className="w-32 font-bold uppercase tracking-wide py-0.5">NAMA PROYEK</td>
                    <td className="w-4 font-bold py-0.5">:</td>
                    <td className="py-0.5 font-semibold">{record.project_name || "-"}</td>
                  </tr>
                  <tr>
                    <td className="font-bold uppercase tracking-wide py-0.5">KODE PROYEK</td>
                    <td className="font-bold py-0.5">:</td>
                    <td className="py-0.5">{record.project_code || "-"}</td>
                  </tr>
                  <tr>
                    <td className="font-bold uppercase tracking-wide py-0.5">DIMINTA OLEH</td>
                    <td className="font-bold py-0.5">:</td>
                    <td className="py-0.5">{record.requested_by_name || "-"}</td>
                  </tr>
                  <tr>
                    <td className="font-bold uppercase tracking-wide py-0.5">JABATAN</td>
                    <td className="font-bold py-0.5">:</td>
                    <td className="py-0.5 uppercase">{record.position || "-"}</td>
                  </tr>
                  <tr>
                    <td className="font-bold uppercase tracking-wide py-0.5">DEPARTEMEN</td>
                    <td className="font-bold py-0.5">:</td>
                    <td className="py-0.5 uppercase">{record.department || "-"}</td>
                  </tr>
                  <tr>
                    <td className="font-bold uppercase tracking-wide py-0.5">KETERANGAN</td>
                    <td className="font-bold py-0.5">:</td>
                    <td className="py-0.5">{record.description || "-"}</td>
                  </tr>
                </tbody>
              </table>

              <table className="text-left font-medium">
                <tbody>
                  <tr>
                    <td className="font-bold tracking-wide py-0.5 pr-2 whitespace-nowrap">No. PB</td>
                    <td className="font-bold py-0.5 pr-2">:</td>
                    <td className="py-0.5 font-bold whitespace-nowrap">{record.pb_number || "-"}</td>
                  </tr>
                  <tr>
                    <td className="font-bold tracking-wide py-0.5 pr-2 whitespace-nowrap">Tanggal</td>
                    <td className="font-bold py-0.5 pr-2">:</td>
                    <td className="py-0.5 whitespace-nowrap">{formatDateID(record.request_date)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Table Detail Biaya */}
            <div className="pt-2">
              <table className="pb-table w-full border-collapse border border-black text-xs">
                <thead>
                  <tr className="border-b border-black bg-white">
                    <th className="border border-black px-2 py-1.5 text-center font-bold w-10">No.</th>
                    <th className="border border-black px-2 py-1.5 text-center font-bold w-24">Kode Biaya</th>
                    <th className="border border-black px-3 py-1.5 text-center font-bold uppercase">URAIAN</th>
                    <th className="border border-black px-2 py-1.5 text-center font-bold w-28">Jumlah</th>
                    <th className="border border-black px-3 py-1.5 text-center font-bold w-32">Harga (Rp.)</th>
                    <th className="border border-black px-3 py-1.5 text-center font-bold w-36">TOTAL (Rp.)</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length > 0 ? (
                    items.map((item, idx) => {
                      const itemTotal = Number(item.total_amount) || (Number(item.quantity) * Number(item.unit_price)) || 0;
                      return (
                        <tr key={item.id || idx}>
                          <td className="border border-black px-2 py-2 text-center align-top font-medium">
                            {idx + 1}
                          </td>
                          <td className="border border-black px-2 py-2 align-top text-center">
                            {item.cost_code || "-"}
                          </td>
                          <td className="border border-black px-3 py-2 align-top leading-relaxed">
                            {item.description}
                          </td>
                          <td className="border border-black px-2 py-2 align-top text-center">
                            <div className="flex justify-between px-2">
                              <span>{item.quantity}</span>
                              <span className="text-slate-700">{item.unit || "lot"}</span>
                            </div>
                          </td>
                          <td className="border border-black px-3 py-2 align-top text-right font-medium">
                            {formatNumberID(item.unit_price)}
                          </td>
                          <td className="border border-black px-3 py-2 align-top text-right font-medium">
                            {formatNumberID(itemTotal)}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="border border-black p-4 text-center text-slate-500">
                        Tidak ada detail biaya.
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={5} className="border-0"></td>
                    <td className="border border-black px-3 py-1.5 text-right font-bold">
                      {formatNumberID(grandTotal || record.total_amount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Signature Area */}
            <div className="pt-12 pb-4">
              <div className="grid grid-cols-3 gap-6 text-center text-xs">
                <div>
                  <p className="font-normal">Dilaporkan Oleh,</p>
                  <div className="h-20" />
                  <p className="font-semibold">{record.requested_by_name || "NAI"}</p>
                </div>

                <div>
                  <p className="font-normal">Disetujui Oleh,</p>
                  <div className="h-20" />
                  <p className="font-semibold">Dept./Supv./Mgr./Dir.</p>
                </div>

                <div>
                  <p className="font-normal">Keuangan,</p>
                  <div className="h-20" />
                  <p className="font-semibold">Bag. Keuangan</p>
                </div>
              </div>

              {/* Bottom underline */}
              <div className="mt-2 border-b border-black w-full" />
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
