"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  BriefcaseBusiness,
  ClipboardList,
  FileBarChart2,
  Landmark,
  Layers3,
  Settings2,
  ShieldCheck,
  Users,
  Wrench,
  X
} from "lucide-react";

const mainItems = [
  { label: "Dashboard", href: "/dashboard", icon: BarChart3 },
  { label: "Marketing", href: "/marketing", icon: BriefcaseBusiness },
  { label: "Engineering", href: "/engineering", icon: Wrench },
  { label: "Purchasing", href: "/purchasing", icon: ClipboardList },
  { label: "Finance", href: "/finance", icon: Landmark },
  { label: "Reports", href: "/reports", icon: FileBarChart2 },
  { label: "Notifications", href: "/notifications", icon: Bell },
  { label: "Users", href: "/users", icon: Users }
];

const masterItems = [
  { label: "Customers", href: "/master-data/customers" },
  { label: "Suppliers", href: "/master-data/suppliers" },
  { label: "Projects", href: "/master-data/projects" },
  { label: "Cost Codes", href: "/master-data/cost-codes" }
];

function isActivePath(pathname, href) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Sidebar({ open, onClose }) {
  const pathname = usePathname();

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-slate-950/40 transition-opacity lg:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200 bg-white transition-transform duration-200 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5">
          <Link href="/dashboard" className="flex items-center gap-3" onClick={onClose}>
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-sm font-semibold text-white">
              ST
            </span>
            <span>
              <span className="block text-base font-semibold tracking-normal text-slate-950">
                SISTECH
              </span>
              <span className="block text-xs font-medium text-slate-500">Internal System</span>
            </span>
          </Link>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-100 lg:hidden"
            onClick={onClose}
            aria-label="Close sidebar"
            title="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-4 py-5">
          <div>
            <p className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Workspace
            </p>
            <div className="mt-2 space-y-1">
              {mainItems.slice(0, 1).map((item) => {
                const Icon = item.icon;
                const active = isActivePath(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={`flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition ${
                      active
                        ? "bg-slate-900 text-white"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <div>
            <p className="flex items-center gap-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <Layers3 className="h-3.5 w-3.5" />
              Master Data
            </p>
            <div className="mt-2 space-y-1">
              {masterItems.map((item) => {
                const active = isActivePath(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={`flex h-10 items-center rounded-md px-3 pl-9 text-sm font-medium transition ${
                      active
                        ? "bg-cyan-50 text-cyan-800 ring-1 ring-cyan-100"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <div>
            <p className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Modules
            </p>
            <div className="mt-2 space-y-1">
              {mainItems.slice(1).map((item) => {
                const Icon = item.icon;
                const active = isActivePath(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={`flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition ${
                      active
                        ? "bg-slate-900 text-white"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>

        <div className="border-t border-slate-200 p-4">
          <div className="rounded-lg bg-slate-50 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Supabase Auth
            </div>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Password stays in Supabase Auth, not in public tables.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
