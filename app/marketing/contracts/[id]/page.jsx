import Link from "next/link";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export default async function ContractDetailPage({ params }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: contract, error } = await supabase
    .from("contracts")
    .select("*, projects(project_code, project_name), customers(customer_code, name)")
    .eq("id", id)
    .maybeSingle();

  return (
    <AppLayout>
      <PageHeader
        title="Detail Contract"
        description="Customer contract detail connected to project and customer data."
        eyebrow="Marketing & Sales"
      />

      {error || !contract ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error?.message || "Contract not found."}
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <dl className="grid gap-5 sm:grid-cols-2">
            {[
              ["Contract Number", contract.contract_number],
              ["Title", contract.contract_title],
              ["Customer", contract.customers?.name],
              ["Project", contract.projects?.project_name],
              ["Value", new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(contract.contract_value || 0))],
              ["Status", contract.status],
              ["Contract Date", contract.contract_date],
              ["Period", `${contract.start_date || "-"} to ${contract.end_date || "-"}`]
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</dt>
                <dd className="mt-1 text-sm font-medium text-slate-800">{value || "-"}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link href="/marketing/contracts" className="inline-flex h-10 items-center rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-100">
              Back
            </Link>
            {contract.document_url ? (
              <a href={contract.document_url} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800">
                View Contract
              </a>
            ) : null}
          </div>
        </div>
      )}
    </AppLayout>
  );
}
