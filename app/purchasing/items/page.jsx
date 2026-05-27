import ItemsMasterPage from "@/components/ItemsMasterPage";

export default function PurchasingItemsPage() {
  return (
    <ItemsMasterPage
      description="Create and maintain the global item/material master used for purchase requests and purchase orders."
      allowedRoles={["purchasing"]}
    />
  );
}
