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

async function loadPurchaseOrderReport(id) {
  const supabase = await createSupabaseServerClient();
  const { profile, error: profileError } = await getCurrentProfile(supabase);
  const role = normalizeRole(profile?.role);

  if (profileError) {
    return { record: null, deliveryOrders: [], error: profileError.message };
  }

  if (!["admin", "purchasing", "finance"].includes(role)) {
    return {
      record: null,
      deliveryOrders: [],
      error: "Access denied. Purchase Order report is available for Purchasing, Finance, and Admin."
    };
  }

  const { data: record, error } = await supabase
    .from("purchase_orders")
    .select(`
      *,
      purchase_requests(pr_number, item_summary, request_date, needed_date, priority, quantity, unit, estimated_amount),
      suppliers(supplier_code, name, address, email, phone),
      projects(project_code, project_name),
      items(item_code, name, unit),
      purchase_order_items(item_name, description, quantity, unit, unit_price, total_price, items(item_code, name, unit), cost_codes(code, name))
    `)
    .eq("id", id)
    .maybeSingle();

  if (error || !record) {
    return { record: null, deliveryOrders: [], error: error?.message || "Purchase Order not found." };
  }

  const { data: deliveryOrders } = await supabase
    .from("delivery_orders")
    .select("do_number, delivery_date, status, notes")
    .eq("purchase_order_id", id)
    .order("created_at", { ascending: false });

  return {
    record,
    deliveryOrders: deliveryOrders || [],
    error: ""
  };
}

export default async function PurchaseOrderReportRoute({ params }) {
  const { id } = await params;
  const { record, deliveryOrders, error } = await loadPurchaseOrderReport(id);

  if (error) {
    return <ErrorState message={error} />;
  }

  return <WorkflowReportDocument type="po" record={record} deliveryOrders={deliveryOrders} />;
}
