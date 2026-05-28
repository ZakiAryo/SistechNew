import "./globals.css";
import { LanguageProvider } from "@/components/LanguageProvider";
import { getServerLocale } from "@/lib/i18nServer";

export const metadata = {
  title: "SISTECH",
  description: "Modern internal company system built with Next.js and Supabase"
};

export default async function RootLayout({ children }) {
  const locale = await getServerLocale();

  return (
    <html lang={locale}>
      <body>
        <LanguageProvider initialLocale={locale}>{children}</LanguageProvider>
      </body>
    </html>
  );
}
