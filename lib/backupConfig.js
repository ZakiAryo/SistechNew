export const backupTableOptions = [
  { value: "profiles", label: "Users & Profiles", group: "Administration" },
  { value: "suppliers", label: "Suppliers", group: "Master Data" },
  { value: "items", label: "Items / Barang", group: "Master Data" },
  { value: "customers", label: "Customers", group: "Master Data" },
  { value: "projects", label: "Projects", group: "Marketing" },
  { value: "project_budgets", label: "Project Budgets", group: "Marketing" },
  { value: "cost_codes", label: "Cost Codes", group: "Marketing" },
  { value: "contracts", label: "Contracts", group: "Marketing" },
  { value: "purchase_requests", label: "Purchase Requests", group: "Engineering" },
  { value: "purchase_request_items", label: "Purchase Request Items", group: "Engineering" },
  { value: "purchase_orders", label: "Purchase Orders", group: "Purchasing" },
  { value: "purchase_order_items", label: "Purchase Order Items", group: "Purchasing" },
  { value: "delivery_orders", label: "Delivery Orders", group: "Purchasing" },
  { value: "account_payables", label: "Account Payables", group: "Finance" },
  { value: "account_payable_items", label: "Account Payable Items", group: "Finance" },
  { value: "account_receivables", label: "Account Receivables", group: "Finance" },
  { value: "cash_bank_transactions", label: "Cash & Bank", group: "Finance" },
  { value: "accounting_entries", label: "Accounting Entries", group: "Finance" },
  { value: "notifications", label: "Notifications", group: "System" },
  { value: "audit_logs", label: "Audit Logs", group: "System" }
];

export const backupTables = backupTableOptions.map((table) => table.value);

export function getBackupTableLabel(tableName) {
  return backupTableOptions.find((table) => table.value === tableName)?.label || tableName;
}

export function groupBackupTables(options = backupTableOptions) {
  return options.reduce((groups, option) => {
    groups[option.group] = groups[option.group] || [];
    groups[option.group].push(option);
    return groups;
  }, {});
}
