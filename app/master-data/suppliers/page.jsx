import MasterDataPage from "@/components/MasterDataPage";

const statusOptions = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" }
];

export default function SuppliersPage() {
  return (
    <MasterDataPage
      title="Suppliers"
      description="Manage supplier records for purchasing and procurement workflows."
      tableName="suppliers"
      entityName="Supplier"
      searchColumns={["supplier_code", "name", "email", "phone", "contact_person", "status"]}
      columns={[
        { key: "supplier_code", label: "Code" },
        { key: "name", label: "Supplier" },
        { key: "contact_person", label: "Contact" },
        { key: "email", label: "Email" },
        { key: "phone", label: "Phone" },
        { key: "status", label: "Status", format: "badge" }
      ]}
      fields={[
        {
          name: "supplier_code",
          label: "Supplier Code",
          placeholder: "Auto generated",
          nullable: true,
          readOnly: true,
          helperText: "Generated automatically on save."
        },
        { name: "name", label: "Supplier Name", placeholder: "PT Supplier", required: true },
        { name: "email", label: "Email", type: "email", placeholder: "sales@supplier.com", nullable: true },
        { name: "phone", label: "Phone", placeholder: "+62 21 555 1101", nullable: true },
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
          placeholder: "Supplier address",
          nullable: true,
          fullWidth: true
        }
      ]}
    />
  );
}
