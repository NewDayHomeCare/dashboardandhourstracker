import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";
import { buildClaims } from "./engine";
import { helperClaimPacket } from "./claimPacket";
import type { Client, Visit } from "./types";

const client: Client = {id:"c01",firstName:"Demo",lastName:"Client",portalId:"SAMPLE-1001"};
function parseWithExtension(packet: string) {
  const context = {} as {ndParseClaim?: (text:string)=>{client:object;lines:{date:string;hours:number;cost:string}[]}};
  runInNewContext(readFileSync(resolve("extension/claim.js"), "utf8"), context);
  return context.ndParseClaim!(packet);
}
describe("dashboard and Chrome helper contract",()=>{
  it("round trips grouped services through the extension's actual parser",()=>{
    const visits: Visit[] = [
      {id:"one",clientId:"c01",date:"2026-11-06",hours:2.5,submitted:false,note:"PRIVATE-NOTE"},
      {id:"two",clientId:"c01",date:"2026-11-06",hours:3,submitted:false},
      {id:"old",clientId:"c01",date:"2026-11-05",hours:1,submitted:true},
    ];
    const claim=buildClaims(visits,"c01","2026-11-01")[0];
    const packet=helperClaimPacket(client,claim);
    const parsed=parseWithExtension(packet);
    expect(parsed.client).toEqual({firstName:"Demo",lastName:"Client",portalId:"SAMPLE-1001"});
    expect(parsed.lines).toEqual([{date:"2026-11-06",hours:5.5,cost:"192.67"}]);
    expect(packet).not.toContain("PRIVATE-NOTE");
    expect(packet).not.toContain("visitIds");
    expect(JSON.parse(packet)).toMatchObject({type:"newday-claim",version:1,claimKey:"c01|2026-11-01|1"});
  });
  it("keeps the helper's maximum line count when a billing period is split",()=>{
    const visits:Visit[]=Array.from({length:14},(_,i)=>({id:`day-${i}`,clientId:"c01",date:`2026-11-${String(i+1).padStart(2,"0")}`,hours:2,submitted:false}));
    for(const claim of buildClaims(visits,"c01","2026-11-01")){
      expect(parseWithExtension(helperClaimPacket(client,claim)).lines.length).toBeLessThanOrEqual(10);
    }
  });
});
