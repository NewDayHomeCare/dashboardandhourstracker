// Server-only data access. Existing pages/actions keep using the same functions.
import { resolve } from "node:path";
import { openHoursDatabase } from "./sqlite";

export type { ChangeResult } from "./sqlite";
const g = globalThis as unknown as { __hoursDatabase?: ReturnType<typeof openHoursDatabase> };
const database = () => (g.__hoursDatabase ??= openHoursDatabase(
  resolve(process.env.HOMECARE_DB_PATH ?? "data/homecare.sqlite"),
));
export const getClients = () => database().getClients();
export const getClient = (id: string) => database().getClient(id);
export const getApprovals = () => database().getApprovals();
export const getVisits = () => database().getVisits();
export const addApproval = (input: Parameters<ReturnType<typeof openHoursDatabase>["addApproval"]>[0]) => database().addApproval(input);
export const setVisitHours = (clientId: string, date: string, hours: number, mode: "add" | "replace" = "replace") => database().setVisitHours(clientId, date, hours, mode);
export const markClaimSubmitted = (ids: string[]) => database().markClaimSubmitted(ids);
export const unmarkSubmitted = (ids: string[],versions?:Record<string,number>) => database().unmarkSubmitted(ids,versions);
export const importVisits = (rows: Parameters<ReturnType<typeof openHoursDatabase>["importVisits"]>[0]) => database().importVisits(rows);
export const deleteVisit = (clientId: string, date: string) => database().deleteVisit(clientId, date);
export const addService = (input: Parameters<ReturnType<typeof openHoursDatabase>["addService"]>[0]) => database().addService(input);
export const editService = (...args: Parameters<ReturnType<typeof openHoursDatabase>["editService"]>) => database().editService(...args);
export const removeService = (...args: Parameters<ReturnType<typeof openHoursDatabase>["removeService"]>) => database().removeService(...args);
export const submitBatch = (input: Parameters<ReturnType<typeof openHoursDatabase>["submitBatch"]>[0]) => database().submitBatch(input);
export const changeBatchStatus = (...args: Parameters<ReturnType<typeof openHoursDatabase>["changeBatchStatus"]>) => database().changeBatchStatus(...args);
export const getBatches = () => database().getBatches();
export const getAudit = (clientId?: string) => database().getAudit(clientId);
export const batchTotal = (batch: Parameters<ReturnType<typeof openHoursDatabase>["batchTotal"]>[0]) => database().batchTotal(batch);
