// Authenticated server-only boundary. UI/pages must await these functions.
import "server-only";
import { resolve } from "node:path";
import { openHoursDatabase } from "./sqlite";
import { requireStaffIdentity } from "./auth/staffSession";
import { asAuditActor } from "./auth/auditActor";
export type { ChangeResult } from "./sqlite";
type Store=ReturnType<typeof openHoursDatabase>;
const g=globalThis as unknown as {__hoursDatabase?:Store};
const database=()=>g.__hoursDatabase??=openHoursDatabase(resolve(process.env.HOMECARE_DB_PATH??"data/homecare.sqlite"));
async function usingDatabase<T>(operation:(db:Store)=>T):Promise<T>{
  const staff=await requireStaffIdentity();
  return asAuditActor(staff.email,()=>operation(database()));
}
export const getClients=()=>usingDatabase(db=>db.getClients());
export const getClient=(id:string)=>usingDatabase(db=>db.getClient(id));
export const getApprovals=()=>usingDatabase(db=>db.getApprovals());
export const getVisits=()=>usingDatabase(db=>db.getVisits());
export const getSchedule=()=>usingDatabase(db=>db.getSchedule());
export const scheduleCare=(input:Parameters<Store["scheduleCare"]>[0])=>usingDatabase(db=>db.scheduleCare(input));
export const unscheduleCare=(...args:Parameters<Store["unscheduleCare"]>)=>usingDatabase(db=>db.unscheduleCare(...args));
export const getBatches=()=>usingDatabase(db=>db.getBatches());
export const getAudit=(clientId?:string)=>usingDatabase(db=>db.getAudit(clientId));
export const addApproval=(input:Parameters<Store["addApproval"]>[0])=>usingDatabase(db=>db.addApproval(input));
export const setVisitHours=(...args:Parameters<Store["setVisitHours"]>)=>usingDatabase(db=>db.setVisitHours(...args));
export const markClaimSubmitted=(ids:string[])=>usingDatabase(db=>db.markClaimSubmitted(ids));
export const unmarkSubmitted=(...args:Parameters<Store["unmarkSubmitted"]>)=>usingDatabase(db=>db.unmarkSubmitted(...args));
export const importVisits=(rows:Parameters<Store["importVisits"]>[0])=>usingDatabase(db=>db.importVisits(rows));
export const deleteVisit=(...args:Parameters<Store["deleteVisit"]>)=>usingDatabase(db=>db.deleteVisit(...args));
export const addService=(input:Parameters<Store["addService"]>[0])=>usingDatabase(db=>db.addService(input));
export const editService=(...args:Parameters<Store["editService"]>)=>usingDatabase(db=>db.editService(...args));
export const removeService=(...args:Parameters<Store["removeService"]>)=>usingDatabase(db=>db.removeService(...args));
export const submitBatch=(input:Parameters<Store["submitBatch"]>[0])=>usingDatabase(db=>db.submitBatch(input));
export const changeBatchStatus=(...args:Parameters<Store["changeBatchStatus"]>)=>usingDatabase(db=>db.changeBatchStatus(...args));
export const batchTotal=(batch:Parameters<Store["batchTotal"]>[0])=>usingDatabase(db=>db.batchTotal(batch));
