import ModuleDashboard from "@/components/ModuleDashboard";

export default function MarketingPage() {
  return (
    <ModuleDashboard
      title="Marketing & Sales Dashboard"
      description="Monitor project customer data, cost code allocation, budget versus actual, and active customer contracts."
      stats={[
        { table: "projects", label: "Data Project Customer", iconKey: "folder" },
        { table: "project_cost_codes", label: "Project Cost Code List", iconKey: "clipboard" },
        { table: "project_budgets", label: "Project Cost Budget", iconKey: "wallet" },
        { table: "contracts", label: "Customer Contract", iconKey: "handshake" }
      ]}
    />
  );
}
