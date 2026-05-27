import MasterDataPage from "@/components/MasterDataPage";

const statusOptions = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" }
];

export default function CustomersPage() {
  return (
    <MasterDataPage
      title="Customers"
      description="Maintain customer company data, contact details, and active status."
      tableName="customers"
      entityName="Customer"
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
        {
          name: "customer_code",
          label: "Customer Code",
          placeholder: "Auto generated",
          nullable: true,
          readOnly: true,
          helperText: "Generated automatically on save."
        },
        { name: "name", label: "Customer Name", placeholder: "PT Example", required: true },
        { name: "email", label: "Email", type: "email", placeholder: "contact@company.com", nullable: true },
        { name: "phone", label: "Phone", placeholder: "+62 21 555 0101", nullable: true },
        { name: "contact_person", label: "Contact Person", placeholder: "Full name", nullable: true },
        {
          name: "status",
          label: "Status",
          type: "select",
          options: statusOptions,
          defaultValue: "active",
          required: true
        },
        {
          name: "address",
          label: "Address",
          type: "textarea",
          placeholder: "Customer address",
          nullable: true,
          fullWidth: true
        }
      ]}
    />
  );
}
