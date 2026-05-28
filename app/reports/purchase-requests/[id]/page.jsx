import Link from "next/link";
import WorkflowReportDocument from "@/components/WorkflowReportDocument";
import { getCurrentProfile } from "@/lib/auth";
import { normalizeRole } from "@/lib/profile";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

function ErrorState({ message }) {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6">
      <div className="mx-auto max-w-3xl rounded-lg border border-rose-200 bg-white p-6 text-sm text-rose-700 shadow-sm">
        <p>{message}</p>
        <Link
          href="/dashboard"
          className="mt-4 inline-flex h-10 items-center rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          Back to Dashboard
        </Link>
      </div>
    </main>
  );
}

async function loadPurchaseRequestReport(id) {
  const supabase = await createSupabaseServerClient();
  const { profile, error: profileError } = await getCurrentProfile(supabase);
  const role = normalizeRole(profile?.role);

  if (profileError) {
    return { record: null, relatedPo: null, error: profileError.message };
  }

  if (!["admin", "engineering", "purchasing"].includes(role)) {
    return {
      record: null,
      relatedPo: null,
      error: "Access denied. Purchase Request report is available for Engineering, Purchasing, and Admin."
    };
  }

  const { data: record, error } = await supabase
    .from("purchase_requests")
    .select("*, projects(project_code, project_name), items(item_code, name, unit)")
    .eq("id", id)
    .maybeSingle();

  if (error || !record) {
    return { record: null, relatedPo: null, error: error?.message || "Purchase Request not found." };
  }

  const { data: relatedPo } = await supabase
    .from("purchase_orders")
    .select("po_number, status, order_date, total_amount, suppliers(supplier_code, name, address)")
    .eq("purchase_request_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    record,
    relatedPo,
    error: ""
  };
}

export default async function PurchaseRequestReportRoute({ params }) {
  const { id } = await params;
  const { record, relatedPo, error } = await loadPurchaseRequestReport(id);

  if (error) {
    return <ErrorState message={error} />;
  }

  return <WorkflowReportDocument type="pr" record={record} relatedPo={relatedPo} />;
}
