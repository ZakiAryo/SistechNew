import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE_NAME, isSupportedLocale } from "./i18n";

export async function getServerLocale() {
  try {
    const cookieStore = await cookies();
    const locale = cookieStore.get(LOCALE_COOKIE_NAME)?.value;

    return isSupportedLocale(locale) ? locale : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}
