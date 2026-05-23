import MasterDataPage from "@/components/MasterDataPage";

export default function ProjectBudgetsPage() {
  return (
    <MasterDataPage
      title="Project Cost Budget"
      description="Input project budget and actual values for cost control reporting."
      tableName="project_budgets"
      entityName="Project Budget"
      allowedRoles={["marketing"]}
      selectQuery="*, projects(project_code, project_name), cost_codes(code, name)"
      searchColumns={["projects.project_code", "projects.project_name", "cost_codes.code", "cost_codes.name", "notes"]}
      columns={[
        { key: "projects.project_code", label: "Project" },
        { key: "cost_codes.code", label: "Cost Code" },
        { key: "fiscal_year", label: "Year" },
        { key: "budget_amount", label: "Budget", format: "currency" },
        { key: "actual_amount", label: "Actual", format: "currency" },
        { key: "notes", label: "Notes" }
      ]}
      fields={[
        {
          name: "project_id",
          label: "Project",
          type: "select",
          required: true,
          optionsTable: "projects",
          optionSelect: "id, project_code, project_name",
          optionLabelKeys: ["project_code", "project_name"],
          optionOrder: "project_name"
        },
        {
          name: "cost_code_id",
          label: "Cost Code",
          type: "select",
          nullable: true,
          optionsTable: "cost_codes",
          optionSelect: "id, code, name",
          optionLabelKeys: ["code", "name"],
          optionOrder: "code"
        },
        { name: "fiscal_year", label: "Fiscal Year", type: "number", defaultValue: "2026", required: true },
        { name: "budget_amount", label: "Budget Amount", type: "number", defaultValue: "0" },
        { name: "actual_amount", label: "Actual Amount", type: "number", defaultValue: "0" },
        { name: "notes", label: "Notes", type: "textarea", nullable: true, fullWidth: true }
      ]}
    />
  );
}
