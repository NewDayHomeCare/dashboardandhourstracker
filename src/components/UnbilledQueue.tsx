import Link from "next/link";
import type { Client, Visit } from "@/lib/types";
import { formatHours, unbilledQueue } from "@/lib/engine";
import { DeadlineBadge } from "./StatusBadge";

export function UnbilledQueue({visits,clients}:{visits:Visit[];clients:Client[]}) {
  const queue=unbilledQueue(visits);
  return <section aria-label="Services not yet submitted across all months" className="mb-6 rounded-2xl border border-line bg-white p-5">
    <h2 className="font-bold">Unbilled services - all months</h2>
    <p className="mt-2 mb-4 text-sm text-muted">{queue.length} services awaiting submission. Oldest first, including previous months. This list is independent of the month picker. Deadline estimates use the unverified billing rules.</p>
    {!queue.length?<p className="text-sm">No services awaiting submission.</p>:<div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left text-sm"><thead><tr className="border-b"><th className="py-2">Service date</th><th>Client</th><th>Hours</th><th>Deadline estimate</th><th>Review</th></tr></thead><tbody>{queue.slice(0,10).map(({visit,status,daysLeft})=>{
      const client=clients.find(c=>c.id===visit.clientId);
      return <tr className="border-b" key={visit.id}><td className="py-3">{visit.date}</td><td>{client?.lastName}, {client?.firstName}</td><td>{formatHours(visit.hours)} h</td><td><DeadlineBadge status={status} daysLeft={daysLeft}/></td><td><Link className="font-semibold text-brand underline" href={`/clients/${visit.clientId}?month=${visit.date.slice(0,7)}`}>Service details</Link>{" · "}<Link className="text-brand underline" href={`/billing?period=${visit.date}`}>Billing period</Link></td></tr>;
    })}</tbody></table></div>}
    {queue.length>10&&<p className="mt-3 text-xs text-muted">Showing the 10 oldest services. Client details and billing periods show the full records.</p>}
  </section>;
}
