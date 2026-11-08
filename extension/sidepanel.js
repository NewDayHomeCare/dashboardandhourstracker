// Side panel logic.
//
// Where data lives:
// - The current claim: chrome.storage.session (memory only, never on disk, gone when Chrome
//   closes) and cleared after "Mark submitted", "Clear claim" or 15 minutes, whichever is first.
// - Group number and the submitted log: chrome.storage.local. Neither contains client names.
// - Nothing is ever sent over the network. The extension has no permission to do so.

const CLEAR_AFTER_MS = 15 * 60 * 1000;
const $ = (id) => document.getElementById(id);
let current = null; // { claim, loadedAt }

function say(text, ok = true) {
  const m = $("message");
  m.textContent = text;
  m.className = `msg ${ok ? "good" : "bad"}`;
  m.hidden = !text;
}

function render() {
  $("claimSection").hidden = !current;
  $("loadSection").hidden = !!current;
  if (!current) return;
  const { claim } = current;
  const hours = claim.lines.reduce((s, l) => s + Math.round(l.hours * 100), 0) / 100;
  const cost = claim.lines.reduce((s, l) => s + Math.round(Number(l.cost) * 100), 0) / 100;
  const rows = [
    ["Client", `${claim.client.lastName}, ${claim.client.firstName}`],
    ["ID", claim.client.portalId],
    ["Claim", claim.label || claim.claimKey],
    ["Lines", String(claim.lines.length)],
    ["Hours", hours.toFixed(2)],
    ["Cost", `$${cost.toFixed(2)}`],
  ];
  $("summary").replaceChildren(
    ...rows.flatMap(([k, v]) => {
      const dt = document.createElement("dt");
      dt.textContent = k;
      const dd = document.createElement("dd");
      dd.textContent = v;
      return [dt, dd];
    }),
  );
  $("progress").textContent = `Services added in the portal: ${current.added || 0} of ${claim.lines.length}`;
  updateExpiry();
}

function updateExpiry() {
  if (!current) return;
  const left = CLEAR_AFTER_MS - (Date.now() - current.loadedAt);
  if (left <= 0) {
    clearClaim("Claim cleared automatically after 15 minutes.");
    return;
  }
  $("expiry").textContent = `Clears automatically in ${Math.ceil(left / 60000)} min.`;
}

async function clearClaim(message) {
  current = null;
  await chrome.storage.session.remove("claim");
  render();
  if (message) say(message);
}

async function renderLog() {
  const { log = [] } = await chrome.storage.local.get("log");
  $("log").replaceChildren(
    ...log.slice(-10).reverse().map((e) => {
      const li = document.createElement("li");
      li.textContent = `${e.claimKey} · ${e.lines} lines · ${new Date(e.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
      return li;
    }),
  );
}

$("load").addEventListener("click", async () => {
  try {
    const claim = ndParseClaim($("paste").value);
    current = { claim, loadedAt: Date.now(), added: 0 };
    await chrome.storage.session.set({ claim: current });
    $("paste").value = "";
    navigator.clipboard?.writeText("").catch(() => {}); // don't leave client details on the clipboard
    say("Claim loaded. Open Enter claim in the portal, then click Fill this screen.");
    render();
  } catch (e) {
    say(e.message, false);
  }
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const NOT_PORTAL = "This page isn't the billing portal, or it needs a reload. Open the portal's Enter claim page and try again.";
// For automated tests only: sidepanel.html?tab=<id> targets that tab instead of the active one.
const testTab = Number(new URLSearchParams(location.search).get("tab")) || null;

/**
 * Adds the remaining lines one at a time. The portal reloads the page after each "Add claim",
 * which stops any code inside the page, so the panel (which stays open) drives each step:
 * fill one line and press Add claim, wait for the page to come back, check the form is empty.
 */
async function addLines(tabId) {
  const n = current.claim.lines.length;
  for (let i = current.added || 0; i < n; i++) {
    if (!current) return; // cleared while running
    say(`Adding service ${i + 1} of ${n}…`);
    const line = current.claim.lines[i];

    let started;
    try {
      started = await chrome.tabs.sendMessage(tabId, { type: "nd-fill-line", claim: current.claim, index: i });
    } catch {
      started = { ok: false, error: "The page stopped answering while filling." };
    }
    if (!started?.ok) {
      say(`Service ${i + 1}: ${started?.error || "couldn't fill it"} Fix it, then click Fill again to carry on.`, false);
      return;
    }

    // Wait up to 30 s for the page to reload (or update) and show an empty form.
    const deadline = Date.now() + 30_000;
    let outcome = "timeout";
    await sleep(600);
    while (Date.now() < deadline) {
      let s = null;
      try {
        s = await chrome.tabs.sendMessage(tabId, { type: "nd-status", expect: { date: line.date, hours: line.hours } });
      } catch {
        // Page is reloading; ask again shortly.
      }
      if (s?.stage === "lines" && s.cleared) { outcome = "added"; break; }
      if (s?.stage === "lines" && s.pageId !== started.pageId && s.stillFilled) { outcome = "rejected"; break; }
      if (s && s.stage !== "lines" && s.pageId !== started.pageId) { outcome = "moved"; break; }
      await sleep(400);
    }

    if (outcome !== "added") {
      const why = {
        rejected: "the portal reloaded but kept the values, so it probably didn't accept them. Check the portal for a message.",
        moved: "the portal went to a different screen after Add claim. Check what it shows.",
        timeout: "the portal didn't come back with an empty form. Check the portal for a message.",
      }[outcome];
      say(`Service ${i + 1}: ${why} Then click Fill again to carry on from this line.`, false);
      return;
    }
    current.added = i + 1;
    await chrome.storage.session.set({ claim: current });
    render();
    await sleep(300);
  }
  say(`Added all ${n} services. Check them, click Predetermine, then Process claim if it's covered.`);
}

$("fill").addEventListener("click", async () => {
  if (!current) return;
  const { groupNumber = "" } = await chrome.storage.local.get("groupNumber");
  const tabId = testTab ?? (await chrome.tabs.query({ active: true, currentWindow: true }))[0]?.id;
  $("fill").disabled = true;
  try {
    let detected;
    try {
      detected = await chrome.tabs.sendMessage(tabId, { type: "nd-detect" });
    } catch {
      return say(NOT_PORTAL, false);
    }

    if (detected.stage === "lines") {
      if ((current.added || 0) >= current.claim.lines.length) {
        return say(`All ${current.claim.lines.length} services are already added. Check the list, then click Predetermine.`);
      }
      return await addLines(tabId);
    }

    if (detected.stage === "patient") {
      const res = await chrome.tabs.sendMessage(tabId, { type: "nd-fill", claim: current.claim, groupNumber, startAt: current.added || 0 });
      return say([res.message, ...res.problems].filter(Boolean).join(" "), res.problems.length === 0);
    }

    say("Nothing on this screen matches the claim. Open the patient search or Enter claim screen in the portal.", false);
  } catch {
    say(NOT_PORTAL, false);
  } finally {
    $("fill").disabled = false;
  }
});

$("done").addEventListener("click", async () => {
  if (!current) return;
  const { log = [] } = await chrome.storage.local.get("log");
  log.push({ claimKey: current.claim.claimKey, lines: current.claim.lines.length, at: Date.now() });
  await chrome.storage.local.set({ log: log.slice(-200) });
  await clearClaim("Cleared from the helper. Now click Mark submitted on this claim in the dashboard's Billing page, so the dashboard counts these days as billed.");
  renderLog();
});

$("clear").addEventListener("click", () => clearClaim("Claim cleared."));

$("saveGroup").addEventListener("click", async () => {
  await chrome.storage.local.set({ groupNumber: $("group").value.trim() });
  say("Group number saved.");
});

(async () => {
  const { claim } = await chrome.storage.session.get("claim");
  current = claim || null;
  const { groupNumber = "" } = await chrome.storage.local.get("groupNumber");
  $("group").value = groupNumber;
  render();
  renderLog();
  setInterval(updateExpiry, 30_000);
})();