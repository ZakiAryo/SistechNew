import ReportTablePage from "@/components/ReportTablePage";

export default function ArAgingPage() {
  return (
    <ReportTablePage
      title="List AR Aging"
      description="Account receivable aging report by customer and project."
      allowedRoles={["finance"]}
      tableName="account_receivables"
      selectQuery="*, customers(customer_code, name), projects(project_code, project_name)"
      searchColumns={["invoice_number", "customers.name", "projects.project_code", "status"]}
      columns={[
        { key: "invoice_number", label: "Invoice" },
        { key: "customers.name", label: "Customer" },
        { key: "projects.project_code", label: "Project" },
        { key: "due_date", label: "Due Date", format: "date" },
        { key: "amount", label: "Amount", format: "currency" },
        { key: "paid_amount", label: "Paid", format: "currency" },
        { key: "status", label: "Status", format: "badge" }
      ]}
    />
  );
}
