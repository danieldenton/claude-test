// @vitest-environment node
import { test, expect, vi, beforeEach } from "vitest";
import { SignJWT, jwtVerify } from "jose";
import { NextRequest } from "next/server";

const mockCookieSet = vi.fn();
const mockCookieGet = vi.fn();
const mockCookieDelete = vi.fn();

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: vi.fn(() =>
    Promise.resolve({
      set: mockCookieSet,
      get: mockCookieGet,
      delete: mockCookieDelete,
    })
  ),
}));

beforeEach(() => {
  mockCookieSet.mockClear();
  mockCookieGet.mockClear();
  mockCookieDelete.mockClear();
});

const JWT_SECRET = new TextEncoder().encode("development-secret-key");

async function makeToken(payload: object, expiresInSeconds = 7 * 24 * 60 * 60) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(Math.floor(Date.now() / 1000) + expiresInSeconds)
    .setIssuedAt()
    .sign(JWT_SECRET);
}

// ─── createSession ──────────────────────────────────────────────────────────

test("createSession sets an auth-token cookie", async () => {
  const { createSession } = await import("@/lib/auth");

  await createSession("user-123", "test@example.com");

  expect(mockCookieSet).toHaveBeenCalledOnce();
  const [cookieName] = mockCookieSet.mock.calls[0];
  expect(cookieName).toBe("auth-token");
});

test("createSession sets cookie with correct options", async () => {
  const { createSession } = await import("@/lib/auth");

  await createSession("user-123", "test@example.com");

  const [, , options] = mockCookieSet.mock.calls[0];
  expect(options.httpOnly).toBe(true);
  expect(options.sameSite).toBe("lax");
  expect(options.path).toBe("/");
});

test("createSession cookie expires in ~7 days", async () => {
  const { createSession } = await import("@/lib/auth");
  const before = Date.now();

  await createSession("user-123", "test@example.com");

  const after = Date.now();
  const [, , options] = mockCookieSet.mock.calls[0];
  const expiresMs = options.expires.getTime();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  expect(expiresMs).toBeGreaterThanOrEqual(before + sevenDaysMs - 1000);
  expect(expiresMs).toBeLessThanOrEqual(after + sevenDaysMs + 1000);
});

test("createSession issues a valid JWT with correct payload", async () => {
  const { createSession } = await import("@/lib/auth");

  await createSession("user-123", "test@example.com");

  const [, token] = mockCookieSet.mock.calls[0];
  const { payload } = await jwtVerify(token, JWT_SECRET);

  expect(payload.userId).toBe("user-123");
  expect(payload.email).toBe("test@example.com");
});

test("createSession uses HS256 algorithm", async () => {
  const { createSession } = await import("@/lib/auth");

  await createSession("user-123", "test@example.com");

  const [, token] = mockCookieSet.mock.calls[0];
  const header = JSON.parse(
    Buffer.from(token.split(".")[0], "base64url").toString()
  );
  expect(header.alg).toBe("HS256");
});

// ─── getSession ─────────────────────────────────────────────────────────────

test("getSession returns null when no cookie is present", async () => {
  mockCookieGet.mockReturnValue(undefined);
  const { getSession } = await import("@/lib/auth");

  const result = await getSession();

  expect(result).toBeNull();
});

test("getSession returns the session payload from a valid token", async () => {
  const payload = {
    userId: "user-456",
    email: "hello@example.com",
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  };
  const token = await makeToken(payload);
  mockCookieGet.mockReturnValue({ value: token });

  const { getSession } = await import("@/lib/auth");
  const result = await getSession();

  expect(result?.userId).toBe("user-456");
  expect(result?.email).toBe("hello@example.com");
});

test("getSession returns null for a tampered token", async () => {
  mockCookieGet.mockReturnValue({ value: "not.a.valid.jwt" });
  const { getSession } = await import("@/lib/auth");

  const result = await getSession();

  expect(result).toBeNull();
});

test("getSession returns null for an expired token", async () => {
  const token = await makeToken(
    { userId: "user-789", email: "old@example.com" },
    -60 // expired 60 seconds ago
  );
  mockCookieGet.mockReturnValue({ value: token });

  const { getSession } = await import("@/lib/auth");
  const result = await getSession();

  expect(result).toBeNull();
});

// ─── deleteSession ───────────────────────────────────────────────────────────

test("deleteSession deletes the auth-token cookie", async () => {
  const { deleteSession } = await import("@/lib/auth");

  await deleteSession();

  expect(mockCookieDelete).toHaveBeenCalledOnce();
  expect(mockCookieDelete).toHaveBeenCalledWith("auth-token");
});

// ─── verifySession ───────────────────────────────────────────────────────────

test("verifySession returns null when request has no auth-token cookie", async () => {
  const request = new NextRequest("http://localhost/");
  const { verifySession } = await import("@/lib/auth");

  const result = await verifySession(request);

  expect(result).toBeNull();
});

test("verifySession returns the session payload for a valid token in the request", async () => {
  const payload = {
    userId: "user-req",
    email: "req@example.com",
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  };
  const token = await makeToken(payload);
  const request = new NextRequest("http://localhost/", {
    headers: { cookie: `auth-token=${token}` },
  });

  const { verifySession } = await import("@/lib/auth");
  const result = await verifySession(request);

  expect(result?.userId).toBe("user-req");
  expect(result?.email).toBe("req@example.com");
});

test("verifySession returns null for an invalid token in the request", async () => {
  const request = new NextRequest("http://localhost/", {
    headers: { cookie: "auth-token=garbage.token.value" },
  });

  const { verifySession } = await import("@/lib/auth");
  const result = await verifySession(request);

  expect(result).toBeNull();
});

test("verifySession returns null for an expired token in the request", async () => {
  const token = await makeToken(
    { userId: "user-exp", email: "exp@example.com" },
    -60 // expired 60 seconds ago
  );
  const request = new NextRequest("http://localhost/", {
    headers: { cookie: `auth-token=${token}` },
  });

  const { verifySession } = await import("@/lib/auth");
  const result = await verifySession(request);

  expect(result).toBeNull();
});
