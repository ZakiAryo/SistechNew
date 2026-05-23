import MasterDataPage from "@/components/MasterDataPage";

const statusOptions = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" }
];

export default function MarketingCustomersPage() {
  return (
    <MasterDataPage
      title="Data Customer"
      description="Marketing-owned customer records used by project and contract workflows."
      tableName="customers"
      entityName="Customer"
      allowedRoles={["marketing"]}
      searchColumns={["customer_code", "name", "email", "phone", "contact_person", "status"]}
      columns={[
        { key: "customer_code", label: "Code" },
        { key: "name", label: "Customer" },
        { key: "contact_person", label: "Contact" },
        { key: "email", label: "Email" },
        { key: "phone", label: "Phone" },
        { key: "status", label: "Status", format: "badge" }
      ]}
      fields={[
        { name: "customer_code", label: "Customer Code", placeholder: "CUST-001", nullable: true },
        { name: "name", label: "Customer Name", placeholder: "PT Example", required: true },
        { name: "email", label: "Email", type: "email", placeholder: "contact@company.com", nullable: true },
        { name: "phone", label: "Phone", placeholder: "+62 21 555 0101", nullable: true },
        { name: "contact_person", label: "Contact Person", placeholder: "Full name", nullable: true },
        { name: "status", label: "Status", type: "select", options: statusOptions, defaultValue: "active", required: true },
        { name: "address", label: "Address", type: "textarea", placeholder: "Customer address", nullable: true, fullWidth: true }
      ]}
    />
  );
}
