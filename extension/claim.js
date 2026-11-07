// Checks a pasted claim and keeps ONLY the fields the portal needs (data minimisation).
// Anything else in the pasted text (notes, addresses, diagnoses...) is thrown away.

globalThis.ndParseClaim = function ndParseClaim(text) {
  let raw;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("That doesn't look like a claim from the dashboard. Copy it again with \"Copy for helper\".");
  }
  const fail = (why) => { throw new Error(`Claim rejected: ${why}.`); };
  const str = (v, max, re) => typeof v === "string" && v.trim().length > 0 && v.length <= max && (!re || re.test(v));

  if (raw?.type !== "newday-claim" || raw?.version !== 1) fail("not a New Day claim (version 1)");
  if (!str(raw.claimKey, 80, /^[\w|:.-]+$/)) fail("missing claim reference");
  const c = raw.client || {};
  if (!str(c.lastName, 100) || !str(c.firstName, 100)) fail("client name missing");
  if (!str(c.portalId, 50, /^[A-Za-z0-9-]+$/)) fail("client ID missing or has odd characters");
  if (!Array.isArray(raw.lines) || raw.lines.length < 1 || raw.lines.length > 10) fail("a claim needs 1 to 10 lines");

  const lines = raw.lines.map((l, i) => {
    if (!str(l?.date, 10, /^\d{4}-\d{2}-\d{2}$/)) fail(`line ${i + 1} has no valid date`);
    const twoDecimals = typeof l.hours === "number" && Math.abs(l.hours * 100 - Math.round(l.hours * 100)) < 1e-6;
    if (!twoDecimals || !(l.hours > 0 && l.hours <= 24)) fail(`line ${i + 1} hours must be 0.01 to 24`);
    if (!str(l.cost, 12, /^\d+\.\d{2}$/)) fail(`line ${i + 1} cost must look like 70.06`);
    if (l.serviceType !== undefined && !str(l.serviceType, 40)) fail(`line ${i + 1} service type is invalid`);
    return { date: l.date, hours: l.hours, cost: l.cost, ...(l.serviceType ? { serviceType: l.serviceType } : {}) };
  });

  return {
    claimKey: raw.claimKey,
    label: str(raw.label, 60) ? raw.label : "",
    client: { lastName: c.lastName.trim(), firstName: c.firstName.trim(), portalId: c.portalId.trim() },
    lines,
  };
};
