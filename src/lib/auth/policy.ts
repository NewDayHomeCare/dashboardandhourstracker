/** Pure policy helpers; no credentials or tokens are returned to the browser. */
export function staffEmails(value = process.env.AUTH_ALLOWED_EMAILS): string[] {
  return [...new Set((value ?? "").split(/[\s,;]+/).map(v=>v.trim().toLowerCase()).filter(v=>/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)))];
}
export function allowedEmail(email: unknown, allowlist = staffEmails()): email is string {
  return typeof email === "string" && allowlist.includes(email.trim().toLowerCase());
}
export function approvedGoogleProfile(provider: unknown, profile: { email?: unknown; email_verified?: unknown } | undefined, allowlist = staffEmails()): boolean {
  return provider === "google" && profile?.email_verified === true && allowedEmail(profile.email,allowlist);
}
export function authOrigin(value = process.env.AUTH_URL): string {
  const origin = new URL(value || "http://localhost:3000");
  if(origin.username || origin.password || origin.pathname!=="/" || origin.search || origin.hash)throw new Error("AUTH_URL must contain only the app origin.");
  const local = origin.hostname === "localhost" || origin.hostname === "127.0.0.1";
  if(origin.protocol!=="https:" && !(local && origin.protocol==="http:"))throw new Error("AUTH_URL requires HTTPS outside localhost.");
  return origin.origin;
}
export function authIsConfigured(): boolean {
  try { authOrigin(); } catch { return false; }
  return Boolean(process.env.AUTH_GOOGLE_ID?.trim() && process.env.AUTH_GOOGLE_SECRET?.trim() && (process.env.AUTH_SECRET?.length ?? 0)>=32 && staffEmails().length);
}
export class StaffAccessError extends Error {
  constructor(){super("Please sign in with an approved staff Google account.");this.name="StaffAccessError";}
}
