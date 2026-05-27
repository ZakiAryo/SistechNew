import MasterDataPage from "@/components/MasterDataPage";

const statusOptions = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" }
];

export default function MarketingCostCodesPage() {
  return (
    <MasterDataPage
      title="Cost Codes"
      description="Create and maintain global cost codes used by project budgets and cost control."
      tableName="cost_codes"
      entityName="Cost Code"
      allowedRoles={["marketing"]}
      searchColumns={["code", "name", "category", "status"]}
      columns={[
        { key: "code", label: "Code" },
        { key: "name", label: "Name" },
        { key: "category", label: "Category" },
        { key: "status", label: "Status", format: "badge" }
      ]}
      fields={[
        { name: "code", label: "Code", placeholder: "CC-001", required: true },
        { name: "name", label: "Name", placeholder: "Engineering Labor", required: true },
        { name: "category", label: "Category", placeholder: "Labor / Material", nullable: true },
        {
          name: "status",
          label: "Status",
          type: "select",
          options: statusOptions,
          defaultValue: "active",
          required: true
        },
        { name: "description", label: "Description", type: "textarea", nullable: true, fullWidth: true }
      ]}
    />
  );
}
