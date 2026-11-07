import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";
import { buildClaims } from "./engine";
import { helperClaimPacket, helperClaimsPacket } from "./claimPacket";
import type { Client, Visit } from "./types";

const client: Client = {id:"c01",firstName:"Demo",lastName:"Client",portalId:"SAMPLE-1001"};
function parseWithExtension(packet: string) {
  return extension().ndParseClaim(packet);
}
type Parsed = {claimKey:string;label:string;client:object;lines:{date:string;hours:number;cost:string}[]};
function extension() {
  const context = {} as {ndParseClaim:(text:string)=>Parsed;ndParseClaims:(text:string)=>Parsed[]};
  runInNewContext(readFileSync(resolve("extension/claim.js"), "utf8"), context);
  return context;
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
    expect(JSON.parse(packet)).toMatchObject({type:"newday-claim",version:1,claimKey:"c01|2026-11-06..2026-11-06"});
  });
  it("keeps the helper's maximum line count when a billing period is split",()=>{
    const visits:Visit[]=Array.from({length:14},(_,i)=>({id:`day-${i}`,clientId:"c01",date:`2026-11-${String(i+1).padStart(2,"0")}`,hours:2,submitted:false}));
    for(const claim of buildClaims(visits,"c01","2026-11-01")){
      expect(parseWithExtension(helperClaimPacket(client,claim)).lines.length).toBeLessThanOrEqual(10);
    }
  });
  const daily=(submitted:(i:number)=>boolean=()=>false):Visit[]=>Array.from({length:14},(_,i)=>({id:`day-${i}`,clientId:"c01",date:`2026-11-${String(i+1).padStart(2,"0")}`,hours:2,submitted:submitted(i)}));
  it("copies two weeks of daily care as 7 + 7 claims the helper fills one after another",()=>{
    const claims=buildClaims(daily(),"c01","2026-11-01");
    const parsed=extension().ndParseClaims(helperClaimsPacket(client,claims));
    expect(parsed.map(c=>c.lines.length)).toEqual([7,7]);
    expect(parsed.map(c=>c.claimKey)).toEqual(["c01|2026-11-01..2026-11-07","c01|2026-11-08..2026-11-14"]);
    expect(parsed[1].lines[0]).toEqual({date:"2026-11-08",hours:2,cost:"70.06"});
    expect(extension().ndParseClaims(helperClaimPacket(client,claims[0]))).toHaveLength(1);
  });
  it("keeps a claim's reference after the claim before it is submitted",()=>{
    const second=buildClaims(daily(),"c01","2026-11-01")[1];
    const after=buildClaims(daily(i=>i<7),"c01","2026-11-01");
    expect(after).toHaveLength(1);
    expect(JSON.parse(helperClaimPacket(client,after[0])).claimKey).toBe(JSON.parse(helperClaimPacket(client,second)).claimKey);
  });
  it("rejects a multi-claim packet that mixes clients or repeats a claim",()=>{
    const claims=buildClaims(daily(),"c01","2026-11-01");
    const packet=JSON.parse(helperClaimsPacket(client,claims));
    packet.claims[1].client.portalId="SAMPLE-2002";
    expect(()=>extension().ndParseClaims(JSON.stringify(packet))).toThrow(/one client/);
    packet.claims[1]=packet.claims[0];
    expect(()=>extension().ndParseClaims(JSON.stringify(packet))).toThrow(/twice/);
    expect(()=>extension().ndParseClaim(helperClaimsPacket(client,claims))).toThrow(/single claim/);
  });
});
