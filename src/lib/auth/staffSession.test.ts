import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("react", () => ({ cache: (fn: unknown) => fn }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
import { getStaffIdentity, requireStaffIdentity } from "./staffSession";

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("AUTH_URL", "http://localhost:3000");
  vi.stubEnv("AUTH_SECRET", "unit-test-secret-not-used-in-production-123456789");
  vi.stubEnv("AUTH_GOOGLE_ID", "test-client");
  vi.stubEnv("AUTH_GOOGLE_SECRET", "test-secret");
  vi.stubEnv("AUTH_ALLOWED_EMAILS", "staff@example.test");
  mocks.auth.mockResolvedValue({
    user: { email: "staff@example.test", name: "Staff", googleVerified: true },
    expires: new Date(Date.now() + 60_000).toISOString(),
  });
});
afterEach(() => vi.unstubAllEnvs());

describe("staff sessions", () => {
  it("returns only the approved staff identity", async () => {
    expect(await getStaffIdentity()).toMatchObject({ email: "staff@example.test" });
  });
  it("denies an existing session after its email is removed", async () => {
    vi.stubEnv("AUTH_ALLOWED_EMAILS", "another@example.test");
    expect(await getStaffIdentity()).toBeNull();
    await expect(requireStaffIdentity()).rejects.toThrow("Please sign in");
  });
  it("denies unverified, expired, malformed, and missing sessions", async () => {
    for (const session of [
      null,
      { user: { email: "staff@example.test", googleVerified: false }, expires: new Date(Date.now() + 60_000).toISOString() },
      { user: { email: "staff@example.test", googleVerified: true }, expires: new Date(Date.now() - 60_000).toISOString() },
      { user: { email: "staff@example.test", googleVerified: true }, expires: "invalid" },
    ]) {
      mocks.auth.mockResolvedValue(session);
      expect(await getStaffIdentity()).toBeNull();
    }
  });
  it("does not read sessions when Google setup is incomplete", async () => {
    vi.stubEnv("AUTH_GOOGLE_ID", "");
    expect(await getStaffIdentity()).toBeNull();
    expect(mocks.auth).not.toHaveBeenCalled();
  });
});
