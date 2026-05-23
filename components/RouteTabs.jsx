"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getMenuSectionsForRole } from "@/lib/menuConfig";
import { normalizeRole } from "@/lib/profile";

function isActivePath(pathname, href) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function findActiveSection(sections, pathname) {
  return sections.find((section) =>
    section.items.some((item) => isActivePath(pathname, item.href))
  );
}

export default function RouteTabs({ role }) {
  const pathname = usePathname();
  const roleKey = normalizeRole(role);
  const sections = getMenuSectionsForRole(roleKey);
  const activeSection = findActiveSection(sections, pathname);
  const items = activeSection?.items || [];

  if (!activeSection || items.length <= 1 || activeSection.title === "Workspace") {
    return null;
  }

  return (
    <div className="mb-5 overflow-x-auto">
      <div className="inline-flex min-w-full gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
        {items.map((item) => {
          const active = isActivePath(pathname, item.href);

          return (
            <Link
              key={`${activeSection.title}-${item.href}-${item.label}`}
              href={item.href}
              className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
              }`}
              aria-current={active ? "page" : undefined}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
