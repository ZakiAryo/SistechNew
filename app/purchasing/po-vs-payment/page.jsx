import ReportTablePage from "@/components/ReportTablePage";

export default function PoVsPaymentPage() {
  return (
    <ReportTablePage
      title="PO vs Payment"
      description="Realtime purchasing report comparing purchase order amount and payment status from Finance."
      tableName="purchase_orders"
      selectQuery="*, suppliers(supplier_code, name), projects(project_code, project_name)"
      searchColumns={["po_number", "suppliers.name", "projects.project_code", "status", "payment_status"]}
      columns={[
        { key: "po_number", label: "PO Number" },
        { key: "suppliers.name", label: "Supplier" },
        { key: "projects.project_code", label: "Project" },
        { key: "total_amount", label: "PO Amount", format: "currency" },
        { key: "status", label: "PO Status", format: "badge" },
        { key: "payment_status", label: "Payment", format: "badge" }
      ]}
    />
  );
}
