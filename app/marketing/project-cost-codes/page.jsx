import MasterDataPage from "@/components/MasterDataPage";

const statusOptions = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" }
];

export default function ProjectCostCodesPage() {
  return (
    <MasterDataPage
      title="Project Cost Code List"
      description="Map cost codes into projects and track budget versus actual amount."
      tableName="project_cost_codes"
      entityName="Project Cost Code"
      allowedRoles={["marketing"]}
      selectQuery="*, projects(project_code, project_name), cost_codes(code, name)"
      searchColumns={["projects.project_code", "projects.project_name", "cost_codes.code", "cost_codes.name", "status"]}
      columns={[
        { key: "projects.project_code", label: "Project" },
        { key: "projects.project_name", label: "Project Name" },
        { key: "cost_codes.code", label: "Cost Code" },
        { key: "budget_amount", label: "Budget", format: "currency" },
        { key: "actual_amount", label: "Actual", format: "currency" },
        { key: "status", label: "Status", format: "badge" }
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
          required: true,
          optionsTable: "cost_codes",
          optionSelect: "id, code, name",
          optionLabelKeys: ["code", "name"],
          optionOrder: "code"
        },
        { name: "budget_amount", label: "Budget Amount", type: "number", defaultValue: "0" },
        { name: "actual_amount", label: "Actual Amount", type: "number", defaultValue: "0" },
        { name: "status", label: "Status", type: "select", options: statusOptions, defaultValue: "active", required: true }
      ]}
    />
  );
}
