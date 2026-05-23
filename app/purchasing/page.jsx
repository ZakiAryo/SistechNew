import ModuleDashboard from "@/components/ModuleDashboard";

export default function PurchasingPage() {
  return (
    <ModuleDashboard
      title="Purchasing Dashboard"
      description="Process incoming engineering purchase requests into purchase orders, delivery orders, and payment tracking."
      stats={[
        {
          table: "purchase_requests",
          label: "Incoming PR",
          iconKey: "clipboard",
          filters: [{ column: "status", operator: "eq", value: "pending" }]
        },
        { table: "purchase_orders", label: "Purchase Orders", iconKey: "receipt" },
        { table: "delivery_orders", label: "Delivery Orders", iconKey: "truck" },
        { table: "account_payables", label: "PO vs Payment", iconKey: "wallet" }
      ]}
    />
  );
}
