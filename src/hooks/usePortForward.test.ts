import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePortForward } from "./usePortForward";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

import { invoke } from "@tauri-apps/api/core";
const mockInvoke = invoke as ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockInvoke.mockReset();
  mockInvoke.mockResolvedValue([]); // default: list returns empty
});

describe("usePortForward", () => {
  it("initializes with empty forwards", async () => {
    mockInvoke.mockResolvedValue([]);
    const { result } = renderHook(() => usePortForward());
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(result.current.forwards).toEqual([]);
  });

  it("start calls cmd_start_port_forward and refreshes list", async () => {
    const fakeForward = { key: "default/my-pod:8080", local_port: 54321, pod_name: "my-pod", pod_port: 8080, namespace: "default" };
    mockInvoke
      .mockResolvedValueOnce([])           // initial refresh
      .mockResolvedValueOnce(54321)        // cmd_start_port_forward
      .mockResolvedValueOnce([fakeForward]); // refresh after start

    const { result } = renderHook(() => usePortForward());
    await act(async () => {
      await result.current.start("ctx", "default", "my-pod", 8080, 54321);
    });
    expect(mockInvoke).toHaveBeenCalledWith("cmd_start_port_forward", expect.objectContaining({
      podName: "my-pod",
      podPort: 8080,
    }));
    expect(result.current.forwards).toEqual([fakeForward]);
  });

  it("stop calls cmd_stop_port_forward and refreshes list", async () => {
    mockInvoke
      .mockResolvedValueOnce([])  // initial refresh
      .mockResolvedValueOnce(undefined) // cmd_stop_port_forward
      .mockResolvedValueOnce([]); // refresh after stop

    const { result } = renderHook(() => usePortForward());
    await act(async () => {
      await result.current.stop("default/my-pod:8080");
    });
    expect(mockInvoke).toHaveBeenCalledWith("cmd_stop_port_forward", { key: "default/my-pod:8080" });
  });
});
