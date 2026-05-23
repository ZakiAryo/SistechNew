import ReportTablePage from "@/components/ReportTablePage";

export default function CostControlPage() {
  return (
    <ReportTablePage
      title="Project Cost Control"
      description="Budget vs actual report from realtime project budget transactions."
      tableName="project_budgets"
      selectQuery="*, projects(project_code, project_name), cost_codes(code, name)"
      searchColumns={["projects.project_code", "projects.project_name", "cost_codes.code", "cost_codes.name", "notes"]}
      columns={[
        { key: "projects.project_code", label: "Project" },
        { key: "projects.project_name", label: "Project Name" },
        { key: "cost_codes.code", label: "Cost Code" },
        { key: "budget_amount", label: "Budget", format: "currency" },
        { key: "actual_amount", label: "Actual", format: "currency" },
        { key: "notes", label: "Notes" }
      ]}
    />
  );
}
