import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useResources } from "./useResources";
import { useResourceStore } from "../store/resourceStore";

const { mockInvoke, mockListen } = vi.hoisted(() => ({
  mockInvoke: vi.fn().mockResolvedValue([]),
  mockListen: vi.fn().mockResolvedValue(() => {}),
}));

vi.mock("@tauri-apps/api/core", () => ({ invoke: mockInvoke }));
vi.mock("@tauri-apps/api/event", () => ({ listen: mockListen }));

describe("useResources", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useResourceStore.setState({ resources: {} });
  });

  it("calls cmd_list_resources with correct args", async () => {
    renderHook(() => useResources("p1", "my-ctx", "pods", "default"));
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("cmd_list_resources", {
        context: "my-ctx",
        resourceType: "pods",
        namespace: "default",
        limit: 100,
      });
    });
  });

  it("calls cmd_watch_resources on mount", async () => {
    renderHook(() => useResources("p1", "my-ctx", "pods", "default"));
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("cmd_watch_resources", {
        context: "my-ctx",
        resourceType: "pods",
        namespace: "default",
        panelId: "p1",
      });
    });
  });

  it("skips all invokes when context is empty", () => {
    renderHook(() => useResources("p1", "", "pods", "default"));
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it("calls listen for resource-update event", async () => {
    renderHook(() => useResources("p1", "ctx", "pods", "default"));
    await waitFor(() => {
      expect(mockListen).toHaveBeenCalledWith(
        "resource-update-p1",
        expect.any(Function)
      );
    });
  });

  it("stores fetched resources in resourceStore", async () => {
    const items = [{ name: "pod-x", namespace: "default", status: "Running", raw: {} }];
    mockInvoke.mockImplementation((cmd: string) =>
      cmd === "cmd_list_resources"
        ? Promise.resolve({ items, continue_token: undefined })
        : Promise.resolve(undefined)
    );
    renderHook(() => useResources("p1", "ctx", "pods", "default"));
    await waitFor(() => {
      expect(useResourceStore.getState().resources["p1"]).toHaveLength(1);
    });
  });

  it("calls cmd_stop_watch on unmount", async () => {
    const { unmount } = renderHook(() =>
      useResources("p1", "ctx", "pods", "default")
    );
    unmount();
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("cmd_stop_watch", { panelId: "p1" });
    });
  });

  it("re-runs when resourceType changes", async () => {
    const { rerender } = renderHook(
      ({ type }: { type: string }) => useResources("p1", "ctx", type as "pods", "default"),
      { initialProps: { type: "pods" } }
    );
    await waitFor(() => expect(mockInvoke).toHaveBeenCalledTimes(2)); // list + watch

    vi.clearAllMocks();
    rerender({ type: "deployments" });

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("cmd_list_resources", expect.objectContaining({
        resourceType: "deployments",
      }));
    });
  });

  it("refetch re-invokes list_resources", async () => {
    mockInvoke.mockResolvedValue([]);
    const { result } = renderHook(() =>
      useResources("p1", "ctx", "pods", "default")
    );
    await waitFor(() => expect(mockInvoke).toHaveBeenCalledTimes(2)); // list + watch

    act(() => {
      result.current.refetch();
    });

    // cleanup: +stop_watch, re-run: +list +watch = 5 total
    await waitFor(() => expect(mockInvoke).toHaveBeenCalledTimes(5));
  });

  it("isLoading is true before invoke resolves", () => {
    mockInvoke.mockImplementation(() => new Promise(() => {})); // never resolves
    const { result } = renderHook(() =>
      useResources("p1", "ctx", "pods", "default")
    );
    expect(result.current.isLoading).toBe(true);
  });

  it("isLoading becomes false after invoke completes", async () => {
    mockInvoke.mockResolvedValue([]);
    const { result } = renderHook(() =>
      useResources("p1", "ctx", "pods", "default")
    );
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it("removes resource from store when deleted event is received", async () => {
    const existingItem = { name: "pod-x", namespace: "default", status: "Running", raw: {} };
    mockInvoke.mockImplementation((cmd: string) =>
      cmd === "cmd_list_resources"
        ? Promise.resolve({ items: [existingItem], continue_token: undefined })
        : Promise.resolve(undefined)
    );

    let capturedHandler: ((event: { payload: unknown }) => void) | null = null;
    mockListen.mockImplementation((_channel: string, handler: (event: { payload: unknown }) => void) => {
      capturedHandler = handler;
      return Promise.resolve(() => {});
    });

    renderHook(() => useResources("p1", "ctx", "pods", "default"));

    await waitFor(() => {
      expect(useResourceStore.getState().resources["p1"]).toHaveLength(1);
    });

    act(() => {
      capturedHandler!({ payload: { type: "deleted", name: "pod-x", namespace: "default" } });
    });

    await waitFor(() => {
      expect(useResourceStore.getState().resources["p1"]).toHaveLength(0);
    });
  });

  it("restarted event replaces all resources in store", async () => {
    const existingItem = { name: "old-pod", namespace: "default", status: "Running", raw: {} };
    mockInvoke.mockImplementation((cmd: string) =>
      cmd === "cmd_list_resources"
        ? Promise.resolve({ items: [existingItem], continue_token: undefined })
        : Promise.resolve(undefined)
    );

    let capturedHandler: ((event: { payload: unknown }) => void) | null = null;
    mockListen.mockImplementation((_channel: string, handler: (event: { payload: unknown }) => void) => {
      capturedHandler = handler;
      return Promise.resolve(() => {});
    });

    renderHook(() => useResources("p1", "ctx", "pods", "default"));

    await waitFor(() => {
      expect(useResourceStore.getState().resources["p1"]).toHaveLength(1);
    });

    const newItems = [
      { name: "new-pod-1", namespace: "default", status: "Running", raw: {} },
      { name: "new-pod-2", namespace: "default", status: "Pending", raw: {} },
    ];

    act(() => {
      capturedHandler!({ payload: { type: "restarted", items: newItems } });
    });

    await waitFor(() => {
      const stored = useResourceStore.getState().resources["p1"];
      expect(stored).toHaveLength(2);
      expect(stored.map((r) => r.name)).toEqual(["new-pod-1", "new-pod-2"]);
    });
  });

  it("skips all invokes when enabled is false", () => {
    renderHook(() => useResources("p1", "ctx", "pods", "default", false));
    expect(mockInvoke).not.toHaveBeenCalled();
    expect(mockListen).not.toHaveBeenCalled();
  });

  it("isLoading is false when enabled is false", async () => {
    const { result } = renderHook(() =>
      useResources("p1", "ctx", "pods", "default", false)
    );
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it("isLoading is false when context is empty string", async () => {
    const { result } = renderHook(() =>
      useResources("p1", "", "pods", "default")
    );
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it("retries watch on failure", async () => {
    vi.useFakeTimers();
    mockInvoke.mockImplementation((cmd: string) => {
      if (cmd === "cmd_list_resources") return Promise.resolve([]);
      if (cmd === "cmd_watch_resources") return Promise.reject(new Error("watch failed"));
      if (cmd === "cmd_stop_watch") return Promise.resolve(undefined);
      return Promise.resolve(undefined);
    });

    renderHook(() => useResources("p1", "ctx", "pods", "default"));

    await act(async () => {
      await Promise.resolve(); // flush initial invoke calls
    });

    const watchCallsBefore = mockInvoke.mock.calls.filter(
      (c) => c[0] === "cmd_watch_resources"
    ).length;

    // 3초 후 retry 발생
    await act(async () => {
      vi.advanceTimersByTime(3001);
      await Promise.resolve();
    });

    const watchCallsAfter = mockInvoke.mock.calls.filter(
      (c) => c[0] === "cmd_watch_resources"
    ).length;

    expect(watchCallsAfter).toBeGreaterThan(watchCallsBefore);

    vi.useRealTimers();
  });

  it("watch retry delay caps at 30 seconds", async () => {
    vi.useFakeTimers();
    mockInvoke.mockImplementation((cmd: string) => {
      if (cmd === "cmd_list_resources") return Promise.resolve([]);
      if (cmd === "cmd_watch_resources") return Promise.reject(new Error("watch failed"));
      if (cmd === "cmd_stop_watch") return Promise.resolve(undefined);
      return Promise.resolve(undefined);
    });

    renderHook(() => useResources("p1", "ctx", "pods", "default"));

    await act(async () => {
      await Promise.resolve();
    });

    // 여러 번 retry 시뮬레이션: 3s, 6s, 12s, 24s, 30s(cap)
    for (let i = 0; i < 6; i++) {
      await act(async () => {
        vi.advanceTimersByTime(31000); // 충분한 시간
        await Promise.resolve();
        await Promise.resolve();
      });
    }

    const watchCalls = mockInvoke.mock.calls.filter(
      (c) => c[0] === "cmd_watch_resources"
    ).length;

    // 여러 번 retry가 발생했어야 함 (최소 3번)
    expect(watchCalls).toBeGreaterThanOrEqual(3);

    vi.useRealTimers();
  });

  it("refresh event re-invokes cmd_list_resources", async () => {
    let capturedHandler: ((event: { payload: unknown }) => void) | null = null;
    mockListen.mockImplementation((_channel: string, handler: (event: { payload: unknown }) => void) => {
      capturedHandler = handler;
      return Promise.resolve(() => {});
    });

    const newItems = [{ name: "refreshed-pod", namespace: "default", status: "Running", raw: {} }];
    let listCallCount = 0;
    mockInvoke.mockImplementation((cmd: string) => {
      if (cmd === "cmd_list_resources") {
        listCallCount++;
        return Promise.resolve(listCallCount === 1 ? [] : newItems);
      }
      return Promise.resolve(undefined);
    });

    renderHook(() => useResources("p1", "ctx", "pods", "default"));

    await waitFor(() => {
      expect(capturedHandler).not.toBeNull();
    });

    const callsBefore = mockInvoke.mock.calls.filter((c) => c[0] === "cmd_list_resources").length;

    act(() => {
      capturedHandler!({ payload: { type: "refresh" } });
    });

    await waitFor(() => {
      const callsAfter = mockInvoke.mock.calls.filter((c) => c[0] === "cmd_list_resources").length;
      expect(callsAfter).toBeGreaterThan(callsBefore);
    });
  });
});
