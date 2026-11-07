import type { ClientStatus, DeadlineStatus } from "@/lib/types";

const CLIENT: Record<ClientStatus, { label: string; cls: string }> = {
  ok: { label: "On track", cls: "bg-brand-soft text-brand-dark" },
  low: { label: "Running low", cls: "bg-warn-soft text-warn" },
  over: { label: "Over approved", cls: "bg-bad-soft text-bad" },
};

const DEADLINE: Record<DeadlineStatus, { label: string; cls: string }> = {
  ok: { label: "OK", cls: "bg-brand-soft text-brand-dark" },
  soon: { label: "Bill soon", cls: "bg-warn-soft text-warn" },
  urgent: { label: "Bill now", cls: "bg-bad-soft text-bad" },
  expired: { label: "Past 60 days", cls: "bg-bad text-white" },
};

export function StatusBadge({ status }: { status: ClientStatus }) {
  const s = CLIENT[status];
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.cls}`}>{s.label}</span>;
}

export function DeadlineBadge({ status, daysLeft }: { status: DeadlineStatus; daysLeft: number }) {
  const s = DEADLINE[status];
  const detail = status === "expired" ? "" : ` · ${daysLeft} days left`;
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.cls}`}>
      {s.label}
      {detail}
    </span>
  );
}
