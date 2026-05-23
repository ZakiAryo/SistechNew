import ReportTablePage from "@/components/ReportTablePage";

export default function ReconcileBankPage() {
  return (
    <ReportTablePage
      title="Reconcile Bank"
      description="Cash and bank transaction report for reconciliation."
      tableName="cash_bank_transactions"
      searchColumns={["description", "transaction_type", "source_module", "bank_account", "status"]}
      columns={[
        { key: "transaction_date", label: "Date", format: "date" },
        { key: "transaction_type", label: "Type", format: "badge" },
        { key: "description", label: "Description" },
        { key: "source_module", label: "Source" },
        { key: "amount", label: "Amount", format: "currency" },
        { key: "bank_account", label: "Bank" },
        { key: "status", label: "Status", format: "badge" }
      ]}
    />
  );
}
