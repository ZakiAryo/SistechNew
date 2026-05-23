import { normalizeRole } from "./profile";

export const reportCatalog = [
  {
    label: "Data Customer",
    href: "/marketing/customers",
    module: "Marketing",
    roles: ["marketing"],
    description: "Customer report and searchable customer records."
  },
  {
    label: "Project Cost Control",
    href: "/marketing/cost-control",
    module: "Marketing",
    roles: ["marketing"],
    description: "Budget vs actual project cost report."
  },
  {
    label: "List of Contract",
    href: "/marketing/contracts",
    module: "Marketing",
    roles: ["marketing"],
    description: "Customer contract list and contract details."
  },
  {
    label: "Purchase Request Outstanding",
    href: "/engineering/purchase-requests/outstanding",
    module: "Engineering",
    roles: ["engineering"],
    description: "Outstanding purchase request status from Engineering."
  },
  {
    label: "Purchase Order Outstanding",
    href: "/purchasing/purchase-orders/outstanding",
    module: "Purchasing",
    roles: ["purchasing"],
    description: "Outstanding purchase orders by supplier and project."
  },
  {
    label: "Delivery Order",
    href: "/purchasing/delivery-orders",
    module: "Purchasing",
    roles: ["purchasing"],
    description: "Delivery order status from processed purchase orders."
  },
  {
    label: "PO vs Payment",
    href: "/purchasing/po-vs-payment",
    module: "Purchasing",
    roles: ["purchasing"],
    description: "Purchase order value compared with payment status."
  },
  {
    label: "AP Aging",
    href: "/finance/ap-aging",
    module: "Finance",
    roles: ["finance"],
    description: "Account payable aging from supplier invoices."
  },
  {
    label: "AR Aging",
    href: "/finance/ar-aging",
    module: "Finance",
    roles: ["finance"],
    description: "Account receivable aging by customer and project."
  },
  {
    label: "Reconcile Bank",
    href: "/finance/reconcile-bank",
    module: "Finance",
    roles: ["finance"],
    description: "Cash and bank reconciliation report."
  },
  {
    label: "Accounting Report",
    href: "/finance/accounting-report",
    module: "Finance",
    roles: ["finance"],
    description: "Accounting entries from AP, AR, cash, and bank activities."
  },
  {
    label: "Tax Report",
    href: "/finance/tax-report",
    module: "Finance",
    roles: ["finance"],
    description: "Tax-oriented invoice and transaction report."
  }
];

export function canRoleAccessReport(role, report) {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === "admin") {
    return true;
  }

  return report.roles.includes(normalizedRole);
}

export function getReportsForRole(role) {
  return reportCatalog.filter((report) => canRoleAccessReport(role, report));
}

export function getReportByPath(pathname) {
  return reportCatalog.find((report) => pathname === report.href || pathname.startsWith(`${report.href}/`));
}
