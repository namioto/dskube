import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
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
      cmd === "cmd_list_resources" ? Promise.resolve(items) : Promise.resolve(undefined)
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
});
