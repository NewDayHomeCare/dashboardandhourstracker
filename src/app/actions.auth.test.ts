import { beforeEach,describe,expect,it,vi } from "vitest";
import { StaffAccessError } from "../lib/auth/policy";
const mocks=vi.hoisted(()=>({identity:vi.fn(),addService:vi.fn(),addApproval:vi.fn(),editService:vi.fn(),removeService:vi.fn(),submitBatch:vi.fn(),changeBatchStatus:vi.fn(),unmarkSubmitted:vi.fn(),refresh:vi.fn()}));
vi.mock("@/lib/auth/staffSession",()=>({requireStaffIdentity:mocks.identity}));
vi.mock("@/lib/data",()=>mocks);
vi.mock("next/cache",()=>({revalidatePath:mocks.refresh}));
import {saveDayHours,saveApproval,submitClaim,updateClaimStatus,deleteDayHours,undoSubmitted} from "./actions";
beforeEach(()=>vi.clearAllMocks());
describe("server action authentication",()=>{
 it("rejects every mutation without calling data operations when signed out",async()=>{
   mocks.identity.mockRejectedValue(new StaffAccessError());
   const attempts=[()=>saveDayHours({clientId:"c",date:"2026-11-06",hours:2,requestId:"test"}),()=>saveApproval({clientId:"c",monthlyHours:100,effectiveFrom:"2026-11-01"}),()=>submitClaim({visits:[{id:"v",hours:2,version:1}],reference:"test",requestId:"test",confirmed:true,submittedOn:"2026-11-07"}),()=>updateClaimStatus({id:"b",status:"paid",note:"test"}),()=>deleteDayHours({id:"v",expectedHours:2,expectedVersion:1}),()=>undoSubmitted([{id:"v",version:1}])];
   for(const call of attempts)expect(await call()).toMatchObject({ok:false,code:"unauthorized"});
   for(const fn of [mocks.addService,mocks.addApproval,mocks.editService,mocks.removeService,mocks.submitBatch,mocks.changeBatchStatus,mocks.unmarkSubmitted,mocks.refresh])expect(fn).not.toHaveBeenCalled();
 });
 it("retains the normal mutation flow for authorized staff",async()=>{mocks.identity.mockResolvedValue({email:"staff@example.test"});mocks.addService.mockResolvedValue({ok:true});expect(await saveDayHours({clientId:"c",date:"2026-11-06",hours:2,requestId:"test"})).toMatchObject({ok:true});expect(mocks.refresh).toHaveBeenCalled();});
});
