// Where each value goes on the portal screens, found by each field's visible label.
// Set up for the mock portal, which follows the steps in Alberta Blue Cross's public
// Hospital Providers User Guide. When you see the real screens, change ONLY this file.
// A label matches if the field's label (or aria-label) STARTS WITH this text, ignoring case.

globalThis.ND_FIELD_MAP = {
  // Patient lookup screen. Date of birth is deliberately left out: staff enter it or use the
  // portal's returning-patient lookup, so the helper never holds a client's date of birth.
  patient: {
    portalId: "Patient ID number",
    groupNumber: "Group number",
  },

  // Enter details screen.
  line: {
    date: "Date of service",
    serviceType: "Service type",
    hours: "Hours",
    cost: "Total cost",
  },
  // "entry-form": one set of boxes; fill it, press addLineButton, repeat (as in the guide).
  // "rows": every line has its own row of boxes on screen.
  lineMode: "entry-form",
  addLineButton: "Add claim",

  datePicker: {
    // Used only when the date box won't accept typing.
    open: "Choose date",
    next: "Next month",
    previous: "Previous month",
    // How the pop-up labels each day button. {Month} {D} {YYYY} are filled in.
    dayLabel: "{Month} {D}, {YYYY}",
  },

  // Used when a claim line doesn't say. TO CONFIRM with Scott which service types he bills.
  defaults: { serviceType: "Personal care" },

  // Buttons the helper must never press. Staff press these themselves.
  neverClick: ["Predetermine", "Process claim", "Submit", "Cancel"],
};
