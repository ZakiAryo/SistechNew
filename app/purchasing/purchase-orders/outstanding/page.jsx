import ReportTablePage from "@/components/ReportTablePage";

export default function PoOutstandingPage() {
  return (
    <ReportTablePage
      title="Purchase Order List Outstanding"
      description="Outstanding PO status report with waiting, approved, and delivered purchase orders."
      allowedRoles={["purchasing"]}
      tableName="purchase_orders"
      selectQuery="*, suppliers(supplier_code, name), projects(project_code, project_name)"
      detailBasePath="/reports/purchase-orders"
      filters={[{ column: "status", operator: "in", value: ["waiting", "approved", "delivered"] }]}
      searchColumns={["po_number", "suppliers.name", "projects.project_code", "status", "payment_status"]}
      columns={[
        { key: "po_number", label: "PO Number" },
        { key: "suppliers.name", label: "Supplier" },
        { key: "projects.project_code", label: "Project" },
        { key: "total_amount", label: "Amount", format: "currency" },
        { key: "status", label: "Status", format: "badge" },
        { key: "payment_status", label: "Payment", format: "badge" }
      ]}
    />
  );
}
