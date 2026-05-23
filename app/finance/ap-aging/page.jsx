import ReportTablePage from "@/components/ReportTablePage";

export default function ApAgingPage() {
  return (
    <ReportTablePage
      title="List AP Aging"
      description="Account payable aging report from approved purchasing transactions."
      tableName="account_payables"
      selectQuery="*, suppliers(supplier_code, name), purchase_orders(po_number)"
      searchColumns={["invoice_number", "suppliers.name", "purchase_orders.po_number", "status"]}
      columns={[
        { key: "invoice_number", label: "Invoice" },
        { key: "purchase_orders.po_number", label: "PO" },
        { key: "suppliers.name", label: "Supplier" },
        { key: "due_date", label: "Due Date", format: "date" },
        { key: "amount", label: "Amount", format: "currency" },
        { key: "paid_amount", label: "Paid", format: "currency" },
        { key: "status", label: "Status", format: "badge" }
      ]}
    />
  );
}
