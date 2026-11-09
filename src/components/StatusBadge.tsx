import type { ClientStatus, DeadlineStatus } from "@/lib/types";
import { Icon } from "./Icon";

export const STATUS_LABEL: Record<ClientStatus, string> = {
  over: "Over allowance",
  "will-go-over": "Scheduled care exceeds allowance",
  "on-track": "On track",
  unused: "Hours available",
};

const CLIENT_CLS: Record<ClientStatus, string> = {
  over: "bg-bad text-white",
  "will-go-over": "bg-bad-soft text-bad ring-1 ring-inset ring-red-200",
  "on-track": "bg-good-soft text-good",
  unused: "bg-warn-soft text-warn",
};

const DEADLINE: Record<DeadlineStatus, { label: string; cls: string }> = {
  ok: { label: "", cls: "bg-slate-100 text-slate-700" },
  soon: { label: "Bill soon", cls: "bg-warn-soft text-warn" },
  urgent: { label: "Bill now", cls: "bg-bad-soft text-bad ring-1 ring-inset ring-red-200" },
  expired: { label: "Past 60 days", cls: "bg-bad text-white" },
};

export function StatusBadge({ status }: { status: ClientStatus }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-bold ${CLIENT_CLS[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
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
