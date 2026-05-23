import {
  Building2,
  ClipboardList,
  FileText,
  FolderKanban,
  Receipt,
  Truck
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import { getCurrentProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

const statDefinitions = [
  { table: "customers", label: "Total Customers", icon: Building2 },
  { table: "suppliers", label: "Total Suppliers", icon: Truck },
  { table: "projects", label: "Total Projects", icon: FolderKanban },
  { table: "purchase_requests", label: "Total Purchase Requests", icon: ClipboardList },
  { table: "purchase_orders", label: "Total Purchase Orders", icon: Receipt },
  { table: "invoices", label: "Total Invoices", icon: FileText }
];

async function loadDashboardData() {
  const emptyStats = statDefinitions.map((item) => ({ ...item, value: 0 }));

  try {
    const supabase = await createSupabaseServerClient();
    const { profile } = await getCurrentProfile(supabase);

    const stats = await Promise.all(
      statDefinitions.map(async (item) => {
        const { count, error } = await supabase
          .from(item.table)
          .select("id", { count: "exact", head: true });

        return {
          ...item,
          value: error ? 0 : count || 0,
          warning: error?.message
        };
      })
    );

    return {
      stats,
      profile,
      setupError: ""
    };
  } catch (error) {
    return {
      stats: emptyStats,
      profile: null,
      setupError: error.message || "Unable to load dashboard data."
    };
  }
}

export default async function DashboardPage() {
  const { stats, profile, setupError } = await loadDashboardData();

  return (
    <AppLayout>
      <PageHeader
        title="Dashboard"
        description="Company overview for customer, supplier, project, purchasing, and finance data."
        eyebrow="Overview"
        actions={
          <span className="inline-flex rounded-full bg-white px-3 py-1.5 text-sm font-medium capitalize text-slate-700 ring-1 ring-slate-200">
            Role: {profile?.role || "user"}
          </span>
        }
      />

      {setupError ? (
        <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {setupError}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((stat) => (
          <StatCard
            key={stat.table}
            label={stat.label}
            value={stat.value}
            icon={stat.icon}
            helper={stat.warning ? "Count fallback is 0. Check Supabase schema and policies." : "Live Supabase count"}
          />
        ))}
      </div>
    </AppLayout>
  );
}
