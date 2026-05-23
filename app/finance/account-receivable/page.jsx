import MasterDataPage from "@/components/MasterDataPage";

const statusOptions = [
  { value: "unpaid", label: "Unpaid" },
  { value: "partial", label: "Partial" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" }
];

export default function AccountReceivablePage() {
  return (
    <MasterDataPage
      title="Account Receivable"
      description="Customer invoice and receivable tracking connected to project and customer data."
      tableName="account_receivables"
      entityName="Account Receivable"
      allowedRoles={["finance"]}
      selectQuery="*, projects(project_code, project_name), customers(customer_code, name)"
      searchColumns={["invoice_number", "projects.project_code", "customers.name", "status", "notes"]}
      columns={[
        { key: "invoice_number", label: "Invoice" },
        { key: "customers.name", label: "Customer" },
        { key: "projects.project_code", label: "Project" },
        { key: "amount", label: "Amount", format: "currency" },
        { key: "paid_amount", label: "Paid", format: "currency" },
        { key: "status", label: "Status", format: "badge" }
      ]}
      fields={[
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
        { name: "invoice_date", label: "Invoice Date", type: "date", nullable: true },
        { name: "due_date", label: "Due Date", type: "date", nullable: true },
        { name: "amount", label: "Amount", type: "number", defaultValue: "0" },
        { name: "paid_amount", label: "Paid Amount", type: "number", defaultValue: "0" },
        { name: "status", label: "Status", type: "select", options: statusOptions, defaultValue: "unpaid", required: true },
        { name: "payment_date", label: "Payment Date", type: "date", nullable: true },
        { name: "notes", label: "Notes", type: "textarea", nullable: true, fullWidth: true }
      ]}
    />
  );
}
