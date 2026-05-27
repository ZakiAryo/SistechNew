import MasterDataPage from "@/components/MasterDataPage";

const projectStatusOptions = [
  { value: "planning", label: "Planning" },
  { value: "active", label: "Active" },
  { value: "on_hold", label: "On Hold" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" }
];

export default function ProjectsPage() {
  return (
    <MasterDataPage
      title="Project List"
      description="Track project identity, customer ownership, timeline, and current status."
      tableName="projects"
      entityName="Project"
      selectQuery="*, customers(customer_code, name)"
      searchColumns={["project_code", "project_name", "customers.name", "status", "description"]}
      columns={[
        { key: "project_code", label: "Code" },
        { key: "project_name", label: "Project" },
        { key: "customers.name", label: "Customer" },
        { key: "status", label: "Status", format: "badge" },
        { key: "start_date", label: "Start", format: "date" },
        { key: "end_date", label: "End", format: "date" }
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
        {
          name: "status",
          label: "Status",
          type: "select",
          options: projectStatusOptions,
          defaultValue: "planning",
          required: true
        },
        { name: "start_date", label: "Start Date", type: "date", nullable: true },
        { name: "end_date", label: "End Date", type: "date", nullable: true },
        {
          name: "description",
          label: "Description",
          type: "textarea",
          placeholder: "Project scope or notes",
          nullable: true,
          fullWidth: true
        }
      ]}
    />
  );
}
