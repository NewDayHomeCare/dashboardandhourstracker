// Runs inside the portal page. Its only job: put values from ONE claim into the boxes on the
// screen that's open, then stop. Staff move between screens and press the important buttons.
//
// Privacy rules this file follows:
// - It never reads client information from the page and never sends anything anywhere.
// - It never stores anything. The claim arrives in a message, is typed in, and is dropped.
// - It never presses Predetermine, Process claim, Submit or Cancel (see neverClick in fieldmap.js).

(() => {
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const tick = () => new Promise((r) => setTimeout(r, 40));
  const norm = (s) => (s || "").replace(/\s+/g, " ").trim().toLowerCase();

  function labelOf(el) {
    if (el.getAttribute("aria-label")) return el.getAttribute("aria-label");
    if (el.id) {
      const l = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (l) return l.textContent;
    }
    const wrap = el.closest("label");
    return wrap ? wrap.textContent : "";
  }

  const visible = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);

  function findFields(prefix) {
    const p = norm(prefix);
    return [...document.querySelectorAll("input, select, textarea")].filter((el) => visible(el) && norm(labelOf(el)).startsWith(p));
  }

  function findButton(prefix, scope = document) {
    const p = norm(prefix);
    return [...scope.querySelectorAll("button, [role=button], input[type=button]")].find(
      (b) => visible(b) && norm(b.getAttribute("aria-label") || b.textContent || b.value).startsWith(p),
    );
  }

  function safeClick(button, map) {
    const text = norm(button.getAttribute("aria-label") || button.textContent || button.value);
    if (map.neverClick.some((n) => text.startsWith(norm(n)))) throw new Error(`Refused to press "${text}". Staff press it themselves.`);
    button.click();
  }

  function highlight(el) {
    el.style.outline = "3px solid #1769e0";
    el.style.outlineOffset = "1px";
    el.dataset.ndFilled = "1";
  }

  function setValue(el, value) {
    const proto = el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    if (el instanceof HTMLSelectElement) {
      const opt = [...el.options].find((o) => norm(o.value) === norm(value) || norm(o.textContent) === norm(value));
      if (!opt) throw new Error(`"${value}" isn't one of the choices in "${labelOf(el).trim()}".`);
      value = opt.value;
    }
    Object.getOwnPropertyDescriptor(proto, "value").set.call(el, value); // works with framework-built forms
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    el.dispatchEvent(new Event("blur", { bubbles: true }));
    highlight(el);
  }

  function dayLabel(iso, template) {
    const [y, m, d] = iso.split("-").map(Number);
    return template.replace("{Month}", MONTHS[m - 1]).replace("{D}", String(d)).replace("{YYYY}", String(y));
  }

  async function fillDate(input, iso, map) {
    if (!input.readOnly && !input.disabled) {
      setValue(input, iso);
      if (input.value) return;
    }
    // The box won't take typing: drive the pop-up calendar instead.
    const row = input.closest("tr, [role=row], li, fieldset") || input.parentElement;
    const opener = findButton(map.datePicker.open, row) || findButton(map.datePicker.open);
    if (!opener) throw new Error(`No "${map.datePicker.open}" button next to the date box.`);
    safeClick(opener, map);
    await tick();

    const target = norm(dayLabel(iso, map.datePicker.dayLabel));
    const [ty, tm] = iso.split("-").map(Number);
    for (let i = 0; i < 36; i++) {
      const day = [...document.querySelectorAll("button")].find((b) => norm(b.getAttribute("aria-label")) === target);
      if (day) {
        safeClick(day, map);
        await tick();
        highlight(input);
        return;
      }
      const any = [...document.querySelectorAll("button[aria-label]")]
        .map((b) => b.getAttribute("aria-label").match(/^(\w+) \d+, (\d{4})$/))
        .find(Boolean);
      const shown = any ? Number(any[2]) * 12 + MONTHS.indexOf(any[1]) : null;
      const nav = findButton(shown === null || shown < ty * 12 + (tm - 1) ? map.datePicker.next : map.datePicker.previous);
      if (!nav) break;
      safeClick(nav, map);
      await tick();
    }
    throw new Error(`Couldn't find ${iso} in the date pop-up.`);
  }

  async function fillLine(line, index, map) {
    const at = map.lineMode === "rows" ? index : 0;
    const get = (prefix) => {
      const el = findFields(prefix)[at];
      if (!el) throw new Error(`Couldn't find the "${prefix}" box.`);
      return el;
    };
    await fillDate(get(map.line.date), line.date, map);
    if (map.line.serviceType) setValue(get(map.line.serviceType), line.serviceType || map.defaults.serviceType);
    setValue(get(map.line.hours), line.hours.toFixed(2));
    setValue(get(map.line.cost), line.cost);
  }

  /**
   * Fills whatever part of the claim belongs on the screen that's open.
   * startAt: how many lines were already added on an earlier try (so lines aren't added twice).
   */
  async function fillPage(claim, groupNumber, startAt = 0, map = globalThis.ND_FIELD_MAP) {
    const problems = [];

    // Patient lookup screen
    if (findFields(map.patient.portalId).length) {
      try {
        setValue(findFields(map.patient.portalId)[0], claim.client.portalId);
        if (groupNumber) setValue(findFields(map.patient.groupNumber)[0], groupNumber);
        else problems.push("Group number isn't set in the helper's Settings.");
      } catch (e) {
        problems.push(e.message);
      }
      return {
        stage: "patient",
        added: 0,
        problems,
        message:
          "Filled patient ID and group number. Enter the date of birth (or use the returning-patient lookup), click Search, answer the other-coverage question, then click Fill again on the Enter details screen.",
      };
    }

    // Enter details screen
    if (findFields(map.line.hours).length) {
      if (startAt >= claim.lines.length) {
        return { stage: "lines", added: 0, problems, message: `All ${claim.lines.length} services are already added. Check the list, then click Predetermine.` };
      }
      let added = 0;
      for (let i = startAt; i < claim.lines.length; i++) {
        try {
          if (map.lineMode === "rows") {
            while (findFields(map.line.hours).length < i + 1) {
              safeClick(findButton(map.addLineButton), map);
              await tick();
            }
            await fillLine(claim.lines[i], i, map);
          } else {
            await fillLine(claim.lines[i], i, map);
            const add = findButton(map.addLineButton);
            if (!add) throw new Error(`Couldn't find the "${map.addLineButton}" button.`);
            safeClick(add, map);
            await tick();
          }
          added++;
        } catch (e) {
          problems.push(`Service ${i + 1}: ${e.message}`);
          break; // stop so the next try carries on from this line
        }
      }
      const done = startAt + added;
      return {
        stage: "lines",
        added,
        problems,
        message:
          done === claim.lines.length
            ? `Added all ${claim.lines.length} services. Check them, click Predetermine, then Process claim if it's covered.`
            : `Added ${done} of ${claim.lines.length} services. Fix the problem, then click Fill again to carry on.`,
      };
    }

    return { stage: "none", added: 0, problems: ["Nothing on this screen matches the claim. Open Enter claim in the portal."], message: "" };
  }

  globalThis.ndFillPage = fillPage; // used by the automated test

  if (globalThis.chrome?.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      if (sender.id !== chrome.runtime.id || msg?.type !== "nd-fill") return;
      fillPage(msg.claim, msg.groupNumber, msg.startAt || 0)
        .then(sendResponse)
        .catch((e) => sendResponse({ stage: "error", added: 0, problems: [e.message], message: "" }));
      return true; // answer asynchronously
    });
  }
})();
