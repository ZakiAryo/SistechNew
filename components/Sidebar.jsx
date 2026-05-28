"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Banknote,
  BarChart3,
  Bell,
  Boxes,
  BriefcaseBusiness,
  Building2,
  ClipboardList,
  CreditCard,
  DatabaseBackup,
  FileClock,
  FileText,
  FolderKanban,
  Handshake,
  LayoutDashboard,
  ListChecks,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Receipt,
  ScrollText,
  ShieldCheck,
  Tags,
  Truck,
  UserRound,
  Users,
  WalletCards,
  X
} from "lucide-react";
import { useLanguage } from "./LanguageProvider";
import {
  getMenuTranslationKey,
  getRoleTranslationKey,
  getSectionTranslationKey
} from "@/lib/i18n";
import { getMenuSectionsForProfile } from "@/lib/menuConfig";
import { normalizeRole } from "@/lib/profile";

function isActivePath(pathname, href) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function findActiveIndex(items, pathname) {
  const exactIndex = items.findIndex((item) => pathname === item.href);

  if (exactIndex >= 0) {
    return exactIndex;
  }

  const prefixMatches = items
    .map((item, index) => ({ index, href: item.href }))
    .filter((item) => pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length);

  return prefixMatches[0]?.index ?? -1;
}

const iconByHref = {
  "/dashboard": LayoutDashboard,
  "/master-data/customers": Building2,
  "/master-data/suppliers": BriefcaseBusiness,
  "/master-data/items": Boxes,
  "/master-data/projects": FolderKanban,
  "/master-data/cost-codes": Tags,
  "/marketing": BarChart3,
  "/marketing/projects": FolderKanban,
  "/marketing/budgets": WalletCards,
  "/marketing/cost-codes": Tags,
  "/marketing/project-cost-codes": ListChecks,
  "/marketing/contracts": Handshake,
  "/marketing/customers": Building2,
  "/marketing/cost-control": BarChart3,
  "/engineering": ClipboardList,
  "/engineering/purchase-requests": ClipboardList,
  "/engineering/purchase-requests/outstanding": FileClock,
  "/purchasing": Receipt,
  "/purchasing/suppliers": BriefcaseBusiness,
  "/purchasing/purchase-requests": ClipboardList,
  "/purchasing/purchase-orders": Receipt,
  "/purchasing/purchase-orders/outstanding": FileClock,
  "/purchasing/delivery-orders": Truck,
  "/purchasing/po-vs-payment": CreditCard,
  "/finance": Banknote,
  "/finance/account-payable": CreditCard,
  "/finance/account-receivable": FileText,
  "/finance/cash-bank": Banknote,
  "/finance/ap-aging": FileClock,
  "/finance/ar-aging": FileClock,
  "/finance/reconcile-bank": WalletCards,
  "/finance/accounting-report": ScrollText,
  "/finance/tax-report": ScrollText,
  "/reports": BarChart3,
  "/notifications": Bell,
  "/users": Users,
  "/users/access-control": ShieldCheck,
  "/users/backup": DatabaseBackup,
  "/users/audit-logs": ScrollText
};

function getItemIcon(item) {
  return iconByHref[item.href] || UserRound;
}

export default function Sidebar({
  open,
  onClose,
  profile,
  profileError,
  profileLoading,
  collapsed,
  onToggleCollapsed
}) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const role = profile?.role || "";
  const roleKey = normalizeRole(role);
  const roleLabel = t(getRoleTranslationKey(roleKey), role || "");
  const menuSections = getMenuSectionsForProfile(profile);

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-slate-950/40 transition-opacity lg:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200 bg-white transition-[transform,width] duration-200 lg:translate-x-0 ${
          collapsed ? "lg:w-20" : "lg:w-72"
        } ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className={`relative flex h-16 items-center justify-between border-b border-slate-200 px-5 ${collapsed ? "lg:justify-center lg:pl-3 lg:pr-7" : ""}`}>
          <Link href="/dashboard" className={`flex items-center gap-3 ${collapsed ? "lg:justify-center" : ""}`} onClick={onClose}>
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-sm font-semibold text-white">
              ST
            </span>
            <span className={collapsed ? "lg:hidden" : ""}>
              <span className="block text-base font-semibold tracking-normal text-slate-950">
                SISTECH
              </span>
              <span className="block text-xs font-medium text-slate-500">
                {t("app.internalSystem", "Internal System")}
              </span>
            </span>
          </Link>
          <button
            type="button"
            className={`hidden items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 lg:inline-flex ${
              collapsed ? "absolute -right-5 top-1/2 z-10 h-8 w-8 -translate-y-1/2 shadow-sm" : "h-9 w-9"
            }`}
            onClick={onToggleCollapsed}
            aria-label={collapsed ? t("common.expandSidebar", "Expand sidebar") : t("common.closeSidebar", "Close sidebar")}
            title={collapsed ? t("common.expandSidebar", "Expand sidebar") : t("common.closeSidebar", "Close sidebar")}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-100 lg:hidden"
            onClick={onClose}
            aria-label={t("common.closeSidebar", "Close sidebar")}
            title={t("common.closeSidebar", "Close sidebar")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className={`flex-1 overflow-y-auto py-5 ${collapsed ? "space-y-2 px-3" : "space-y-6 px-4"}`}>
          {profileLoading ? (
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
              {t("sidebar.loadingMenu", "Loading role menu")}
            </p>
          ) : profileError ? (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {t("sidebar.menuUnavailable", "Menu unavailable until public.profiles is fixed.")}
            </p>
          ) : menuSections.length ? (
            menuSections.map((section) => {
              const activeIndex = findActiveIndex(section.items, pathname);
              const sectionLabel = t(getSectionTranslationKey(section.title), section.title);

              return (
                <div key={section.title} className={collapsed ? "lg:space-y-1" : ""}>
                  <p className={`px-3 text-xs font-semibold uppercase tracking-wider text-slate-400 ${collapsed ? "lg:hidden" : ""}`}>
                    {sectionLabel}
                  </p>
                  <div className={collapsed ? "space-y-1 lg:mt-0" : "mt-2 space-y-1"}>
                    {section.items.map((item, index) => {
                      const active = index === activeIndex && isActivePath(pathname, item.href);
                      const ItemIcon = getItemIcon(item);
                      const itemLabel = t(getMenuTranslationKey(item.href), item.label);

                      return (
                        <Link
                          key={`${section.title}-${item.href}-${item.label}`}
                          href={item.href}
                          onClick={onClose}
                          aria-current={active ? "page" : undefined}
                          title={collapsed ? itemLabel : undefined}
                          className={`group relative flex min-h-10 items-center rounded-md py-2 text-sm font-medium transition-all duration-200 ${
                            collapsed ? "justify-center px-2 lg:h-10 lg:w-10 lg:mx-auto" : "gap-3 pl-8 pr-3"
                          } ${
                            active
                              ? "bg-slate-50 text-slate-950"
                              : "text-slate-600 hover:translate-x-0.5 hover:bg-slate-50 hover:text-slate-950"
                          }`}
                        >
                          {active ? (
                            <span className={`absolute inset-y-2 w-1 rounded-full bg-cyan-500 ${collapsed ? "left-1" : "left-3"}`} />
                          ) : null}
                          <ItemIcon className={`h-4 w-4 flex-none ${collapsed ? "hidden lg:block" : "text-slate-500"}`} />
                          <span className={`leading-5 ${collapsed ? "lg:hidden" : ""}`}>{itemLabel}</span>
                          <span className={`pointer-events-none absolute left-full top-1/2 z-[90] ml-2 hidden -translate-y-1/2 whitespace-nowrap rounded-md border border-slate-200 bg-slate-950 px-2.5 py-1.5 text-xs font-semibold text-white shadow-lg ${
                            collapsed ? "group-hover:lg:block" : ""
                          }`}>
                            {itemLabel}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })
          ) : (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {t("sidebar.noMenu", "No sidebar menu is configured for role: {{role}}.", {
                role: role || "missing role"
              })}
            </p>
          )}
        </nav>

        <div className={`border-t border-slate-200 ${collapsed ? "p-2" : "p-4"}`}>
          <div className="rounded-lg bg-slate-50 p-3">
            <div className={`flex items-center gap-2 text-sm font-semibold text-slate-800 ${collapsed ? "justify-center" : ""}`}>
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span className={collapsed ? "lg:hidden" : ""}>{t("sidebar.systemAccess", "System Access")}</span>
            </div>
            <p className={`mt-1 text-xs leading-5 text-slate-500 ${collapsed ? "lg:hidden" : ""}`}>
              {t("sidebar.activeRole", "Active role")}:{" "}
              {profileLoading
                ? t("common.loadingRole", "Loading role")
                : profileError
                  ? t("sidebar.profileError", "Profile error")
                  : roleLabel || t("common.roleUnavailable", "Role unavailable")}
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
