import ItemsMasterPage from "@/components/ItemsMasterPage";

export default function MasterItemsPage() {
  return (
    <ItemsMasterPage
      description="Global item and material master shared by Engineering, Purchasing, and Finance workflows."
      allowedRoles={[]}
    />
  );
}
