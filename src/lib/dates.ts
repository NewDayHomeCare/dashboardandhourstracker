import type { ISODate, YearMonth } from "./types";
import { settings } from "./settings";

// All date maths uses UTC so results never shift with the viewer's time zone.

const DAY_MS = 86_400_000;

export function toUTC(date: ISODate): number {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function fromUTC(ms: number): ISODate {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(date: ISODate, days: number): ISODate {
  return fromUTC(toUTC(date) + days * DAY_MS);
}

export function daysBetween(from: ISODate, to: ISODate): number {
  return Math.round((toUTC(to) - toUTC(from)) / DAY_MS);
}

export function monthOf(date: ISODate): YearMonth {
  return date.slice(0, 7);
}

export function daysInMonth(month: YearMonth): number {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function firstOfMonth(month: YearMonth): ISODate {
  return `${month}-01`;
}

export function lastOfMonth(month: YearMonth): ISODate {
  return `${month}-${String(daysInMonth(month)).padStart(2, "0")}`;
}

export function today(): ISODate {
  return settings.demoToday ?? fromUTC(Date.now());
}

export function formatDate(date: ISODate): string {
  return new Date(toUTC(date)).toLocaleDateString("en-CA", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatMonth(month: YearMonth): string {
  return new Date(toUTC(firstOfMonth(month))).toLocaleDateString("en-CA", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  });
}
