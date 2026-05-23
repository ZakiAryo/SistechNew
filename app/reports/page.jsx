import Link from "next/link";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import { getCurrentProfile } from "@/lib/auth";
import { roleLabels } from "@/lib/menuConfig";
import { normalizeRole } from "@/lib/profile";
import { getReportsForRole } from "@/lib/reportConfig";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

async function loadReports() {
  try {
    const supabase = await createSupabaseServerClient();
    const { profile, error } = await getCurrentProfile(supabase);

    if (error) {
      return {
        reports: [],
        role: "",
        error: error.message
      };
    }

    const role = normalizeRole(profile?.role);

    return {
      reports: getReportsForRole(role),
      role,
      error: ""
    };
  } catch (error) {
    return {
      reports: [],
      role: "",
      error: error.message || "Unable to load report access."
    };
  }
}

export default async function ReportsPage() {
  const { reports, role, error } = await loadReports();

  return (
    <AppLayout>
      <PageHeader
        title="Reports"
        description="Realtime report entry points filtered by your profile role. Admin can access every report."
        eyebrow="System"
        actions={
          <span className="inline-flex rounded-full bg-white px-3 py-1.5 text-sm font-medium text-slate-700 ring-1 ring-slate-200">
            {roleLabels[role] || "Role unavailable"}
          </span>
        }
      />

      {error ? (
        <div className="mb-5 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {reports.map((report) => (
          <Link key={report.href} href={report.href} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-cyan-200 hover:shadow-soft">
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-700">{report.module}</p>
            <h2 className="mt-2 text-base font-semibold text-slate-950">{report.label}</h2>
            <p className="mt-2 text-sm text-slate-500">{report.description}</p>
          </Link>
        ))}
      </div>

      {!error && !reports.length ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500">
          No reports are assigned to this role.
        </div>
      ) : null}
    </AppLayout>
  );
}
