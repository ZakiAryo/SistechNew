import ItemsMasterPage from "@/components/ItemsMasterPage";

export default function EngineeringItemsPage() {
  return (
    <ItemsMasterPage
      title="Items / Barang"
      description="Read and search the global item/material master before creating Engineering purchase requests."
      allowedRoles={["purchasing"]}
    />
  );
}
