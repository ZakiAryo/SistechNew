import MasterDataPage from "@/components/MasterDataPage";

const statusOptions = [
  { value: "pending", label: "Pending" },
  { value: "processed", label: "Processed" },
  { value: "approved", label: "Approved" }
];

const priorityOptions = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" }
];

export default function EngineeringPurchaseRequestsPage() {
  return (
    <MasterDataPage
      title="Input Purchase Request"
      description="Create purchase requests based on Marketing project data. Submitted PRs are automatically visible to Purchasing."
      tableName="purchase_requests"
      entityName="Purchase Request"
      allowedRoles={["engineering"]}
      userIdField="requested_by"
      detailBasePath="/reports/purchase-requests"
      selectQuery="*, projects(project_code, project_name), items(item_code, name, unit)"
      searchColumns={["pr_number", "projects.project_code", "projects.project_name", "items.item_code", "items.name", "status", "priority", "item_summary"]}
      columns={[
        { key: "pr_number", label: "PR Number" },
        { key: "projects.project_code", label: "Project" },
        { key: "items.item_code", label: "Item" },
        { key: "item_summary", label: "Item Summary" },
        { key: "estimated_amount", label: "Est. Amount", format: "currency" },
        { key: "priority", label: "Priority", format: "badge" },
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
          name: "item_id",
          label: "Item / Barang",
          type: "select",
          required: true,
          optionsTable: "items",
          optionSelect: "id, item_code, name",
          optionLabelKeys: ["item_code", "name"],
          optionOrder: "name"
        },
        { name: "quantity", label: "Quantity", type: "number", defaultValue: "1" },
        { name: "unit", label: "Unit", placeholder: "pcs, set, meter", nullable: true },
        { name: "request_date", label: "Request Date", type: "date", nullable: true },
        { name: "needed_date", label: "Needed Date", type: "date", nullable: true },
        { name: "priority", label: "Priority", type: "select", options: priorityOptions, defaultValue: "normal", required: true },
        { name: "status", label: "Status", type: "select", options: statusOptions, defaultValue: "pending", required: true },
        { name: "estimated_unit_price", label: "Est. Unit Price", type: "number", defaultValue: "0" },
        { name: "estimated_amount", label: "Estimated Amount", type: "number", defaultValue: "0" },
        { name: "item_summary", label: "Item Summary", type: "textarea", required: true, fullWidth: true },
        { name: "notes", label: "Notes", type: "textarea", nullable: true, fullWidth: true }
      ]}
    />
  );
}
