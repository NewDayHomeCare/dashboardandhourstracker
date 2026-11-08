import type { MonthSummary } from "@/lib/types";
import { formatHours } from "@/lib/engine";

/**
 * Used + projected hours against approved, as one bar (from the Figma Make design).
 * Dark = used, light = projected. Red when the total goes over, with a line at the approved amount.
 */
export function HoursBar({ s, width = "w-40" }: { s: MonthSummary; width?: string }) {
  const scale = Math.max(s.approvedHours, s.projectedTotal, 0.01);
  const used = (s.usedHours / scale) * 100;
  const projected = (s.projectedHours / scale) * 100;
  const approvedAt = (s.approvedHours / scale) * 100;
  const over = s.projectedTotal > s.approvedHours;
  const label = `${formatHours(s.usedHours)} used and ${formatHours(s.projectedHours)} projected of ${formatHours(s.approvedHours)} approved hours`;

  return (
    <div role="img" aria-label={label} className={`relative h-2.5 ${width} overflow-hidden rounded-full ${over ? "bg-bad-soft" : "bg-slate-100"}`}>
      <span className={`absolute inset-y-0 left-0 ${over ? "bg-bad" : "bg-brand"}`} style={{ width: `${used}%` }} />
      <span className={`absolute inset-y-0 ${over ? "bg-red-300" : "bg-brand-light"}`} style={{ left: `${used}%`, width: `${projected}%` }} />
      {over && <span className="absolute inset-y-0 w-0.5 bg-slate-900" style={{ left: `calc(${approvedAt}% - 1px)` }} />}
    </div>
  );
}
