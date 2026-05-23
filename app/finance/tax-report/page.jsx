import ReportTablePage from "@/components/ReportTablePage";

export default function TaxReportPage() {
  return (
    <ReportTablePage
      title="Tax Report"
      description="Initial tax report view based on invoices and finance transactions."
      tableName="invoices"
      selectQuery="*, customers(customer_code, name), projects(project_code, project_name)"
      searchColumns={["invoice_number", "customers.name", "projects.project_code", "status"]}
      columns={[
        { key: "invoice_number", label: "Invoice" },
        { key: "customers.name", label: "Customer" },
        { key: "projects.project_code", label: "Project" },
        { key: "invoice_date", label: "Invoice Date", format: "date" },
        { key: "total_amount", label: "Amount", format: "currency" },
        { key: "status", label: "Status", format: "badge" }
      ]}
    />
  );
}
