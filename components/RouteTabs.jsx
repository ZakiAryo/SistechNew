"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
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

export default function RouteTabs({ role }) {
  const pathname = usePathname();
  const listRef = useRef(null);
  const tabRefs = useRef([]);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [pendingIndex, setPendingIndex] = useState(null);
  const [indicator, setIndicator] = useState({
    left: 4,
    width: 0,
    ready: false
  });
  const roleKey = normalizeRole(role);
  const sections = getMenuSectionsForRole(roleKey);
  const activeSection = findActiveSection(sections, pathname);
  const items = activeSection?.items || [];
  const activeIndex = findActiveIndex(items, pathname);
  const visibleIndex = pendingIndex ?? activeIndex;

  const updateIndicator = useCallback(() => {
    const activeElement = tabRefs.current[visibleIndex];
    const listElement = listRef.current;

    if (!activeElement || !listElement) {
      return;
    }

    const activeRect = activeElement.getBoundingClientRect();
    const listRect = listElement.getBoundingClientRect();

    setIndicator({
      left: activeRect.left - listRect.left + listElement.scrollLeft,
      width: activeRect.width,
      ready: true
    });
  }, [visibleIndex]);

  useLayoutEffect(() => {
    updateIndicator();
  }, [items.length, pathname, updateIndicator]);

  useEffect(() => {
    setPendingIndex(null);
  }, [pathname]);

  useLayoutEffect(() => {
    window.addEventListener("resize", updateIndicator);

    return () => window.removeEventListener("resize", updateIndicator);
  }, [updateIndicator]);

  if (!activeSection || items.length <= 1 || activeSection.title === "Workspace") {
    return null;
  }

  return (
    <div className="mb-5 overflow-x-auto pb-1">
      <div
        ref={listRef}
        className="relative inline-flex min-w-full gap-1 rounded-lg border border-slate-200 bg-white p-1.5 shadow-sm"
        onScroll={updateIndicator}
      >
        <span
          className={`pointer-events-none absolute top-1.5 h-9 rounded-md bg-slate-900 shadow-sm transition-all duration-300 ease-out ${
            indicator.ready ? "opacity-100" : "opacity-0"
          }`}
          style={{
            transform: `translateX(${indicator.left}px)`,
            width: indicator.width
          }}
        />
        {items.map((item, index) => {
          const active = index === visibleIndex;

          return (
            <Link
              key={`${activeSection.title}-${item.href}-${item.label}`}
              href={item.href}
              ref={(element) => {
                tabRefs.current[index] = element;
              }}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              onClick={() => setPendingIndex(index)}
              className={`relative z-10 inline-grid h-9 place-items-center whitespace-nowrap rounded-md px-4 text-center text-sm font-semibold leading-none transition-colors duration-200 ${
                active ? "text-white" : "text-slate-600 hover:text-slate-950"
              }`}
              style={{
                backgroundColor:
                  !active && hoveredIndex === index ? "rgb(241 245 249)" : "transparent"
              }}
              aria-current={index === activeIndex ? "page" : undefined}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
