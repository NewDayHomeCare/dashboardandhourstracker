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

$("fill").addEventListener("click", async () => {
  if (!current) return;
  const { groupNumber = "" } = await chrome.storage.local.get("groupNumber");
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  $("fill").disabled = true;
  try {
    const res = await chrome.tabs.sendMessage(tab.id, { type: "nd-fill", claim: current.claim, groupNumber, startAt: current.added || 0 });
    if (res.added) {
      current.added = (current.added || 0) + res.added;
      await chrome.storage.session.set({ claim: current });
      render();
    }
    say([res.message, ...res.problems].filter(Boolean).join(" "), res.problems.length === 0);
  } catch {
    say("This page isn't the billing portal, or it needs a reload. Open the portal's new-claim page and try again.", false);
  } finally {
    $("fill").disabled = false;
  }
});

$("done").addEventListener("click", async () => {
  if (!current) return;
  const { log = [] } = await chrome.storage.local.get("log");
  log.push({ claimKey: current.claim.claimKey, lines: current.claim.lines.length, at: Date.now() });
  await chrome.storage.local.set({ log: log.slice(-200) });
  await clearClaim("Marked submitted. Claim details cleared from the helper.");
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
