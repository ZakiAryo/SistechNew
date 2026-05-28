"use client";

import { useRouter } from "next/navigation";
import { Languages } from "lucide-react";
import { useLanguage } from "./LanguageProvider";

export default function LanguageSwitcher() {
  const router = useRouter();
  const { locale, locales, setLocale } = useLanguage();

  function handleChange(nextLocale) {
    if (nextLocale === locale) {
      return;
    }

    setLocale(nextLocale);
    router.refresh();
  }

  return (
    <div
      className="inline-flex h-10 items-center gap-1 rounded-md border border-slate-200 bg-white px-1.5 text-slate-600"
      aria-label="Language selector"
      title="Language selector"
    >
      <Languages className="h-4 w-4 text-slate-400" />
      {locales.map((item) => (
        <button
          key={item.value}
          type="button"
          className={`h-7 rounded px-2 text-xs font-semibold transition ${
            locale === item.value
              ? "bg-slate-900 text-white"
              : "text-slate-500 hover:bg-slate-100 hover:text-slate-950"
          }`}
          onClick={() => handleChange(item.value)}
          aria-pressed={locale === item.value}
        >
          {item.shortLabel}
        </button>
      ))}
    </div>
  );
}
