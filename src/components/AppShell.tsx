"use client";

// Sidebar + top bar from the team's Figma Make design.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Icon, type IconName } from "./Icon";

const NAV: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Hours overview", icon: "dashboard" },
  { href: "/billing", label: "Billing", icon: "billing" },
];

export function AppShell({ todayLabel, children }: { todayLabel: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" || pathname.startsWith("/clients") : pathname.startsWith(href);

  return (
    <div className="min-h-screen">
      {open && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-slate-950/30 lg:hidden"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[252px] flex-col border-r border-line bg-white transition-transform duration-200 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-[78px] items-center gap-3 border-b border-line px-6">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand text-white">
            <Icon name="activity" size={23} />
          </div>
          <div>
            <p className="text-[17px] font-bold tracking-[-0.02em] text-slate-900">New Day</p>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Homecare</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-6" aria-label="Main">
          <p className="mb-2 px-3 text-xs font-bold uppercase tracking-[0.14em] text-muted">Workspace</p>
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={`mt-1 flex items-center gap-3 rounded-xl px-3 py-3 text-sm ${
                isActive(item.href)
                  ? "bg-brand-soft font-semibold text-brand-dark"
                  : "font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Icon name={item.icon} size={19} /> {item.label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-line p-4 text-xs text-muted">
          Sample data only · no real clients
        </div>
      </aside>

      <div className="min-h-screen lg:pl-[252px]">
        <header className="flex h-[78px] items-center justify-between border-b border-line bg-white px-5 sm:px-8 lg:px-10">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="grid h-11 w-11 place-items-center rounded-lg border border-line text-slate-600 lg:hidden"
              onClick={() => setOpen(true)}
              aria-label="Open navigation"
            >
              <Icon name="menu" />
            </button>
            <div>
              <p className="text-xs font-medium text-muted">{todayLabel}</p>
              <p className="hidden text-sm font-semibold text-slate-700 sm:block">Client hours and billing</p>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-[1500px] p-5 sm:p-8 lg:p-10">{children}</main>
      </div>
    </div>
  );
}
