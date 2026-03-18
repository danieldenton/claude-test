// @vitest-environment jsdom
import { renderHook, act, waitFor } from "@testing-library/react";
import { test, expect, vi, beforeEach, describe } from "vitest";
import { useAuth } from "@/hooks/use-auth";

const {
  mockPush,
  mockSignIn,
  mockSignUp,
  mockGetAnonWorkData,
  mockClearAnonWork,
  mockGetProjects,
  mockCreateProject,
} = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockSignIn: vi.fn(),
  mockSignUp: vi.fn(),
  mockGetAnonWorkData: vi.fn(),
  mockClearAnonWork: vi.fn(),
  mockGetProjects: vi.fn(),
  mockCreateProject: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/actions", () => ({
  signIn: mockSignIn,
  signUp: mockSignUp,
}));

vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: mockGetAnonWorkData,
  clearAnonWork: mockClearAnonWork,
}));

vi.mock("@/actions/get-projects", () => ({
  getProjects: mockGetProjects,
}));

vi.mock("@/actions/create-project", () => ({
  createProject: mockCreateProject,
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockGetAnonWorkData.mockReturnValue(null);
});

// ─── signIn ──────────────────────────────────────────────────────────────────

describe("signIn", () => {
  test("calls signInAction with email and password", async () => {
    mockSignIn.mockResolvedValue({ success: false, error: "Invalid credentials" });

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signIn("user@example.com", "password");
    });

    expect(mockSignIn).toHaveBeenCalledWith("user@example.com", "password");
  });

  test("returns the result from signInAction", async () => {
    const authResult = { success: false, error: "Invalid credentials" };
    mockSignIn.mockResolvedValue(authResult);

    const { result } = renderHook(() => useAuth());
    let returnValue: unknown;
    await act(async () => {
      returnValue = await result.current.signIn("user@example.com", "password");
    });

    expect(returnValue).toEqual(authResult);
  });

  test("sets isLoading to true while signing in, then false after", async () => {
    let resolveSignIn!: (v: unknown) => void;
    mockSignIn.mockReturnValue(new Promise((r) => { resolveSignIn = r; }));

    const { result } = renderHook(() => useAuth());
    expect(result.current.isLoading).toBe(false);

    act(() => { result.current.signIn("user@example.com", "password"); });
    await waitFor(() => expect(result.current.isLoading).toBe(true));

    await act(async () => { resolveSignIn({ success: false }); });
    expect(result.current.isLoading).toBe(false);
  });

  test("on failure does not redirect", async () => {
    mockSignIn.mockResolvedValue({ success: false, error: "Invalid credentials" });

    const { result } = renderHook(() => useAuth());
    await act(async () => { await result.current.signIn("user@example.com", "password"); });

    expect(mockPush).not.toHaveBeenCalled();
  });

  test("on success with anon work: saves work and redirects to new project", async () => {
    mockSignIn.mockResolvedValue({ success: true });
    mockGetAnonWorkData.mockReturnValue({ messages: [{ role: "user", content: "hi" }], fileSystemData: {} });
    mockCreateProject.mockResolvedValue({ id: "proj-anon" });

    const { result } = renderHook(() => useAuth());
    await act(async () => { await result.current.signIn("user@example.com", "password"); });

    expect(mockCreateProject).toHaveBeenCalledOnce();
    expect(mockClearAnonWork).toHaveBeenCalledOnce();
    expect(mockPush).toHaveBeenCalledWith("/proj-anon");
    expect(mockGetProjects).not.toHaveBeenCalled();
  });

  test("on success with no anon work and existing projects: redirects to most recent project", async () => {
    mockSignIn.mockResolvedValue({ success: true });
    mockGetProjects.mockResolvedValue([{ id: "proj-1" }, { id: "proj-2" }]);

    const { result } = renderHook(() => useAuth());
    await act(async () => { await result.current.signIn("user@example.com", "password"); });

    expect(mockPush).toHaveBeenCalledWith("/proj-1");
    expect(mockCreateProject).not.toHaveBeenCalled();
  });

  test("on success with no anon work and no existing projects: creates a new project", async () => {
    mockSignIn.mockResolvedValue({ success: true });
    mockGetProjects.mockResolvedValue([]);
    mockCreateProject.mockResolvedValue({ id: "proj-new" });

    const { result } = renderHook(() => useAuth());
    await act(async () => { await result.current.signIn("user@example.com", "password"); });

    expect(mockCreateProject).toHaveBeenCalledOnce();
    expect(mockCreateProject.mock.calls[0][0]).toMatchObject({ messages: [], data: {} });
    expect(mockPush).toHaveBeenCalledWith("/proj-new");
  });

  test("on success with empty anon messages: does not treat it as anon work", async () => {
    mockSignIn.mockResolvedValue({ success: true });
    mockGetAnonWorkData.mockReturnValue({ messages: [], fileSystemData: {} });
    mockGetProjects.mockResolvedValue([{ id: "proj-existing" }]);

    const { result } = renderHook(() => useAuth());
    await act(async () => { await result.current.signIn("user@example.com", "password"); });

    expect(mockCreateProject).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/proj-existing");
  });
});

// ─── signUp ──────────────────────────────────────────────────────────────────

describe("signUp", () => {
  test("calls signUpAction with email and password", async () => {
    mockSignUp.mockResolvedValue({ success: false, error: "Email already registered" });

    const { result } = renderHook(() => useAuth());
    await act(async () => { await result.current.signUp("new@example.com", "password123"); });

    expect(mockSignUp).toHaveBeenCalledWith("new@example.com", "password123");
  });

  test("returns the result from signUpAction", async () => {
    const authResult = { success: false, error: "Email already registered" };
    mockSignUp.mockResolvedValue(authResult);

    const { result } = renderHook(() => useAuth());
    let returnValue: unknown;
    await act(async () => {
      returnValue = await result.current.signUp("new@example.com", "password123");
    });

    expect(returnValue).toEqual(authResult);
  });

  test("on failure does not redirect", async () => {
    mockSignUp.mockResolvedValue({ success: false, error: "Email already registered" });

    const { result } = renderHook(() => useAuth());
    await act(async () => { await result.current.signUp("new@example.com", "password123"); });

    expect(mockPush).not.toHaveBeenCalled();
  });

  test("on success redirects using same post-sign-in flow as signIn", async () => {
    mockSignUp.mockResolvedValue({ success: true });
    mockGetProjects.mockResolvedValue([{ id: "proj-after-signup" }]);

    const { result } = renderHook(() => useAuth());
    await act(async () => { await result.current.signUp("new@example.com", "password123"); });

    expect(mockPush).toHaveBeenCalledWith("/proj-after-signup");
  });

  test("manages isLoading correctly during signUp", async () => {
    let resolveSignUp!: (v: unknown) => void;
    mockSignUp.mockReturnValue(new Promise((r) => { resolveSignUp = r; }));

    const { result } = renderHook(() => useAuth());
    expect(result.current.isLoading).toBe(false);

    act(() => { result.current.signUp("new@example.com", "password123"); });
    await waitFor(() => expect(result.current.isLoading).toBe(true));

    await act(async () => { resolveSignUp({ success: false }); });
    expect(result.current.isLoading).toBe(false);
  });
});
