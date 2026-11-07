import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/AppShell";
import { today, toUTC } from "@/lib/dates";

export const metadata: Metadata = {
  title: "Client Hours Dashboard",
  description: "Approved, used and remaining CDHCI hours for New Day Homecare clients.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const todayLabel = new Date(toUTC(today())).toLocaleDateString("en-CA", {
    timeZone: "UTC",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <AppShell todayLabel={todayLabel}>{children}</AppShell>
      </body>
    </html>
  );
}
