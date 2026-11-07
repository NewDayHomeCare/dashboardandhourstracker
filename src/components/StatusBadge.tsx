import type { ClientStatus, DeadlineStatus } from "@/lib/types";
import { Icon } from "./Icon";

const CLIENT: Record<ClientStatus, { label: string; cls: string }> = {
  ok: { label: "On track", cls: "bg-good-soft text-good" },
  low: { label: "Running low", cls: "bg-warn-soft text-warn" },
  over: { label: "Over approved", cls: "bg-bad-soft text-bad" },
};

const DEADLINE: Record<DeadlineStatus, { label: string; cls: string }> = {
  ok: { label: "", cls: "bg-slate-100 text-slate-700" },
  soon: { label: "Bill soon", cls: "bg-warn-soft text-warn" },
  urgent: { label: "Bill now", cls: "bg-bad-soft text-bad ring-1 ring-inset ring-red-200" },
  expired: { label: "Past 60 days", cls: "bg-bad text-white" },
};

export function StatusBadge({ status }: { status: ClientStatus }) {
  const s = CLIENT[status];
  return <span className={`inline-block whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-bold ${s.cls}`}>{s.label}</span>;
}

export function DeadlineBadge({ status, daysLeft }: { status: DeadlineStatus; daysLeft: number }) {
  const s = DEADLINE[status];
  const text = status === "expired" ? s.label : `${s.label ? `${s.label} · ` : ""}${daysLeft} days left`;
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-bold ${s.cls}`}>
      <Icon name="calendar" size={14} />
      {text}
    </span>
  );
}
