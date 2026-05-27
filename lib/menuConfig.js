export const roleLabels = {
  admin: "Administrator",
  marketing: "Marketing & Sales",
  engineering: "Engineering & Project",
  purchasing: "Purchasing",
  finance: "Finance & Accounting",
  user: "User"
};

const allSections = [
  {
    title: "Workspace",
    roles: ["admin", "marketing", "engineering", "purchasing", "finance", "user"],
    items: [{ label: "Dashboard", href: "/dashboard", icon: "dashboard" }]
  },
  {
    title: "Master Data",
    roles: ["admin"],
    icon: "master",
    items: [
      { label: "Customers", href: "/master-data/customers" },
      { label: "Suppliers", href: "/master-data/suppliers" },
      { label: "Items / Barang", href: "/master-data/items" },
      { label: "Projects", href: "/master-data/projects" },
      { label: "Cost Codes", href: "/master-data/cost-codes" }
    ]
  },
  {
    title: "Marketing & Sales",
    roles: ["admin", "marketing"],
    items: [
      { label: "Dashboard", href: "/marketing", icon: "marketing" },
      { label: "Projects", href: "/marketing/projects" },
      { label: "Budgets", href: "/marketing/budgets" },
      { label: "Cost Codes", href: "/marketing/cost-codes" },
      { label: "Project Cost Code Map", href: "/marketing/project-cost-codes" },
      { label: "Contracts", href: "/marketing/contracts" },
      { label: "Customers", href: "/marketing/customers" },
      { label: "Cost Control", href: "/marketing/cost-control" }
    ]
  },
  {
    title: "Engineering & Project",
    roles: ["admin", "engineering"],
    items: [
      { label: "Dashboard", href: "/engineering", icon: "engineering" },
      { label: "Purchase Requests", href: "/engineering/purchase-requests" },
      { label: "Items / Barang", href: "/engineering/items" },
      { label: "PR List Outstanding", href: "/engineering/purchase-requests/outstanding" }
    ]
  },
  {
    title: "Purchasing",
    roles: ["admin", "purchasing"],
    items: [
      { label: "Dashboard", href: "/purchasing", icon: "purchasing" },
      { label: "Suppliers", href: "/purchasing/suppliers" },
      { label: "Items / Barang", href: "/purchasing/items" },
      { label: "Incoming PR", href: "/purchasing/purchase-requests" },
      { label: "Input Purchase Order", href: "/purchasing/purchase-orders" },
      { label: "PO List Outstanding", href: "/purchasing/purchase-orders/outstanding" },
      { label: "Delivery Order", href: "/purchasing/delivery-orders" },
      { label: "PO vs Payment", href: "/purchasing/po-vs-payment" }
    ]
  },
  {
    title: "Finance & Accounting",
    roles: ["admin", "finance"],
    items: [
      { label: "Dashboard", href: "/finance", icon: "finance" },
      { label: "Account Payable", href: "/finance/account-payable" },
      { label: "Account Receivable", href: "/finance/account-receivable" },
      { label: "Cash & Bank", href: "/finance/cash-bank" },
      { label: "List AP Aging", href: "/finance/ap-aging" },
      { label: "List AR Aging", href: "/finance/ar-aging" },
      { label: "Reconcile Bank", href: "/finance/reconcile-bank" },
      { label: "Accounting Report", href: "/finance/accounting-report" },
      { label: "Tax Report", href: "/finance/tax-report" }
    ]
  },
  {
    title: "System",
    roles: ["admin", "marketing", "engineering", "purchasing", "finance", "user"],
    items: [
      {
        label: "Reports",
        href: "/reports",
        icon: "reports",
        roles: ["admin", "marketing", "engineering", "purchasing", "finance"]
      },
      { label: "Notifications", href: "/notifications", icon: "notifications" }
    ]
  },
  {
    title: "Administration",
    roles: ["admin"],
    items: [
      { label: "Users", href: "/users", icon: "users" },
      { label: "Access Control", href: "/users/access-control" },
      { label: "Backup Database", href: "/users/backup" },
      { label: "Audit Logs", href: "/users/audit-logs" }
    ]
  }
];

export function getMenuSectionsForRole(role) {
  const normalizedRole = typeof role === "string" ? role.trim().toLowerCase() : "";

  if (!normalizedRole) {
    return [];
  }

  return allSections
    .filter((section) => section.roles.includes(normalizedRole))
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !item.roles || item.roles.includes(normalizedRole))
    }));
}

export function canRoleAccessPath(role, pathname) {
  const normalizedRole = typeof role === "string" ? role.trim().toLowerCase() : "";

  if (normalizedRole === "admin") {
    return true;
  }

  return getMenuSectionsForRole(normalizedRole).some((section) => {
    return section.items.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
  });
}
