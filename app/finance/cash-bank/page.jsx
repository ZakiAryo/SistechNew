import MasterDataPage from "@/components/MasterDataPage";

const typeOptions = [
  { value: "in", label: "In" },
  { value: "out", label: "Out" }
];

export default function CashBankPage() {
  return (
    <MasterDataPage
      title="Cash & Bank"
      description="Cash and bank transactions connected to finance modules."
      tableName="cash_bank_transactions"
      entityName="Cash Bank Transaction"
      allowedRoles={["finance"]}
      userIdField="created_by"
      searchColumns={["description", "transaction_type", "source_module", "bank_account", "status"]}
      columns={[
        { key: "transaction_date", label: "Date", format: "date" },
        { key: "transaction_type", label: "Type", format: "badge" },
        { key: "description", label: "Description" },
        { key: "amount", label: "Amount", format: "currency" },
        { key: "bank_account", label: "Bank" },
        { key: "status", label: "Status", format: "badge" }
      ]}
      fields={[
        { name: "transaction_date", label: "Transaction Date", type: "date", nullable: true },
        { name: "transaction_type", label: "Type", type: "select", options: typeOptions, defaultValue: "out", required: true },
        { name: "description", label: "Description", required: true },
        { name: "amount", label: "Amount", type: "number", defaultValue: "0" },
        { name: "source_module", label: "Source Module", nullable: true },
        { name: "bank_account", label: "Bank Account", nullable: true },
        { name: "status", label: "Status", defaultValue: "posted", required: true }
      ]}
    />
  );
}
