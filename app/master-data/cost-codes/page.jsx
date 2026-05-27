import MasterDataPage from "@/components/MasterDataPage";

const statusOptions = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" }
];

export default function CostCodesPage() {
  return (
    <MasterDataPage
      title="Cost Codes"
      description="Maintain cost code structure for engineering, purchasing, and finance classification."
      tableName="cost_codes"
      entityName="Cost Code"
      searchColumns={["code", "name", "category", "status", "description"]}
      columns={[
        { key: "code", label: "Code" },
        { key: "name", label: "Name" },
        { key: "category", label: "Category" },
        { key: "description", label: "Description" },
        { key: "status", label: "Status", format: "badge" }
      ]}
      fields={[
        {
          name: "code",
          label: "Code",
          placeholder: "Auto generated",
          nullable: true,
          readOnly: true,
          helperText: "Generated automatically on save."
        },
        { name: "name", label: "Name", placeholder: "Engineering Design", required: true },
        { name: "category", label: "Category", placeholder: "Engineering", nullable: true },
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
          placeholder: "Cost code usage",
          nullable: true,
          fullWidth: true
        }
      ]}
    />
  );
}
