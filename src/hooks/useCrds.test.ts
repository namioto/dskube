import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCrds } from "./useCrds";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

import { invoke } from "@tauri-apps/api/core";
const mockInvoke = invoke as ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockInvoke.mockReset();
});

describe("useCrds", () => {
  it("starts with empty crds and loading false", () => {
    const { result } = renderHook(() => useCrds(""));
    expect(result.current.crds).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it("does not invoke when context is empty", () => {
    renderHook(() => useCrds(""));
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it("fetches CRDs when context is provided", async () => {
    const fakeCrds = [
      { name: "apps.example.com", kind: "App", group: "example.com", version: "v1", plural: "apps", namespaced: true },
    ];
    mockInvoke.mockResolvedValue(fakeCrds);
    const { result } = renderHook(() => useCrds("my-context"));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(mockInvoke).toHaveBeenCalledWith("cmd_list_crds", { context: "my-context" });
    expect(result.current.crds).toEqual(fakeCrds);
    expect(result.current.loading).toBe(false);
  });

  it("handles invoke error gracefully (crds stays empty)", async () => {
    mockInvoke.mockRejectedValue(new Error("forbidden"));
    const { result } = renderHook(() => useCrds("ctx"));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(result.current.crds).toEqual([]);
    expect(result.current.loading).toBe(false);
  });
});
