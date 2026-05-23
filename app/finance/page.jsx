import ModuleDashboard from "@/components/ModuleDashboard";

export default function FinancePage() {
  return (
    <ModuleDashboard
      title="Finance & Accounting Dashboard"
      description="Receive approved purchasing transactions, process payments, and monitor accounting reports."
      stats={[
        { table: "account_payables", label: "Account Payable", iconKey: "creditCard" },
        { table: "account_receivables", label: "Account Receivable", iconKey: "fileText" },
        { table: "cash_bank_transactions", label: "Cash & Bank", iconKey: "banknote" },
        { table: "accounting_entries", label: "Accounting Entries", iconKey: "wallet" }
      ]}
    />
  );
}
