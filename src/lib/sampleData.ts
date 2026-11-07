// 40 made-up clients for development and the demo. No real people or IDs.
// Replace with the CSV import once it exists. The same data is generated every time.

import type { Approval, Client, Visit } from "./types";
import { addDays } from "./dates";

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST = ["Alex", "Morgan", "Pat", "Sam", "Jordan", "Robin", "Casey", "Lee", "Terry", "Jamie", "Chris", "Dana", "Kim", "Lou", "Max", "Noel", "Rene", "Shawn", "Toni", "Val"];
const LAST = ["Sample", "Tremblay", "Martin", "Nguyen", "Singh", "Roy", "Wong", "Campbell", "Gagnon", "Patel", "Anderson", "Chen", "Kowalski", "Bouchard", "Morrison", "Olsen", "Reid", "Kaur", "Fraser", "Hughes"];
const HOURS = [2, 2, 2.5, 3, 3, 4, 5.25];

const START = "2026-10-01";
const TODAY = "2026-11-07";

export function makeSampleData() {
  const rand = rng(2026);
  const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)];

  const clients: Client[] = [];
  const approvals: Approval[] = [];
  const visits: Visit[] = [];

  for (let i = 0; i < 40; i++) {
    const id = `c${String(i + 1).padStart(2, "0")}`;
    clients.push({
      id,
      firstName: FIRST[i % FIRST.length],
      lastName: LAST[(i * 7 + Math.floor(i / 20) * 3) % LAST.length],
      portalId: `SAMPLE-${String(1001 + i)}`,
    });

    // Most clients: care 3-7 days a week. A few are set up to show each status.
    const daysPerWeek = 3 + Math.floor(rand() * 5);
    const careDays = new Set<number>();
    while (careDays.size < daysPerWeek) careDays.add(Math.floor(rand() * 7));
    const usualHours = pick(HOURS);

    let monthly = Math.round((usualHours * daysPerWeek * 31) / 7 / 5) * 5 + 10;
    if (i === 3 || i === 17) monthly = Math.round(usualHours * daysPerWeek * 0.6); // will go over
    if (i === 8 || i === 25 || i === 31) monthly = Math.ceil(usualHours * daysPerWeek) + 2; // running low

    approvals.push({
      id: `${id}-a1`,
      clientId: id,
      monthlyHours: monthly,
      effectiveFrom: "2026-09-01",
      recordedOn: "2026-09-01",
      note: "Initial AHS assessment",
    });

    // Client 1 (Alex Sample): reassessed, increase backdated to Nov 1 and entered today.
    if (i === 0) {
      approvals.push({
        id: `${id}-a2`,
        clientId: id,
        monthlyHours: monthly + 20,
        effectiveFrom: "2026-11-01",
        recordedOn: TODAY,
        note: "Reassessment: increase backdated to Nov 1",
      });
    }

    for (let d = 0; ; d++) {
      const date = addDays(START, d);
      if (date > TODAY) break;
      const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
      if (!careDays.has(weekday)) continue;
      const hours = rand() < 0.15 ? pick(HOURS) : usualHours;
      visits.push({
        id: `${id}-${date}`,
        clientId: id,
        date,
        hours,
        // October is billed already, except a few clients who are behind.
        submitted: date < "2026-11-01" && !(i === 11 && date < "2026-10-15"),
      });
    }
  }

  // Client 12 has September days never billed: shows the 60-day warnings.
  for (const date of ["2026-09-12", "2026-09-20"]) {
    visits.push({ id: `c12-${date}`, clientId: "c12", date, hours: 3, submitted: false });
  }

  return { clients, approvals, visits };
}
