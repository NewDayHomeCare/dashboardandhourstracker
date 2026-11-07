/** A fixed date is opt-in for demos; normal operation uses today's UTC date. */
export function demoDateFromEnvironment(value: string | undefined): string | null {
  if (!value?.trim()) return null;
  if (!/^[1-9]\d{3}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0,10)!==value) {
    throw new Error("NEXT_PUBLIC_HOMECARE_DEMO_DATE must be a valid YYYY-MM-DD date, or left unset.");
  }
  return value;
}
