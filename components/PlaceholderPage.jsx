import AppLayout from "./AppLayout";
import PageHeader from "./PageHeader";

export default function PlaceholderPage({ title, description }) {
  return (
    <AppLayout>
      <PageHeader title={title} description={description} eyebrow="Module" />
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8">
        <p className="text-sm font-semibold text-slate-950">Coming soon</p>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          This module is reserved for the next migration phase. The route is ready, and the
          implementation will be added after authentication and master data are stable.
        </p>
      </div>
    </AppLayout>
  );
}
