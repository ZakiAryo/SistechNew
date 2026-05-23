import ReportTablePage from "@/components/ReportTablePage";

export default function EngineeringPrOutstandingPage() {
  return (
    <ReportTablePage
      title="Purchase Request List Outstanding"
      description="Realtime status table for Engineering purchase requests: Pending, Processed, and Approved."
      allowedRoles={["engineering"]}
      tableName="purchase_requests"
      selectQuery="*, projects(project_code, project_name)"
      filters={[{ column: "status", operator: "in", value: ["pending", "processed", "approved"] }]}
      searchColumns={["pr_number", "projects.project_code", "projects.project_name", "status", "priority", "item_summary"]}
      columns={[
        { key: "pr_number", label: "PR Number" },
        { key: "projects.project_code", label: "Project" },
        { key: "projects.project_name", label: "Project Name" },
        { key: "item_summary", label: "Item Summary" },
        { key: "estimated_amount", label: "Amount", format: "currency" },
        { key: "status", label: "Status", format: "badge" }
      ]}
    />
  );
}
