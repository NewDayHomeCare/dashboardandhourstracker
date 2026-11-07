import { afterEach, describe, expect, it, vi } from "vitest";
import { demoDateFromEnvironment } from "./clockConfig";
import { today } from "./dates";
import { settings } from "./settings";
import { monthSummary, oldestUnsubmitted, unbilledQueue } from "./engine";
import type { Visit } from "./types";
const original=settings.demoToday;
afterEach(()=>{settings.demoToday=original;vi.useRealTimers();});
describe("clock and cross-month deadline fixes",()=>{
  it("uses a live clock unless a valid fixed demo date was chosen",()=>{
    expect(demoDateFromEnvironment(undefined)).toBeNull();expect(demoDateFromEnvironment("")).toBeNull();expect(demoDateFromEnvironment("2026-11-07")).toBe("2026-11-07");
    for(const date of ["2026-02-30","yesterday","2026-13-01"])expect(()=>demoDateFromEnvironment(date)).toThrow();
    vi.useFakeTimers();settings.demoToday=null;vi.setSystemTime(new Date("2026-11-08T12:00:00Z"));expect(today()).toBe("2026-11-08");vi.setSystemTime(new Date("2026-11-09T12:00:00Z"));expect(today()).toBe("2026-11-09");settings.demoToday="2026-11-07";expect(today()).toBe("2026-11-07");
  });
  it("keeps old urgent and expired services visible while monthly balances stay separate",()=>{
    const visits:Visit[]=[{id:"old",clientId:"c",date:"2026-09-12",hours:2,submitted:false},{id:"expired",clientId:"c",date:"2026-09-01",hours:3,submitted:false},{id:"current",clientId:"c",date:"2026-11-06",hours:4,submitted:false},{id:"billed",clientId:"c",date:"2026-08-01",hours:1,submitted:true}];
    const queue=unbilledQueue(visits,"2026-11-07");expect(queue.map(q=>[q.visit.id,q.status])).toEqual([["expired","expired"],["old","urgent"],["current","ok"]]);expect(oldestUnsubmitted(visits,"c")?.id).toBe("expired");
    expect(monthSummary([{id:"a",clientId:"c",monthlyHours:100,effectiveFrom:"2026-01-01",recordedOn:"2026-01-01"}],visits,"c","2026-11")).toMatchObject({usedHours:4,leftHours:96});
  });
});
