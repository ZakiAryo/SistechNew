import ReportTablePage from "@/components/ReportTablePage";

export default function AuditLogsPage() {
  return (
    <ReportTablePage
      title="Audit Logs"
      description="User activity logs for create, update, delete, workflow conversion, and payment processing."
      tableName="audit_logs"
      selectQuery="*, profiles(full_name, email, role)"
      searchColumns={["action", "module", "table_name", "profiles.email", "profiles.role"]}
      columns={[
        { key: "created_at", label: "Time", format: "date" },
        { key: "profiles.email", label: "User" },
        { key: "profiles.role", label: "Role", format: "badge" },
        { key: "module", label: "Module" },
        { key: "action", label: "Action", format: "badge" },
        { key: "table_name", label: "Table" }
      ]}
    />
  );
}
