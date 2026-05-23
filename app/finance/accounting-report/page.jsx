import ReportTablePage from "@/components/ReportTablePage";

export default function AccountingReportPage() {
  return (
    <ReportTablePage
      title="Accounting Report"
      description="Accounting entries generated from AP, AR, cash, and bank activities."
      allowedRoles={["finance"]}
      tableName="accounting_entries"
      searchColumns={["source_module", "account_code", "description"]}
      columns={[
        { key: "entry_date", label: "Date", format: "date" },
        { key: "source_module", label: "Source" },
        { key: "account_code", label: "Account" },
        { key: "description", label: "Description" },
        { key: "debit", label: "Debit", format: "currency" },
        { key: "credit", label: "Credit", format: "currency" }
      ]}
    />
  );
}
