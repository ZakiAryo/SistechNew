import {
  Building2,
  ClipboardList,
  CreditCard,
  FileText,
  FolderKanban,
  Handshake,
  Receipt,
  Truck,
  WalletCards
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import { getCurrentProfile } from "@/lib/auth";
import { roleLabels } from "@/lib/menuConfig";
import { normalizeRole } from "@/lib/profile";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

const dashboardStatsByRole = {
  admin: [
    { table: "customers", label: "Total Customers", icon: Building2 },
    { table: "suppliers", label: "Total Suppliers", icon: Truck },
    { table: "projects", label: "Total Projects", icon: FolderKanban },
    { table: "purchase_requests", label: "Total Purchase Requests", icon: ClipboardList },
    { table: "purchase_orders", label: "Total Purchase Orders", icon: Receipt },
    { table: "invoices", label: "Total Invoices", icon: FileText }
  ],
  marketing: [
    { table: "projects", label: "Project Customer", icon: FolderKanban },
    { table: "project_cost_codes", label: "Project Cost Codes", icon: ClipboardList },
    { table: "project_budgets", label: "Cost Budgets", icon: WalletCards },
    { table: "contracts", label: "Customer Contracts", icon: Handshake }
  ],
  engineering: [
    { table: "projects", label: "Available Projects", icon: FolderKanban },
    { table: "purchase_requests", label: "Purchase Requests", icon: ClipboardList },
    {
      table: "purchase_requests",
      label: "Pending PR",
      icon: FileText,
      filters: [{ column: "status", operator: "eq", value: "pending" }]
    },
    {
      table: "purchase_requests",
      label: "Processed PR",
      icon: Receipt,
      filters: [{ column: "status", operator: "eq", value: "processed" }]
    }
  ],
  purchasing: [
    {
      table: "purchase_requests",
      label: "Incoming PR",
      icon: ClipboardList,
      filters: [{ column: "status", operator: "eq", value: "pending" }]
    },
    { table: "purchase_orders", label: "Purchase Orders", icon: Receipt },
    {
      table: "purchase_orders",
      label: "Approved PO",
      icon: FileText,
      filters: [{ column: "status", operator: "eq", value: "approved" }]
    },
    {
      table: "delivery_orders",
      label: "Delivery Orders",
      icon: Truck
    }
  ],
  finance: [
    {
      table: "purchase_orders",
      label: "Approved PO",
      icon: Receipt,
      filters: [{ column: "status", operator: "in", value: ["approved", "delivered", "paid"] }]
    },
    { table: "account_payables", label: "Account Payable", icon: CreditCard },
    { table: "account_receivables", label: "Account Receivable", icon: FileText },
    { table: "cash_bank_transactions", label: "Cash & Bank", icon: WalletCards }
  ],
  user: [
    { table: "notifications", label: "Notifications", icon: FileText },
    { table: "projects", label: "Visible Projects", icon: FolderKanban }
  ]
};

async function loadDashboardData() {
  try {
    const supabase = await createSupabaseServerClient();
    const { profile, error: profileError } = await getCurrentProfile(supabase);

    if (profileError) {
      return {
        stats: [],
        profile: null,
        setupError: profileError.message
      };
    }

    const role = normalizeRole(profile?.role);
    const definitions = dashboardStatsByRole[role];

    if (!definitions) {
      return {
        stats: [],
        profile,
        setupError: `No dashboard is configured for role "${profile?.role || "missing role"}". Check public.profiles.role.`
      };
    }

    const stats = await Promise.all(
      definitions.map(async (item) => {
        let query = supabase.from(item.table).select("id", { count: "exact", head: true });

        if (item.filters) {
          item.filters.forEach((filter) => {
            if (filter.operator === "in") {
              query = query.in(filter.column, filter.value);
            } else if (filter.operator === "eq") {
              query = query.eq(filter.column, filter.value);
            }
          });
        }

        const { count, error } = await query;

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
      stats: [],
      profile: null,
      setupError: error.message || "Unable to load dashboard data."
    };
  }
}

export default async function DashboardPage() {
  const { stats, profile, setupError } = await loadDashboardData();
  const roleKey = normalizeRole(profile?.role);

  return (
    <AppLayout>
      <PageHeader
        title="Dashboard"
        description="Role-based overview for realtime workflow data across SISTECH divisions."
        eyebrow="Overview"
        actions={
          <span className="inline-flex rounded-full bg-white px-3 py-1.5 text-sm font-medium capitalize text-slate-700 ring-1 ring-slate-200">
            Role: {roleLabels[roleKey] || profile?.role || "Role unavailable"}
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
            key={`${stat.table}-${stat.label}`}
            label={stat.label}
            value={stat.value}
            icon={stat.icon}
            helper={stat.warning ? "Count fallback is 0. Check database schema and policies." : "Current system total"}
          />
        ))}
      </div>

      {!setupError && !stats.length ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500">
          No dashboard statistics are available for this profile role.
        </div>
      ) : null}
    </AppLayout>
  );
}
