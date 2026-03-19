import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useLogs } from "./useLogs";

const { mockInvoke, mockListen } = vi.hoisted(() => ({
  mockInvoke: vi.fn().mockResolvedValue(undefined),
  mockListen: vi.fn().mockResolvedValue(() => {}),
}));

vi.mock("@tauri-apps/api/core", () => ({ invoke: mockInvoke }));
vi.mock("@tauri-apps/api/event", () => ({ listen: mockListen }));

describe("useLogs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty lines and null error initially", () => {
    const { result } = renderHook(() => useLogs("p1", "ctx", "default", ""));
    expect(result.current.lines).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it("does not call cmd_stream_logs when podName is empty", () => {
    renderHook(() => useLogs("p1", "ctx", "default", ""));
    expect(mockInvoke).not.toHaveBeenCalledWith("cmd_stream_logs", expect.anything());
  });

  it("does not call listen when podName is empty", () => {
    renderHook(() => useLogs("p1", "ctx", "default", ""));
    expect(mockListen).not.toHaveBeenCalled();
  });

  it("calls cmd_stream_logs when podName is provided", async () => {
    renderHook(() => useLogs("p1", "ctx", "default", "my-pod"));
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("cmd_stream_logs", {
        context: "ctx",
        namespace: "default",
        podName: "my-pod",
        container: undefined,
        panelId: "p1",
      });
    });
  });

  it("calls listen for log-line event when podName is provided", async () => {
    renderHook(() => useLogs("p1", "ctx", "default", "my-pod"));
    await waitFor(() => {
      expect(mockListen).toHaveBeenCalledWith("log-line-p1", expect.any(Function));
    });
  });

  it("calls cmd_stop_logs on unmount", async () => {
    const { unmount } = renderHook(() =>
      useLogs("p1", "ctx", "default", "my-pod")
    );
    unmount();
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("cmd_stop_logs", { panelId: "p1" });
    });
  });

  it("resets lines when podName changes", async () => {
    const { rerender, result } = renderHook(
      ({ pod }: { pod: string }) => useLogs("p1", "ctx", "default", pod),
      { initialProps: { pod: "pod-a" } }
    );
    await waitFor(() => expect(mockInvoke).toHaveBeenCalled());
    rerender({ pod: "pod-b" });
    expect(result.current.lines).toEqual([]);
  });

  it("does not call cmd_stop_logs when podName was empty on unmount", () => {
    const { unmount } = renderHook(() => useLogs("p1", "ctx", "default", ""));
    unmount();
    expect(mockInvoke).not.toHaveBeenCalledWith("cmd_stop_logs", expect.anything());
  });
});
