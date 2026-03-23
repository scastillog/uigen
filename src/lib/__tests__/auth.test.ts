// @vitest-environment node
import { test, expect, vi, afterEach } from "vitest";
import { jwtVerify, SignJWT } from "jose";

vi.mock("server-only", () => ({}));

const mockCookieStore = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue(mockCookieStore),
}));

import { createSession, getSession } from "@/lib/auth";

async function makeToken(payload: object, expiresIn = "7d"): Promise<string> {
  return new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expiresIn)
    .setIssuedAt()
    .sign(JWT_SECRET);
}

const JWT_SECRET = new TextEncoder().encode("development-secret-key");

afterEach(() => {
  vi.clearAllMocks();
});

test("createSession sets an httpOnly cookie named auth-token", async () => {
  await createSession("user-1", "alice@example.com");

  expect(mockCookieStore.set).toHaveBeenCalledOnce();
  const [name, , options] = mockCookieStore.set.mock.calls[0];
  expect(name).toBe("auth-token");
  expect(options.httpOnly).toBe(true);
  expect(options.sameSite).toBe("lax");
  expect(options.path).toBe("/");
});

test("createSession stores a JWT containing userId and email", async () => {
  await createSession("user-1", "alice@example.com");

  const token = mockCookieStore.set.mock.calls[0][1] as string;
  const { payload } = await jwtVerify(token, JWT_SECRET);
  expect(payload.userId).toBe("user-1");
  expect(payload.email).toBe("alice@example.com");
});

test("createSession sets secure flag only in production", async () => {
  vi.stubEnv("NODE_ENV", "production");

  await createSession("user-1", "alice@example.com");
  const options = mockCookieStore.set.mock.calls[0][2];
  expect(options.secure).toBe(true);

  vi.unstubAllEnvs();
});

// getSession
test("getSession returns null when no cookie is present", async () => {
  mockCookieStore.get.mockReturnValue(undefined);
  const session = await getSession();
  expect(session).toBeNull();
});

test("getSession returns SessionPayload for a valid token", async () => {
  const token = await makeToken({ userId: "user-1", email: "alice@example.com", expiresAt: new Date() });
  mockCookieStore.get.mockReturnValue({ value: token });

  const session = await getSession();
  expect(session?.userId).toBe("user-1");
  expect(session?.email).toBe("alice@example.com");
});

test("getSession returns null for an expired token", async () => {
  const token = await makeToken({ userId: "user-1", email: "alice@example.com" }, "-1s");
  mockCookieStore.get.mockReturnValue({ value: token });

  const session = await getSession();
  expect(session).toBeNull();
});

test("getSession returns null for a malformed token", async () => {
  mockCookieStore.get.mockReturnValue({ value: "not.a.jwt" });

  const session = await getSession();
  expect(session).toBeNull();
});
