"use client";

import { useEffect, useMemo, useState } from "react";
import { Banknote, ClipboardList, CreditCard, FileClock, FileText, FolderKanban, Handshake, Receipt, Truck, WalletCards } from "lucide-react";
import AppLayout from "./AppLayout";
import { useLanguage } from "./LanguageProvider";
import PageHeader from "./PageHeader";
import StatCard from "./StatCard";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";

const iconMap = {
  banknote: Banknote,
  clipboard: ClipboardList,
  creditCard: CreditCard,
  fileClock: FileClock,
  fileText: FileText,
  folder: FolderKanban,
  handshake: Handshake,
  receipt: Receipt,
  truck: Truck,
  wallet: WalletCards
};

export default function ModuleDashboard({ title, description, stats, children }) {
  const { t } = useLanguage();
  const [values, setValues] = useState({});
  const [setupError, setSetupError] = useState("");
  const supabase = useMemo(() => {
    try {
      return createSupabaseBrowserClient();
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function loadStats() {
      if (!supabase) {
        setSetupError("Supabase environment is not configured. Check .env.local.");
        return;
      }

      const nextValues = {};

      await Promise.all(
        stats.map(async (stat) => {
          let query = supabase.from(stat.table).select("id", { count: "exact", head: true });

          if (stat.filters) {
            stat.filters.forEach((filter) => {
              if (filter.operator === "in") {
                query = query.in(filter.column, filter.value);
              } else if (filter.operator === "eq") {
                query = query.eq(filter.column, filter.value);
              }
            });
          }

          const { count } = await query;
          nextValues[stat.label] = count || 0;
        })
      );

      if (active) {
        setValues(nextValues);
      }
    }

    loadStats();

    return () => {
      active = false;
    };
  }, [stats, supabase]);

  return (
    <AppLayout>
      <PageHeader
        title={t(`page.${title}`, title)}
        description={t(`pageDescription.${title}`, description)}
        eyebrow={t("dashboard.title", "Dashboard")}
      />
      {setupError ? (
        <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {setupError}
        </div>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard
            key={stat.label}
            label={t(`dashboard.stat.${stat.label}`, stat.label)}
            value={values[stat.label] ?? 0}
            icon={iconMap[stat.iconKey] || FileText}
            helper={stat.helper ? t(`dashboard.helper.${stat.helper}`, stat.helper) : undefined}
          />
        ))}
      </div>
      {children ? <div className="mt-6">{children}</div> : null}
    </AppLayout>
  );
}
