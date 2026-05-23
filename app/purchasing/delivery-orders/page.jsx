import MasterDataPage from "@/components/MasterDataPage";

const deliveryStatusOptions = [
  { value: "waiting", label: "Waiting" },
  { value: "approved", label: "Approved" },
  { value: "delivered", label: "Delivered" },
  { value: "paid", label: "Paid" }
];

export default function DeliveryOrdersPage() {
  return (
    <MasterDataPage
      title="Delivery Order"
      description="Delivery records linked to purchase orders."
      tableName="delivery_orders"
      entityName="Delivery Order"
      allowedRoles={["purchasing"]}
      selectQuery="*, purchase_orders(po_number, total_amount)"
      searchColumns={["do_number", "purchase_orders.po_number", "status", "notes"]}
      columns={[
        { key: "do_number", label: "DO Number" },
        { key: "purchase_orders.po_number", label: "PO Number" },
        { key: "delivery_date", label: "Delivery Date", format: "date" },
        { key: "status", label: "Status", format: "badge" },
        { key: "notes", label: "Notes" }
      ]}
      fields={[
        { name: "do_number", label: "DO Number", placeholder: "DO-001", nullable: true },
        {
          name: "purchase_order_id",
          label: "Purchase Order",
          type: "select",
          required: true,
          optionsTable: "purchase_orders",
          optionSelect: "id, po_number",
          optionLabelKeys: ["po_number"],
          optionOrder: "po_number"
        },
        { name: "delivery_date", label: "Delivery Date", type: "date", nullable: true },
        { name: "status", label: "Status", type: "select", options: deliveryStatusOptions, defaultValue: "waiting", required: true },
        { name: "notes", label: "Notes", type: "textarea", nullable: true, fullWidth: true }
      ]}
    />
  );
}
