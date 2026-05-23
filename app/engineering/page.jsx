import ModuleDashboard from "@/components/ModuleDashboard";

export default function EngineeringPage() {
  return (
    <ModuleDashboard
      title="Engineering & Project Dashboard"
      description="Create purchase requests from project data and monitor outstanding request status."
      stats={[
        { table: "projects", label: "Project Data", iconKey: "folder" },
        { table: "purchase_requests", label: "All Purchase Requests", iconKey: "clipboard" },
        {
          table: "purchase_requests",
          label: "Pending",
          iconKey: "fileClock",
          filters: [{ column: "status", operator: "eq", value: "pending" }]
        },
        {
          table: "purchase_requests",
          label: "Processed",
          iconKey: "receipt",
          filters: [{ column: "status", operator: "eq", value: "processed" }]
        }
      ]}
    />
  );
}
