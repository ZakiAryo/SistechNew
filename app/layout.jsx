import "./globals.css";

export const metadata = {
  title: "SISTECH",
  description: "Modern internal company system built with Next.js and Supabase"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
