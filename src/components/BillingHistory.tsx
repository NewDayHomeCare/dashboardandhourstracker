import { getClients } from "@/lib/data";
import { BatchStatusActions } from "./BillingControls";
import type { BillingBatch } from "@/lib/types";
import { formatHours, formatMoney, costCents } from "@/lib/engine";
export function BillingHistory({batches}:{batches:BillingBatch[]}) {
  const clients = getClients();
  return <section aria-label="Submission history" className="mb-6 rounded-2xl border border-line bg-white p-5"><h2 className="font-bold">Submission history</h2>
    <p className="my-2 text-xs text-muted">Local records only. Verify submission and full payment in the external system. Historical billed records may have no batch reference.</p>
    {!batches.length&&<p className="py-3 text-sm text-muted">No submissions recorded here yet.</p>}
    <div className="space-y-3">{batches.map(batch=>{
      const active=batch.status==="returned"?[]:batch.visits.filter(v=>!(batch.voidedVisitIds??[]).includes(v.id));
      const days=new Map<string,number>();for(const v of active)days.set(v.date,(days.get(v.date)??0)+Math.round(v.hours*100));
      const cents=[...days.values()].reduce((sum,h)=>sum+costCents(h/100,batch.rateCents),0);
      return <article key={batch.id} className="rounded-xl border border-line p-4" aria-label={`Submission ${batch.reference}`}>
        <div className="flex flex-wrap justify-between gap-3"><div><h3 className="font-semibold">{batch.reference}</h3><p className="text-sm">{clients.find(c=>c.id===batch.clientId)?.lastName}, {clients.find(c=>c.id===batch.clientId)?.firstName}</p><p className="text-sm">{batch.submittedOn} · {batch.status.toUpperCase()} · {formatHours(active.reduce((s,v)=>s+Math.round(v.hours*100),0)/100)} h · {formatMoney(cents)}</p><p className="text-xs text-muted">Status last recorded: {batch.updatedAt}</p>{batch.note&&<p className="text-sm">{batch.note}</p>}</div><BatchStatusActions batch={batch}/></div>
        <details className="mt-2 text-xs"><summary>Original submission snapshot (unchanged)</summary><ul>{batch.visits.map(v=><li key={v.id}>{v.date} · {formatHours(v.hours)} h · {v.note}{(batch.voidedVisitIds??[]).includes(v.id)&&" — submission undone locally"}</li>)}</ul></details>
      </article>;
    })}</div>
  </section>;
}
