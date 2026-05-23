import Link from "next/link";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";

const reports = [
  { label: "Project Cost Control", href: "/marketing/cost-control", module: "Marketing" },
  { label: "Purchase Request Outstanding", href: "/engineering/purchase-requests/outstanding", module: "Engineering" },
  { label: "Purchase Order Outstanding", href: "/purchasing/purchase-orders/outstanding", module: "Purchasing" },
  { label: "PO vs Payment", href: "/purchasing/po-vs-payment", module: "Purchasing" },
  { label: "AP Aging", href: "/finance/ap-aging", module: "Finance" },
  { label: "AR Aging", href: "/finance/ar-aging", module: "Finance" },
  { label: "Accounting Report", href: "/finance/accounting-report", module: "Finance" },
  { label: "Tax Report", href: "/finance/tax-report", module: "Finance" }
];

export default function ReportsPage() {
  return (
    <AppLayout>
      <PageHeader
        title="Reports"
        description="Realtime report entry points for project, purchasing, and finance transactions. Each report includes search and export actions."
        eyebrow="System"
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {reports.map((report) => (
          <Link key={report.href} href={report.href} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-cyan-200 hover:shadow-soft">
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-700">{report.module}</p>
            <h2 className="mt-2 text-base font-semibold text-slate-950">{report.label}</h2>
            <p className="mt-2 text-sm text-slate-500">Open realtime table with PDF and Excel export.</p>
          </Link>
        ))}
      </div>
    </AppLayout>
  );
}
