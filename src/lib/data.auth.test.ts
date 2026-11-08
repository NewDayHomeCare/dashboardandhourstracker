import { beforeEach,describe,expect,it,vi } from "vitest";
import { StaffAccessError } from "./auth/policy";
import { auditActor } from "./auth/auditActor";
const mocks=vi.hoisted(()=>({identity:vi.fn(),open:vi.fn()}));
vi.mock("server-only",()=>({}));
vi.mock("./auth/staffSession",()=>({requireStaffIdentity:mocks.identity}));
vi.mock("./sqlite",()=>({openHoursDatabase:mocks.open}));
import * as data from "./data";
const globalStore=globalThis as unknown as {__hoursDatabase?:unknown};
beforeEach(()=>{delete globalStore.__hoursDatabase;vi.clearAllMocks();});
describe("authenticated data boundary",()=>{
 it("rejects reads and writes before opening any client database",async()=>{
   mocks.identity.mockRejectedValue(new StaffAccessError());
   const attempts=[()=>data.getClients(),()=>data.getClient("c"),()=>data.getApprovals(),()=>data.getVisits(),()=>data.getBatches(),()=>data.getAudit(),()=>data.addService({clientId:"c",date:"2026-11-06",hours:2,requestId:"test"}),()=>data.removeService("v",2,1),()=>data.changeBatchStatus("b","paid","test")];
   for(const call of attempts)await expect(call()).rejects.toBeInstanceOf(StaffAccessError);
   expect(mocks.open).not.toHaveBeenCalled();
 });
 it("uses the current staff identity for audit, isolated from other operations",async()=>{
   mocks.identity.mockResolvedValue({email:"staff@example.test",name:"Demo"});
   const add=vi.fn(()=>({ok:true,actor:auditActor()}));mocks.open.mockReturnValue({addService:add});
   const result=await data.addService({clientId:"c",date:"2026-11-06",hours:2,requestId:"test"});
   expect(result).toMatchObject({ok:true,actor:"staff@example.test"});expect(auditActor()).toBe("Local operator (not authenticated)");
 });
 it("checks access again for each operation so removal is not bypassed by a cached database",async()=>{
   mocks.identity.mockResolvedValueOnce({email:"staff@example.test",name:"Demo"}).mockRejectedValueOnce(new StaffAccessError());
   const get=vi.fn(()=>[]);mocks.open.mockReturnValue({getVisits:get});await expect(data.getVisits()).resolves.toEqual([]);await expect(data.getVisits()).rejects.toBeInstanceOf(StaffAccessError);expect(get).toHaveBeenCalledTimes(1);
 });
});
