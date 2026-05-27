import MasterDataPage from "@/components/MasterDataPage";
import { paymentTerms } from "@/lib/accountPayable";

const statusOptions = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" }
];

export default function ContractsPage() {
  return (
    <MasterDataPage
      title="Contract Customer"
      description="Manage customer contracts. Use the detail and view buttons in the table for contract review."
      tableName="contracts"
      entityName="Contract"
      allowedRoles={["marketing"]}
      userIdField="created_by"
      selectQuery="*, projects(project_code, project_name), customers(customer_code, name)"
      searchColumns={["contract_number", "contract_title", "projects.project_name", "customers.name", "status"]}
      detailBasePath="/marketing/contracts"
      documentUrlKey="document_url"
      columns={[
        { key: "contract_number", label: "Contract No." },
        { key: "contract_title", label: "Title" },
        { key: "customers.name", label: "Customer" },
        { key: "projects.project_code", label: "Project" },
        { key: "contract_value", label: "Value", format: "currency" },
        { key: "status", label: "Status", format: "badge" }
      ]}
      fields={[
        {
          name: "contract_number",
          label: "Contract Number",
          placeholder: "Auto generated",
          nullable: true,
          readOnly: true,
          helperText: "Generated automatically on save."
        },
        { name: "contract_title", label: "Contract Title", placeholder: "Contract title", required: true },
        {
          name: "project_id",
          label: "Project",
          type: "select",
          nullable: true,
          optionsTable: "projects",
          optionSelect: "id, project_code, project_name",
          optionLabelKeys: ["project_code", "project_name"],
          optionOrder: "project_name"
        },
        {
          name: "customer_id",
          label: "Customer",
          type: "select",
          nullable: true,
          optionsTable: "customers",
          optionSelect: "id, customer_code, name",
          optionLabelKeys: ["customer_code", "name"],
          optionOrder: "name"
        },
        { name: "contract_value", label: "Contract Value", type: "number", defaultValue: "0" },
        { name: "contract_date", label: "Contract Date", type: "date", nullable: true },
        { name: "start_date", label: "Start Date", type: "date", nullable: true },
        { name: "end_date", label: "End Date", type: "date", nullable: true },
        {
          name: "payment_term",
          label: "Payment Term",
          type: "select",
          placeholder: "Select payment term",
          options: paymentTerms,
          defaultValue: "NET 30",
          nullable: true
        },
        { name: "due_date", label: "Due Date", type: "date", nullable: true },
        { name: "status", label: "Status", type: "select", options: statusOptions, defaultValue: "draft", required: true },
        { name: "document_url", label: "Document URL", placeholder: "https://...", nullable: true, fullWidth: true }
      ]}
    />
  );
}
