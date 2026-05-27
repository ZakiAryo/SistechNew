import MasterDataPage from "@/components/MasterDataPage";

const poStatusOptions = [
  { value: "waiting", label: "Waiting" },
  { value: "approved", label: "Approved" },
  { value: "delivered", label: "Delivered" },
  { value: "paid", label: "Paid" }
];

export default function PurchasingPurchaseOrdersPage() {
  return (
    <MasterDataPage
      title="Input Purchase Order"
      description="Create and manage purchase orders linked to Engineering purchase requests."
      tableName="purchase_orders"
      entityName="Purchase Order"
      allowedRoles={["purchasing"]}
      selectQuery="*, purchase_requests(pr_number), suppliers(supplier_code, name), projects(project_code, project_name), items(item_code, name)"
      searchColumns={["po_number", "purchase_requests.pr_number", "suppliers.name", "projects.project_code", "items.item_code", "items.name", "status", "payment_status"]}
      columns={[
        { key: "po_number", label: "PO Number" },
        { key: "purchase_requests.pr_number", label: "PR" },
        { key: "suppliers.name", label: "Supplier" },
        { key: "items.item_code", label: "Item" },
        { key: "projects.project_code", label: "Project" },
        { key: "total_amount", label: "Amount", format: "currency" },
        { key: "status", label: "Status", format: "badge" }
      ]}
      fields={[
        {
          name: "purchase_request_id",
          label: "Purchase Request",
          type: "select",
          nullable: true,
          optionsTable: "purchase_requests",
          optionSelect: "id, pr_number, item_summary",
          optionLabelKeys: ["pr_number", "item_summary"],
          optionOrder: "pr_number"
        },
        {
          name: "supplier_id",
          label: "Supplier",
          type: "select",
          required: true,
          optionsTable: "suppliers",
          optionSelect: "id, supplier_code, name",
          optionLabelKeys: ["supplier_code", "name"],
          optionOrder: "name"
        },
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
          name: "item_id",
          label: "Item / Barang",
          type: "select",
          nullable: true,
          optionsTable: "items",
          optionSelect: "id, item_code, name",
          optionLabelKeys: ["item_code", "name"],
          optionOrder: "name"
        },
        { name: "order_date", label: "Order Date", type: "date", nullable: true },
        { name: "total_amount", label: "Total Amount", type: "number", defaultValue: "0" },
        { name: "status", label: "Status", type: "select", options: poStatusOptions, defaultValue: "waiting", required: true },
        { name: "payment_status", label: "Payment Status", type: "select", options: [
          { value: "unpaid", label: "Unpaid" },
          { value: "partial", label: "Partial" },
          { value: "paid", label: "Paid" }
        ], defaultValue: "unpaid", required: true }
      ]}
    />
  );
}
