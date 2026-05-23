"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck, X } from "lucide-react";
import { getMenuSectionsForRole, roleLabels } from "@/lib/menuConfig";
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

export default function Sidebar({ open, onClose, profile, profileError, profileLoading }) {
  const pathname = usePathname();
  const role = profile?.role || "";
  const roleKey = normalizeRole(role);
  const menuSections = getMenuSectionsForRole(roleKey);

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
          {profileLoading ? (
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
              Loading role menu
            </p>
          ) : profileError ? (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              Menu unavailable until public.profiles is fixed.
            </p>
          ) : menuSections.length ? (
            menuSections.map((section) => {
              const activeIndex = findActiveIndex(section.items, pathname);

              return (
                <div key={section.title}>
                  <p className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    {section.title}
                  </p>
                  <div className="mt-2 space-y-1">
                    {section.items.map((item, index) => {
                      const active = index === activeIndex && isActivePath(pathname, item.href);

                      return (
                        <Link
                          key={`${section.title}-${item.href}-${item.label}`}
                          href={item.href}
                          onClick={onClose}
                          aria-current={active ? "page" : undefined}
                          className={`group relative flex min-h-10 items-center overflow-hidden rounded-md py-2 pl-8 pr-3 text-sm font-medium transition-all duration-200 ${
                            active
                              ? "bg-slate-50 text-slate-950"
                              : "text-slate-600 hover:translate-x-0.5 hover:bg-slate-50 hover:text-slate-950"
                          }`}
                        >
                          {active ? (
                            <span className="absolute inset-y-2 left-3 w-1 rounded-full bg-cyan-500" />
                          ) : null}
                          <span className="leading-5">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })
          ) : (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              No sidebar menu is configured for role: {role || "missing role"}.
            </p>
          )}
        </nav>

        <div className="border-t border-slate-200 p-4">
          <div className="rounded-lg bg-slate-50 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Supabase Auth
            </div>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Current menu:{" "}
              {profileLoading
                ? "Loading role"
                : profileError
                  ? "Profile error"
                  : roleLabels[roleKey] || role || "Role unavailable"}
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
