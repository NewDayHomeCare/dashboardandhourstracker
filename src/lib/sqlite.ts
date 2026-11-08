import { auditActor } from "./auth/auditActor";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import type { Approval, Client, Visit, BillingBatch, AuditEvent } from "./types";
import { makeSampleData } from "./sampleData";
import { today, validDate, daysBetween } from "./dates";
import { costCents } from "./engine";
import { settings } from "./settings";

type Seed = ReturnType<typeof makeSampleData>;
export type ChangeResult = { ok: true; id?: string } | { ok: false; error: string; code?: string };
export type ServiceInput = { clientId: string; date: string; hours: number; requestId: string; note?: string; confirmDuplicate?: boolean };
export type SubmissionInput = { visits: { id: string; hours: number; version?: number }[]; reference: string; submittedOn: string; requestId: string; confirmed: boolean };
const fail = (error: string, code?: string): ChangeResult => ({ ok: false, error, code });
const validHours = (n: number) => Number.isFinite(n) && n > 0 && n <= 24 && Math.abs(n * 100 - Math.round(n * 100)) < 1e-9;
const hundredths = (n: number) => Math.round(n * 100);
const plain = (row: object) => ({ ...row });

export function openHoursDatabase(filename: string, seed: () => Seed = makeSampleData) {
  mkdirSync(dirname(filename), { recursive: true });
  const db = new DatabaseSync(filename);
  db.exec("PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000; PRAGMA journal_mode = DELETE;");
  // Before upgrading an existing database, make a consistent SQLite snapshot.
  const legacy = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='visits'").get();
  const upgraded = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='service_entries'").get();
  const needsRevisionMigration = upgraded && (!db.prepare("PRAGMA table_info(service_entries)").all().some(c=>c.name==="version") || !db.prepare("PRAGMA table_info(billing_batches)").all().some(c=>c.name==="voidedIds"));
  if ((legacy && !upgraded) || needsRevisionMigration) {
    const folder = join(dirname(filename), "backups"); mkdirSync(folder, { recursive: true });
    const backup = join(folder, `before-ledger-${Date.now()}-${randomUUID()}.sqlite`);
    db.exec(`VACUUM INTO '${backup.replaceAll("'", "''")}'`);
  }
  const tx = <T,>(fn: () => T): T => {
    db.exec("BEGIN IMMEDIATE");
    try { const result = fn(); db.exec("COMMIT"); return result; }
    catch (error) { db.exec("ROLLBACK"); throw error; }
  };
  tx(() => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS clients (id TEXT PRIMARY KEY, firstName TEXT NOT NULL, lastName TEXT NOT NULL, portalId TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS approvals (id TEXT PRIMARY KEY, clientId TEXT NOT NULL REFERENCES clients(id),
        hoursHundredths INTEGER NOT NULL CHECK(hoursHundredths >= 0), effectiveFrom TEXT NOT NULL, recordedOn TEXT NOT NULL, note TEXT);
      CREATE TABLE IF NOT EXISTS service_entries (id TEXT PRIMARY KEY, clientId TEXT NOT NULL REFERENCES clients(id), date TEXT NOT NULL,
        hoursHundredths INTEGER NOT NULL CHECK(hoursHundredths > 0 AND hoursHundredths <= 2400),
        submitted INTEGER NOT NULL DEFAULT 0 CHECK(submitted IN (0,1)), note TEXT NOT NULL DEFAULT '', batchId TEXT,
        createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS entries_client_date ON service_entries(clientId,date);
      CREATE TABLE IF NOT EXISTS requests (id TEXT PRIMARY KEY, operation TEXT NOT NULL, payload TEXT NOT NULL, resultId TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS billing_batches (id TEXT PRIMARY KEY, clientId TEXT NOT NULL REFERENCES clients(id), reference TEXT NOT NULL,
        submittedOn TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('submitted','paid','returned')), rateCents INTEGER NOT NULL,
        snapshot TEXT NOT NULL, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, note TEXT NOT NULL DEFAULT '');
      CREATE TABLE IF NOT EXISTS audit_events (id TEXT PRIMARY KEY, clientId TEXT NOT NULL, action TEXT NOT NULL, targetId TEXT NOT NULL,
        at TEXT NOT NULL, actor TEXT NOT NULL, beforeJson TEXT, afterJson TEXT);
    `);
    const entryColumns = db.prepare("PRAGMA table_info(service_entries)").all();
    if (!entryColumns.some(c => c.name === "version")) db.exec("ALTER TABLE service_entries ADD COLUMN version INTEGER NOT NULL DEFAULT 1");
    const batchColumns = db.prepare("PRAGMA table_info(billing_batches)").all();
    if (!batchColumns.some(c => c.name === "voidedIds")) db.exec("ALTER TABLE billing_batches ADD COLUMN voidedIds TEXT NOT NULL DEFAULT '[]'");
    if (legacy && !db.prepare("SELECT value FROM metadata WHERE key='entries_migrated'").get()) {
      db.exec(`INSERT OR IGNORE INTO service_entries(id,clientId,date,hoursHundredths,submitted,createdAt,updatedAt)
        SELECT id,clientId,date,hoursHundredths,submitted,strftime('%Y-%m-%dT%H:%M:%fZ','now'),strftime('%Y-%m-%dT%H:%M:%fZ','now') FROM visits`);
      db.prepare("INSERT INTO metadata VALUES ('entries_migrated','1')").run();
    }
    if (!db.prepare("SELECT value FROM metadata WHERE key='initialized'").get()) {
      const initial = seed(); const now = new Date().toISOString();
      for (const c of initial.clients) db.prepare("INSERT INTO clients VALUES (?,?,?,?)").run(c.id,c.firstName,c.lastName,c.portalId);
      for (const a of initial.approvals) db.prepare("INSERT INTO approvals VALUES (?,?,?,?,?,?)").run(a.id,a.clientId,hundredths(a.monthlyHours),a.effectiveFrom,a.recordedOn,a.note??null);
      for (const v of initial.visits) db.prepare("INSERT INTO service_entries(id,clientId,date,hoursHundredths,submitted,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?)").run(v.id,v.clientId,v.date,hundredths(v.hours),Number(v.submitted),now,now);
      db.prepare("INSERT INTO metadata VALUES ('initialized','1')").run();
    }
  });
  const audit = (clientId: string, action: string, targetId: string, before: unknown, after: unknown) => {
    db.prepare("INSERT INTO audit_events VALUES (?,?,?,?,?,?,?,?)").run(randomUUID(),clientId,action,targetId,new Date().toISOString(),auditActor(),before==null?null:JSON.stringify(before),after==null?null:JSON.stringify(after));
  };
  const getClients = (): Client[] => db.prepare("SELECT * FROM clients ORDER BY rowid").all().map(plain) as unknown as Client[];
  const getClient = (id: string): Client|undefined => { const row=db.prepare("SELECT * FROM clients WHERE id=?").get(id); return row?plain(row) as unknown as Client:undefined; };
  const getApprovals = (): Approval[] => db.prepare("SELECT id,clientId,hoursHundredths/100.0 AS monthlyHours,effectiveFrom,recordedOn,note FROM approvals ORDER BY rowid").all().map(r=>({...r,note:r.note??undefined})) as unknown as Approval[];
  const getVisits = (): Visit[] => db.prepare("SELECT id,clientId,date,hoursHundredths/100.0 AS hours,submitted,note,batchId,createdAt,updatedAt,version FROM service_entries ORDER BY date,createdAt,rowid").all().map(r=>({...r,submitted:Boolean(r.submitted)})) as unknown as Visit[];
  const getAudit = (clientId?: string): AuditEvent[] => (clientId?db.prepare("SELECT * FROM audit_events WHERE clientId=? ORDER BY rowid DESC").all(clientId):db.prepare("SELECT * FROM audit_events ORDER BY rowid DESC LIMIT 200").all()).map(plain) as unknown as AuditEvent[];
  const getBatches = (): BillingBatch[] => db.prepare("SELECT * FROM billing_batches ORDER BY rowid DESC").all().map(r=>({...r,visits:JSON.parse(String(r.snapshot)),voidedVisitIds:JSON.parse(String(r.voidedIds))})) as unknown as BillingBatch[];
  const rawVisit = (id: string) => db.prepare("SELECT * FROM service_entries WHERE id=?").get(id);
  const dayTotal = (clientId: string,date: string,except?:string) => Number(db.prepare("SELECT COALESCE(SUM(hoursHundredths),0) AS total FROM service_entries WHERE clientId=? AND date=? AND id != ?").get(clientId,date,except??"")?.total??0);
  const replay = (id:string,operation:string,payload:string): ChangeResult|undefined => {
    const old=db.prepare("SELECT * FROM requests WHERE id=?").get(id);
    if(!old)return; return old.operation===operation&&old.payload===payload?{ok:true,id:String(old.resultId)}:fail("This request changed after it was saved. Close the form and retry.");
  };
  function addService(input: ServiceInput): ChangeResult {
    if(!getClient(input.clientId))return fail("Choose a client.");
    if(!validDate(input.date)||input.date>today())return fail("Choose a valid service date that is not in the future.");
    if(!validHours(input.hours))return fail("Enter hours greater than 0 and at most 24, up to two decimals.");
    if(!input.requestId?.trim()||input.requestId.length>120)return fail("Close and reopen the form before saving.");
    if((input.note??"").length>1000)return fail("Keep notes under 1,000 characters.");
    const payload=JSON.stringify([input.clientId,input.date,hundredths(input.hours),input.note?.trim()??""]);
    return tx(()=>{
      const old=replay(input.requestId,"add",payload);if(old)return old;
      if(dayTotal(input.clientId,input.date)+hundredths(input.hours)>2400)return fail("The total for one client on one day cannot exceed 24 hours.");
      const duplicate=db.prepare("SELECT id FROM service_entries WHERE clientId=? AND date=? AND hoursHundredths=?").get(input.clientId,input.date,hundredths(input.hours));
      if(duplicate&&!input.confirmDuplicate)return fail("A service with this client, date and duration already exists. Confirm this is a separate service.","duplicate");
      const id=`service-${randomUUID()}`;const now=new Date().toISOString();
      db.prepare("INSERT INTO service_entries(id,clientId,date,hoursHundredths,submitted,note,batchId,createdAt,updatedAt) VALUES (?,?,?,?,0,?,NULL,?,?)").run(id,input.clientId,input.date,hundredths(input.hours),input.note?.trim()??"",now,now);
      db.prepare("INSERT INTO requests VALUES (?,?,?,?)").run(input.requestId,"add",payload,id);
      audit(input.clientId,"service_added",id,null,rawVisit(id));return {ok:true,id};
    });
  }
  function editService(id:string,hours:number,expectedHours:number,note:string|undefined,expectedVersion:number):ChangeResult {
    if(!validHours(hours))return fail("Enter hours greater than 0 and at most 24, up to two decimals.");
    if((note??"").length>1000)return fail("Keep notes under 1,000 characters.");
    return tx(()=>{
      const old=rawVisit(id);if(!old)return fail("Record no longer exists. Refresh the page.");
      if(old.submitted)return fail("Submitted or paid services are locked. Record a returned claim first if appropriate.");
      if(!Number.isInteger(expectedVersion)||old.version!==expectedVersion||!Number.isFinite(expectedHours)||old.hoursHundredths!==hundredths(expectedHours))return fail("This record changed. Refresh before editing.");
      if(dayTotal(String(old.clientId),String(old.date),id)+hundredths(hours)>2400)return fail("The daily total cannot exceed 24 hours.");
      db.prepare("UPDATE service_entries SET hoursHundredths=?,note=?,updatedAt=?,version=version+1 WHERE id=?").run(hundredths(hours),note??old.note,new Date().toISOString(),id);
      audit(String(old.clientId),"service_edited",id,old,rawVisit(id));return {ok:true,id};
    });
  }
  function removeService(id:string,expectedHours:number,expectedVersion:number):ChangeResult {
    return tx(()=>{const old=rawVisit(id);if(!old)return fail("Record no longer exists. Refresh the page.");
      if(old.submitted)return fail("Submitted records cannot be deleted.");
      if(!Number.isInteger(expectedVersion)||old.version!==expectedVersion||!Number.isFinite(expectedHours)||old.hoursHundredths!==hundredths(expectedHours))return fail("This record changed. Refresh before deleting.");
      db.prepare("DELETE FROM service_entries WHERE id=?").run(id);audit(String(old.clientId),"service_deleted",id,old,null);return {ok:true,id};});
  }
  function addApproval(input: {clientId:string;monthlyHours:number;effectiveFrom:string;note?:string}):Approval {
    if(!getClient(input.clientId)||!validDate(input.effectiveFrom)||!Number.isFinite(input.monthlyHours)||input.monthlyHours<0||input.monthlyHours>744||Math.abs(input.monthlyHours*100-Math.round(input.monthlyHours*100))>1e-9)throw new Error("Enter a valid client, effective date, and approved hours (0–744, two decimals).");
    return tx(()=>{const approval={...input,id:`appr-${randomUUID()}`,recordedOn:today()};
      db.prepare("INSERT INTO approvals VALUES (?,?,?,?,?,?)").run(approval.id,input.clientId,hundredths(input.monthlyHours),input.effectiveFrom,today(),input.note?.trim()??null);
      audit(input.clientId,"approval_added",approval.id,null,approval);return approval;});
  }
  function submitBatch(input: SubmissionInput): ChangeResult {
    if(!input.confirmed)return fail("Confirm you already submitted these services in the external portal.");
    if(!input.reference?.trim()||input.reference.length>150)return fail("Enter a submission reference (up to 150 characters).");
    if(!validDate(input.submittedOn)||input.submittedOn>today())return fail("Enter a valid submission date, not in the future.");
    if(!input.requestId?.trim()||input.requestId.length>120)return fail("Reopen the submission form.");
    if(!Array.isArray(input.visits)||!input.visits.length||input.visits.length>200)return fail("Choose between 1 and 200 services.");
    if(new Set(input.visits.map(v=>v.id)).size!==input.visits.length)return fail("A service was selected more than once.");
    const payload=JSON.stringify([input.reference.trim(),input.submittedOn,[...input.visits].sort((a,b)=>a.id.localeCompare(b.id))]);
    return tx(()=>{
      const old=replay(input.requestId,"submit",payload);if(old)return old;
      const rows=input.visits.map(v=>rawVisit(v.id));
      if(rows.some((r,i)=>!r||r.submitted||!Number.isInteger(input.visits[i].version)||r.version!==input.visits[i].version||!validHours(input.visits[i].hours)||r.hoursHundredths!==hundredths(input.visits[i].hours)))return fail("Some services changed or were already submitted. Refresh and check the claim.");
      const entries=rows as NonNullable<ReturnType<typeof rawVisit>>[];
      if(new Set(entries.map(r=>r.clientId)).size!==1)return fail("Each claim must contain one client only.");
      if(new Set(entries.map(r=>r.date)).size>settings.maxLinesPerClaim)return fail(`A claim can contain at most ${settings.maxLinesPerClaim} service dates.`);
      if(entries.some(r=>String(r.date)>input.submittedOn))return fail("Submission date cannot be before a service date.");
      const dates=entries.map(r=>String(r.date)).sort();
      if(daysBetween(dates[0],dates[dates.length-1]) >= settings.billingPeriodDays)return fail("A claim cannot span more than one two-week period.");
      const clientId=String(entries[0].clientId);
      if(db.prepare("SELECT id FROM billing_batches WHERE clientId=? AND reference=?").get(clientId,input.reference.trim()))return fail("That submission reference already exists for this client. Use the actual new reference.");
      const id=`claim-${randomUUID()}`;const now=new Date().toISOString();
      const snapshot=entries.map(r=>({id:String(r.id),date:String(r.date),hours:Number(r.hoursHundredths)/100,note:String(r.note)}));
      db.prepare("INSERT INTO billing_batches(id,clientId,reference,submittedOn,status,rateCents,snapshot,createdAt,updatedAt,note) VALUES (?,?,?,?,'submitted',?,?,?,?,?)").run(id,clientId,input.reference.trim(),input.submittedOn,settings.hourlyRateCents,JSON.stringify(snapshot),now,now,"");
      const update=db.prepare("UPDATE service_entries SET submitted=1,batchId=?,updatedAt=?,version=version+1 WHERE id=?");for(const r of entries)update.run(id,now,String(r.id));
      db.prepare("INSERT INTO requests VALUES (?,?,?,?)").run(input.requestId,"submit",payload,id);
      audit(clientId,"claim_submitted",id,null,{reference:input.reference,submittedOn:input.submittedOn,visits:snapshot,rateCents:settings.hourlyRateCents});return {ok:true,id};
    });
  }
  function changeBatchStatus(id:string,status:"paid"|"returned",note:string):ChangeResult {
    if(!["paid","returned"].includes(status))return fail("Invalid claim status.");
    if(!note?.trim()||note.length>1000)return fail("Enter a payment reference or return/correction reason (up to 1,000 characters).");
    return tx(()=>{const old=db.prepare("SELECT * FROM billing_batches WHERE id=?").get(id);
      if(!old||old.status!=="submitted")return fail("Only a submitted claim can be marked paid or returned. Refresh the page.");
      db.prepare("UPDATE billing_batches SET status=?,note=?,updatedAt=? WHERE id=?").run(status,note.trim(),new Date().toISOString(),id);
      if(status==="returned")db.prepare("UPDATE service_entries SET submitted=0,batchId=NULL,updatedAt=?,version=version+1 WHERE batchId=?").run(new Date().toISOString(),id);
      audit(String(old.clientId),`claim_${status}`,id,{status:old.status},{status,note:note.trim()});return {ok:true,id};});
  }
  // Compatibility for daily file imports: never overwrite an ambiguous multi-service day.
  function setVisitHours(clientId:string,date:string,hours:number,mode:"add"|"replace"="replace"):ChangeResult {
    const matches=getVisits().filter(v=>v.clientId===clientId&&v.date===date);
    if(mode==="add"||!matches.length)return addService({clientId,date,hours,requestId:randomUUID()});
    if(matches.length!==1)return fail("Multiple services exist on this day. Edit each service separately.");
    if(!validDate(date)||date>today())return fail("Choose a valid service date.");
    return editService(matches[0].id,hours,matches[0].hours,undefined,matches[0].version??0);
  }
  function deleteVisit(clientId:string,date:string):ChangeResult {
    const matches=getVisits().filter(v=>v.clientId===clientId&&v.date===date);
    if(matches.length!==1)return fail("Select one service record to delete.");
    return removeService(matches[0].id,matches[0].hours,matches[0].version??0);
  }
  function markClaimSubmitted(ids:string[]):number {
    const visits=getVisits().filter(v=>new Set(ids).has(v.id)&&!v.submitted);
    if(!visits.length)return 0;
    const result=submitBatch({visits,reference:`LOCAL-${randomUUID()}`,submittedOn:today(),requestId:randomUUID(),confirmed:true});
    return result.ok?visits.length:0;
  }
  // Undoes "Mark submitted" clicked by mistake, one day at a time. Paid claims stay locked.
  // A fully undone claim is returned; original snapshots never change. Undone IDs are recorded separately.
  function unmarkSubmitted(ids:string[],expectedVersions?:Record<string,number>):number {
    return tx(()=>{
      if(expectedVersions && ids.some(id=>rawVisit(id)?.version!==expectedVersions[id]))return 0;
      let count=0;const touched=new Set<string>();const now=new Date().toISOString();
      for(const id of new Set(ids)){
        const row=rawVisit(id);if(!row||!row.submitted)continue;
        if(row.batchId){const batch=db.prepare("SELECT status FROM billing_batches WHERE id=?").get(String(row.batchId));if(batch&&batch.status!=="submitted")continue;touched.add(String(row.batchId));}
        db.prepare("UPDATE service_entries SET submitted=0,batchId=NULL,updatedAt=?,version=version+1 WHERE id=?").run(now,id);
        audit(String(row.clientId),"submission_undone",id,row,rawVisit(id));count++;
      }
      for(const batchId of touched){
        const batch=db.prepare("SELECT * FROM billing_batches WHERE id=?").get(batchId);if(!batch)continue;
        const snapshot=JSON.parse(String(batch.snapshot)) as {id:string}[];
        const voided=new Set<string>(JSON.parse(String(batch.voidedIds)));
        for(const v of snapshot)if(ids.includes(v.id)&&rawVisit(v.id)?.batchId!==batchId)voided.add(v.id);
        const allUndone=snapshot.every(v=>voided.has(v.id));
        db.prepare("UPDATE billing_batches SET voidedIds=?,status=?,note=?,updatedAt=? WHERE id=?").run(JSON.stringify([...voided]),allUndone?"returned":"submitted","Marked submitted by mistake (undone)",now,batchId);
        audit(String(batch.clientId),"claim_services_undone",batchId,{voidedVisitIds:JSON.parse(String(batch.voidedIds))},{voidedVisitIds:[...voided]});
      }
      return count;
    });
  }
  function importVisits(rows:{clientId:string;date:string;hours:number}[]) {
    const errors:string[]=[];let imported=0;
    rows.forEach((r,n)=>{const result=setVisitHours(r.clientId,r.date,r.hours);if(result.ok)imported++;else errors.push(`Row ${n+1}: ${result.error}`);});return {imported,errors};
  }
  // Totals are calculated per service day, matching the claim lines.
  const batchTotal = (batch:BillingBatch) => {
    const daily=new Map<string,number>();for(const v of batch.status === "returned" ? [] : batch.visits.filter(v=>!(batch.voidedVisitIds??[]).includes(v.id)))daily.set(v.date,(daily.get(v.date)??0)+hundredths(v.hours));
    return [...daily.values()].reduce((s,h)=>s+costCents(h/100,batch.rateCents),0);
  };
  return {getClients,getClient,getApprovals,getVisits,getAudit,getBatches,batchTotal,addApproval,addService,editService,removeService,submitBatch,changeBatchStatus,setVisitHours,deleteVisit,markClaimSubmitted,unmarkSubmitted,importVisits,close:()=>db.close()};
}
