import { test, expect, vi, beforeEach, describe } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAuth } from "@/hooks/use-auth";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/actions", () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: vi.fn(),
  clearAnonWork: vi.fn(),
}));

vi.mock("@/actions/get-projects", () => ({
  getProjects: vi.fn(),
}));

vi.mock("@/actions/create-project", () => ({
  createProject: vi.fn(),
}));

import { signIn as signInAction, signUp as signUpAction } from "@/actions";
import { getAnonWorkData, clearAnonWork } from "@/lib/anon-work-tracker";
import { getProjects } from "@/actions/get-projects";
import { createProject } from "@/actions/create-project";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useAuth - initial state", () => {
  test("returns signIn, signUp, and isLoading", () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.signIn).toBeTypeOf("function");
    expect(result.current.signUp).toBeTypeOf("function");
    expect(result.current.isLoading).toBe(false);
  });
});

describe("useAuth - signIn", () => {
  test("sets isLoading during sign in and resets after", async () => {
    let resolveAction!: (v: { success: boolean }) => void;
    const pendingAction = new Promise<{ success: boolean }>((resolve) => {
      resolveAction = resolve;
    });
    vi.mocked(signInAction).mockReturnValue(pendingAction);

    const { result } = renderHook(() => useAuth());

    act(() => {
      result.current.signIn("user@example.com", "password");
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolveAction({ success: false });
      await pendingAction;
    });

    expect(result.current.isLoading).toBe(false);
  });

  test("returns the result from signInAction", async () => {
    vi.mocked(signInAction).mockResolvedValue({ success: false, error: "Invalid credentials" });

    const { result } = renderHook(() => useAuth());
    let returnValue;

    await act(async () => {
      returnValue = await result.current.signIn("user@example.com", "wrongpass");
    });

    expect(returnValue).toEqual({ success: false, error: "Invalid credentials" });
  });

  test("calls signInAction with email and password", async () => {
    vi.mocked(signInAction).mockResolvedValue({ success: true });
    vi.mocked(getAnonWorkData).mockReturnValue(null);
    vi.mocked(getProjects).mockResolvedValue([{ id: "p1", name: "Project", createdAt: new Date(), updatedAt: new Date() }]);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("user@example.com", "password123");
    });

    expect(signInAction).toHaveBeenCalledWith("user@example.com", "password123");
  });

  test("does not navigate when sign in fails", async () => {
    vi.mocked(signInAction).mockResolvedValue({ success: false, error: "Invalid credentials" });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("user@example.com", "wrongpass");
    });

    expect(mockPush).not.toHaveBeenCalled();
  });

  test("resets isLoading even when signInAction throws", async () => {
    vi.mocked(signInAction).mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("user@example.com", "password").catch(() => {});
    });

    expect(result.current.isLoading).toBe(false);
  });
});

describe("useAuth - signUp", () => {
  test("sets isLoading during sign up and resets after", async () => {
    let resolveAction!: (v: { success: boolean }) => void;
    const pendingAction = new Promise<{ success: boolean }>((resolve) => {
      resolveAction = resolve;
    });
    vi.mocked(signUpAction).mockReturnValue(pendingAction);

    const { result } = renderHook(() => useAuth());

    act(() => {
      result.current.signUp("user@example.com", "password123");
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolveAction({ success: false });
      await pendingAction;
    });

    expect(result.current.isLoading).toBe(false);
  });

  test("returns the result from signUpAction", async () => {
    vi.mocked(signUpAction).mockResolvedValue({ success: false, error: "Password must be at least 8 characters" });

    const { result } = renderHook(() => useAuth());
    let returnValue;

    await act(async () => {
      returnValue = await result.current.signUp("user@example.com", "short");
    });

    expect(returnValue).toEqual({ success: false, error: "Password must be at least 8 characters" });
  });

  test("calls signUpAction with email and password", async () => {
    vi.mocked(signUpAction).mockResolvedValue({ success: true });
    vi.mocked(getAnonWorkData).mockReturnValue(null);
    vi.mocked(getProjects).mockResolvedValue([]);
    vi.mocked(createProject).mockResolvedValue({ id: "new1", name: "New Design", userId: "u1", messages: "[]", data: "{}", createdAt: new Date(), updatedAt: new Date() });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signUp("newuser@example.com", "securepass");
    });

    expect(signUpAction).toHaveBeenCalledWith("newuser@example.com", "securepass");
  });

  test("does not navigate when sign up fails", async () => {
    vi.mocked(signUpAction).mockResolvedValue({ success: false, error: "Email already registered" });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signUp("existing@example.com", "password123");
    });

    expect(mockPush).not.toHaveBeenCalled();
  });

  test("resets isLoading even when signUpAction throws", async () => {
    vi.mocked(signUpAction).mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signUp("user@example.com", "password123").catch(() => {});
    });

    expect(result.current.isLoading).toBe(false);
  });
});

describe("useAuth - post sign-in navigation", () => {
  test("claims anon work and redirects to new project when anon messages exist", async () => {
    vi.mocked(signInAction).mockResolvedValue({ success: true });
    vi.mocked(getAnonWorkData).mockReturnValue({
      messages: [{ role: "user", content: "Make a button" }],
      fileSystemData: { "/": { type: "directory" }, "/App.jsx": { type: "file", content: "..." } },
    });
    vi.mocked(createProject).mockResolvedValue({ id: "anon-project-1", name: "Design from ...", userId: "u1", messages: "[]", data: "{}", createdAt: new Date(), updatedAt: new Date() });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("user@example.com", "password");
    });

    expect(createProject).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [{ role: "user", content: "Make a button" }],
        data: expect.any(Object),
      })
    );
    expect(clearAnonWork).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/anon-project-1");
    expect(getProjects).not.toHaveBeenCalled();
  });

  test("does not claim anon work when anon messages array is empty", async () => {
    vi.mocked(signInAction).mockResolvedValue({ success: true });
    vi.mocked(getAnonWorkData).mockReturnValue({ messages: [], fileSystemData: {} });
    vi.mocked(getProjects).mockResolvedValue([{ id: "existing-1", name: "My Project", createdAt: new Date(), updatedAt: new Date() }]);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("user@example.com", "password");
    });

    expect(createProject).not.toHaveBeenCalled();
    expect(clearAnonWork).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/existing-1");
  });

  test("does not claim anon work when getAnonWorkData returns null", async () => {
    vi.mocked(signInAction).mockResolvedValue({ success: true });
    vi.mocked(getAnonWorkData).mockReturnValue(null);
    vi.mocked(getProjects).mockResolvedValue([{ id: "existing-1", name: "My Project", createdAt: new Date(), updatedAt: new Date() }]);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("user@example.com", "password");
    });

    expect(createProject).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/existing-1");
  });

  test("redirects to most recent project when user has existing projects", async () => {
    vi.mocked(signInAction).mockResolvedValue({ success: true });
    vi.mocked(getAnonWorkData).mockReturnValue(null);
    vi.mocked(getProjects).mockResolvedValue([
      { id: "recent-project", name: "Recent", createdAt: new Date(), updatedAt: new Date() },
      { id: "older-project", name: "Older", createdAt: new Date(), updatedAt: new Date() },
    ]);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("user@example.com", "password");
    });

    expect(mockPush).toHaveBeenCalledWith("/recent-project");
    expect(createProject).not.toHaveBeenCalled();
  });

  test("creates a new project and redirects when user has no existing projects", async () => {
    vi.mocked(signInAction).mockResolvedValue({ success: true });
    vi.mocked(getAnonWorkData).mockReturnValue(null);
    vi.mocked(getProjects).mockResolvedValue([]);
    vi.mocked(createProject).mockResolvedValue({ id: "brand-new", name: "New Design #12345", userId: "u1", messages: "[]", data: "{}", createdAt: new Date(), updatedAt: new Date() });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("user@example.com", "password");
    });

    expect(createProject).toHaveBeenCalledWith(
      expect.objectContaining({ messages: [], data: {} })
    );
    expect(mockPush).toHaveBeenCalledWith("/brand-new");
  });

  test("signUp also triggers post-sign-in navigation with anon work", async () => {
    vi.mocked(signUpAction).mockResolvedValue({ success: true });
    vi.mocked(getAnonWorkData).mockReturnValue({
      messages: [{ role: "user", content: "Make a card" }],
      fileSystemData: { "/": {} },
    });
    vi.mocked(createProject).mockResolvedValue({ id: "signup-project", name: "Design from ...", userId: "u1", messages: "[]", data: "{}", createdAt: new Date(), updatedAt: new Date() });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signUp("new@example.com", "password123");
    });

    expect(createProject).toHaveBeenCalled();
    expect(clearAnonWork).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/signup-project");
  });
});
