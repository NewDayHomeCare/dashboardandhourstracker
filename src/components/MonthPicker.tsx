"use client";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";
export function MonthPicker({ month }: { month: string }) {
  const router = useRouter(); const path = usePathname(); const params = useSearchParams();
  const [pending, start] = useTransition();
  return <label className="flex items-center gap-3 text-sm font-semibold">Month
    <input aria-label="Month" type="month" value={month} disabled={pending} className="h-11 rounded-xl border border-slate-300 bg-white px-3"
      onChange={e => { if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(e.target.value)) return;
        const next = new URLSearchParams(params.toString()); next.set("month", e.target.value);
        start(() => router.push(`${path}?${next}`)); }} />
    {pending && <span>Loading...</span>}
  </label>;
}
