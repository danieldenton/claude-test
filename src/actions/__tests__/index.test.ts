// @vitest-environment node
import { test, expect, vi, beforeEach, describe } from "vitest";

const mockCreateSession = vi.fn();
const mockDeleteSession = vi.fn();
const mockGetSession = vi.fn();
const mockRevalidatePath = vi.fn();
const mockRedirect = vi.fn();
const mockFindUnique = vi.fn();
const mockCreate = vi.fn();

vi.mock("server-only", () => ({}));

vi.mock("@/lib/auth", () => ({
  createSession: mockCreateSession,
  deleteSession: mockDeleteSession,
  getSession: mockGetSession,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: mockFindUnique,
      create: mockCreate,
    },
  },
}));

vi.mock("next/cache", () => ({ revalidatePath: mockRevalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mockRedirect }));

vi.mock("bcrypt", () => ({
  default: {
    hash: vi.fn(async (pwd: string) => `hashed:${pwd}`),
    compare: vi.fn(async (pwd: string, hash: string) => hash === `hashed:${pwd}`),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── signUp ──────────────────────────────────────────────────────────────────

describe("signUp", () => {
  test("returns error when email is missing", async () => {
    const { signUp } = await import("@/actions");
    const result = await signUp("", "password123");
    expect(result).toEqual({ success: false, error: "Email and password are required" });
  });

  test("returns error when password is missing", async () => {
    const { signUp } = await import("@/actions");
    const result = await signUp("user@example.com", "");
    expect(result).toEqual({ success: false, error: "Email and password are required" });
  });

  test("returns error when password is too short", async () => {
    const { signUp } = await import("@/actions");
    const result = await signUp("user@example.com", "short");
    expect(result).toEqual({ success: false, error: "Password must be at least 8 characters" });
  });

  test("returns error when email is already registered", async () => {
    mockFindUnique.mockResolvedValue({ id: "existing", email: "user@example.com" });
    const { signUp } = await import("@/actions");

    const result = await signUp("user@example.com", "password123");

    expect(result).toEqual({ success: false, error: "Email already registered" });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  test("creates user, starts session, and returns success", async () => {
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockResolvedValue({ id: "new-user", email: "new@example.com" });

    const { signUp } = await import("@/actions");
    const result = await signUp("new@example.com", "password123");

    expect(mockCreate).toHaveBeenCalledOnce();
    expect(mockCreate.mock.calls[0][0].data.email).toBe("new@example.com");
    expect(mockCreateSession).toHaveBeenCalledWith("new-user", "new@example.com");
    expect(result).toEqual({ success: true });
  });

  test("hashes the password before storing", async () => {
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockResolvedValue({ id: "u1", email: "u@example.com" });

    const { signUp } = await import("@/actions");
    await signUp("u@example.com", "mypassword");

    const storedPassword = mockCreate.mock.calls[0][0].data.password;
    expect(storedPassword).not.toBe("mypassword");
    expect(storedPassword).toBe("hashed:mypassword");
  });

  test("returns error when prisma throws", async () => {
    mockFindUnique.mockRejectedValue(new Error("DB error"));
    const { signUp } = await import("@/actions");

    const result = await signUp("user@example.com", "password123");

    expect(result).toEqual({ success: false, error: "An error occurred during sign up" });
  });
});

// ─── signIn ──────────────────────────────────────────────────────────────────

describe("signIn", () => {
  test("returns error when email is missing", async () => {
    const { signIn } = await import("@/actions");
    const result = await signIn("", "password123");
    expect(result).toEqual({ success: false, error: "Email and password are required" });
  });

  test("returns error when password is missing", async () => {
    const { signIn } = await import("@/actions");
    const result = await signIn("user@example.com", "");
    expect(result).toEqual({ success: false, error: "Email and password are required" });
  });

  test("returns error when user is not found", async () => {
    mockFindUnique.mockResolvedValue(null);
    const { signIn } = await import("@/actions");

    const result = await signIn("nobody@example.com", "password123");

    expect(result).toEqual({ success: false, error: "Invalid credentials" });
  });

  test("returns error when password does not match", async () => {
    mockFindUnique.mockResolvedValue({
      id: "u1",
      email: "user@example.com",
      password: "hashed:correctpassword",
    });
    const { signIn } = await import("@/actions");

    const result = await signIn("user@example.com", "wrongpassword");

    expect(result).toEqual({ success: false, error: "Invalid credentials" });
    expect(mockCreateSession).not.toHaveBeenCalled();
  });

  test("creates session and returns success with correct credentials", async () => {
    mockFindUnique.mockResolvedValue({
      id: "u1",
      email: "user@example.com",
      password: "hashed:correctpassword",
    });
    const { signIn } = await import("@/actions");

    const result = await signIn("user@example.com", "correctpassword");

    expect(mockCreateSession).toHaveBeenCalledWith("u1", "user@example.com");
    expect(result).toEqual({ success: true });
  });

  test("returns error when prisma throws", async () => {
    mockFindUnique.mockRejectedValue(new Error("DB error"));
    const { signIn } = await import("@/actions");

    const result = await signIn("user@example.com", "password123");

    expect(result).toEqual({ success: false, error: "An error occurred during sign in" });
  });
});

// ─── signOut ─────────────────────────────────────────────────────────────────

describe("signOut", () => {
  test("deletes session and redirects to root", async () => {
    const { signOut } = await import("@/actions");
    await signOut();

    expect(mockDeleteSession).toHaveBeenCalledOnce();
    expect(mockRedirect).toHaveBeenCalledWith("/");
  });

  test("revalidates the root path", async () => {
    const { signOut } = await import("@/actions");
    await signOut();

    expect(mockRevalidatePath).toHaveBeenCalledWith("/");
  });
});

// ─── getUser ──────────────────────────────────────────────────────────────────

describe("getUser", () => {
  test("returns null when there is no session", async () => {
    mockGetSession.mockResolvedValue(null);
    const { getUser } = await import("@/actions");

    const result = await getUser();

    expect(result).toBeNull();
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  test("returns the user for an active session", async () => {
    mockGetSession.mockResolvedValue({ userId: "u1", email: "user@example.com" });
    const dbUser = { id: "u1", email: "user@example.com", createdAt: new Date() };
    mockFindUnique.mockResolvedValue(dbUser);

    const { getUser } = await import("@/actions");
    const result = await getUser();

    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { id: "u1" },
      select: { id: true, email: true, createdAt: true },
    });
    expect(result).toEqual(dbUser);
  });

  test("returns null when user is not found in the database", async () => {
    mockGetSession.mockResolvedValue({ userId: "ghost", email: "ghost@example.com" });
    mockFindUnique.mockResolvedValue(null);

    const { getUser } = await import("@/actions");
    const result = await getUser();

    expect(result).toBeNull();
  });

  test("returns null when prisma throws", async () => {
    mockGetSession.mockResolvedValue({ userId: "u1", email: "user@example.com" });
    mockFindUnique.mockRejectedValue(new Error("DB error"));

    const { getUser } = await import("@/actions");
    const result = await getUser();

    expect(result).toBeNull();
  });
});
