import MasterDataPage from "@/components/MasterDataPage";

const projectStatusOptions = [
  { value: "planning", label: "Planning" },
  { value: "active", label: "Active" },
  { value: "on_hold", label: "On Hold" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" }
];

export default function MarketingProjectsPage() {
  return (
    <MasterDataPage
      title="Data Project Customer"
      description="Create customer project data that Engineering and Purchasing will use downstream."
      tableName="projects"
      entityName="Project"
      allowedRoles={["marketing"]}
      userIdField="created_by"
      selectQuery="*, customers(customer_code, name)"
      searchColumns={["project_code", "project_name", "customers.name", "status", "description"]}
      columns={[
        { key: "project_code", label: "Code" },
        { key: "project_name", label: "Project" },
        { key: "customers.name", label: "Customer" },
        { key: "estimated_budget", label: "Budget", format: "currency" },
        { key: "actual_cost", label: "Actual", format: "currency" },
        { key: "status", label: "Status", format: "badge" }
      ]}
      fields={[
        {
          name: "project_code",
          label: "Project Code",
          placeholder: "Auto generated",
          nullable: true,
          readOnly: true,
          helperText: "Generated automatically on save."
        },
        { name: "project_name", label: "Project Name", placeholder: "Project name", required: true },
        {
          name: "customer_id",
          label: "Customer",
          type: "select",
          placeholder: "Select customer",
          nullable: true,
          optionsTable: "customers",
          optionSelect: "id, customer_code, name",
          optionLabelKeys: ["customer_code", "name"],
          optionOrder: "name"
        },
        { name: "status", label: "Status", type: "select", options: projectStatusOptions, defaultValue: "planning", required: true },
        { name: "estimated_budget", label: "Estimated Budget", type: "number", defaultValue: "0" },
        { name: "actual_cost", label: "Actual Cost", type: "number", defaultValue: "0" },
        { name: "start_date", label: "Start Date", type: "date", nullable: true },
        { name: "end_date", label: "End Date", type: "date", nullable: true },
        { name: "description", label: "Description", type: "textarea", placeholder: "Project scope", nullable: true, fullWidth: true }
      ]}
    />
  );
}
