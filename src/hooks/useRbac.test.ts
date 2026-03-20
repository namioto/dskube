import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useRbac } from "./useRbac";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

import { invoke } from "@tauri-apps/api/core";
const mockInvoke = invoke as ReturnType<typeof vi.fn>;

beforeEach(() => {
  // clear module-level cache between tests by resetting mock
  mockInvoke.mockReset();
  // clear the module-level cache via reimport is not easy;
  // instead verify behavior via mock
});

describe("useRbac", () => {
  it("returns true optimistically before API response", () => {
    mockInvoke.mockReturnValue(new Promise(() => {})); // never resolves
    const { result } = renderHook(() =>
      useRbac("ctx", "pods", "delete", "default")
    );
    expect(result.current).toBe(true);
  });

  it("returns true when cmd_can_i resolves true", async () => {
    mockInvoke.mockResolvedValue(true);
    const { result } = renderHook(() =>
      useRbac("ctx-allow", "pods", "delete", "default")
    );
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(result.current).toBe(true);
  });

  it("returns false when cmd_can_i resolves false", async () => {
    mockInvoke.mockResolvedValue(false);
    const { result } = renderHook(() =>
      useRbac("ctx-deny", "deployments", "delete", "kube-system")
    );
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(result.current).toBe(false);
  });

  it("returns true (fail-open) when cmd_can_i throws", async () => {
    mockInvoke.mockRejectedValue(new Error("network error"));
    const { result } = renderHook(() =>
      useRbac("ctx-err", "pods", "get", "default")
    );
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(result.current).toBe(true);
  });

  it("does not call invoke when context is empty", () => {
    mockInvoke.mockResolvedValue(true);
    renderHook(() => useRbac("", "pods", "delete"));
    expect(mockInvoke).not.toHaveBeenCalled();
  });
});
