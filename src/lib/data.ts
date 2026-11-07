// Single place screens get data from. For now it is sample data held in memory.
// TODO (Person D): swap in the CSV import / a database here. Screens should not need to change.

import { makeSampleData } from "./sampleData";

const data = makeSampleData();

export function getClients() {
  return data.clients;
}

export function getClient(id: string) {
  return data.clients.find((c) => c.id === id);
}

export function getApprovals() {
  return data.approvals;
}

export function getVisits() {
  return data.visits;
}
