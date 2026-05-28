"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE_NAME,
  LOCALE_STORAGE_KEY,
  isSupportedLocale,
  supportedLocales,
  translate
} from "@/lib/i18n";

const LanguageContext = createContext(null);

function readCookieLocale() {
  if (typeof document === "undefined") {
    return "";
  }

  const cookie = document.cookie
    .split("; ")
    .find((item) => item.startsWith(`${LOCALE_COOKIE_NAME}=`));

  return cookie ? decodeURIComponent(cookie.split("=")[1] || "") : "";
}

function readStoredLocale() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(LOCALE_STORAGE_KEY) || "";
}

function persistLocale(locale) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  document.cookie = `${LOCALE_COOKIE_NAME}=${encodeURIComponent(locale)}; path=/; max-age=31536000; SameSite=Lax`;
}

export function LanguageProvider({ children, initialLocale = DEFAULT_LOCALE }) {
  const [locale, setLocaleState] = useState(isSupportedLocale(initialLocale) ? initialLocale : DEFAULT_LOCALE);

  useEffect(() => {
    const storedLocale = readStoredLocale() || readCookieLocale();

    if (isSupportedLocale(storedLocale)) {
      setLocaleState(storedLocale);
      persistLocale(storedLocale);
    } else {
      persistLocale(locale);
    }
  }, [locale]);

  const value = useMemo(
    () => ({
      locale,
      locales: supportedLocales,
      setLocale(nextLocale) {
        if (!isSupportedLocale(nextLocale)) {
          return;
        }

        persistLocale(nextLocale);
        setLocaleState(nextLocale);
      },
      t(key, fallback, variables) {
        return translate(locale, key, fallback, variables);
      }
    }),
    [locale]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    return {
      locale: DEFAULT_LOCALE,
      locales: supportedLocales,
      setLocale() {},
      t(key, fallback, variables) {
        return translate(DEFAULT_LOCALE, key, fallback, variables);
      }
    };
  }

  return context;
}
