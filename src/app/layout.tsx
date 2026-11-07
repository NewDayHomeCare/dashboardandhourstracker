import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Client Hours Dashboard",
  description: "Approved, used and remaining CDHCI hours for New Day Homecare clients.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <header className="border-b border-line bg-white">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
            <Link href="/" className="text-lg font-bold text-brand no-underline">
              New Day · Client hours
            </Link>
            <nav aria-label="Main" className="flex gap-1 text-sm">
              <Link href="/" className="rounded-md px-3 py-2 hover:bg-brand-soft">Overview</Link>
              <Link href="/billing" className="rounded-md px-3 py-2 hover:bg-brand-soft">Billing</Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
