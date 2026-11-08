import { AsyncLocalStorage } from "node:async_hooks";
const context=new AsyncLocalStorage<string>();
export const auditActor=()=>context.getStore()??"Local operator (not authenticated)";
export function asAuditActor<T>(email:string,operation:()=>T):T{return context.run(email,operation);}
