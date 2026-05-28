"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "./LanguageProvider";
import { getMenuTranslationKey } from "@/lib/i18n";
import { getMenuSectionsForProfile } from "@/lib/menuConfig";

function isActivePath(pathname, href) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function findActiveSection(sections, pathname) {
  return sections.find((section) =>
    section.items.some((item) => isActivePath(pathname, item.href))
  );
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

  return prefixMatches[0]?.index ?? 0;
}

export default function RouteTabs({ profile }) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const [pendingIndex, setPendingIndex] = useState(null);
  const sections = getMenuSectionsForProfile(profile);
  const activeSection = findActiveSection(sections, pathname);
  const items = activeSection?.items || [];
  const activeIndex = findActiveIndex(items, pathname);
  const visibleIndex = pendingIndex ?? activeIndex;

  useEffect(() => {
    setPendingIndex(null);
  }, [pathname]);

  if (!activeSection || items.length <= 1 || activeSection.title === "Workspace") {
    return null;
  }

  return (
    <div className="mb-5 overflow-x-auto pb-1">
      <div className="inline-flex min-w-full gap-1 rounded-lg border border-slate-200 bg-white p-1.5 shadow-sm">
        {items.map((item, index) => {
          const active = index === visibleIndex;
          const itemLabel = t(getMenuTranslationKey(item.href), item.label);

          return (
            <Link
              key={`${activeSection.title}-${item.href}-${item.label}`}
              href={item.href}
              onClick={() => setPendingIndex(index)}
              className={`inline-flex h-9 items-center justify-center whitespace-nowrap rounded-md px-4 text-center text-sm font-semibold leading-none transition-all duration-200 ${
                active
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
              }`}
              aria-current={index === activeIndex ? "page" : undefined}
            >
              {itemLabel}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
