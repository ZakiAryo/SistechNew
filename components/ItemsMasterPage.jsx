import MasterDataPage from "./MasterDataPage";

const statusOptions = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" }
];

export default function ItemsMasterPage({
  title = "Items / Barang",
  description = "Global item and material master used by Engineering purchase requests and Purchasing orders.",
  allowedRoles = ["purchasing"]
}) {
  return (
    <MasterDataPage
      title={title}
      description={description}
      tableName="items"
      entityName="Item"
      allowedRoles={allowedRoles}
      searchColumns={["item_code", "name", "category", "unit", "status"]}
      columns={[
        { key: "item_code", label: "Item Code" },
        { key: "name", label: "Item / Material" },
        { key: "category", label: "Category" },
        { key: "unit", label: "Unit" },
        { key: "status", label: "Status", format: "badge" }
      ]}
      fields={[
        { name: "item_code", label: "Item Code", placeholder: "ITM-001", required: true },
        { name: "name", label: "Item / Material Name", placeholder: "Material name", required: true },
        { name: "category", label: "Category", placeholder: "Mechanical / Electrical", nullable: true },
        { name: "unit", label: "Unit", placeholder: "pcs, set, meter", nullable: true },
        {
          name: "status",
          label: "Status",
          type: "select",
          options: statusOptions,
          defaultValue: "active",
          required: true
        },
        {
          name: "description",
          label: "Description",
          type: "textarea",
          placeholder: "Specification or item notes",
          nullable: true,
          fullWidth: true
        }
      ]}
    />
  );
}
