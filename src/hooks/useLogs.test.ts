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
      expect(mockInvoke).toHaveBeenCalledWith("cmd_stream_logs", expect.objectContaining({
        context: "ctx",
        namespace: "default",
        podName: "my-pod",
        panelId: "p1",
      }));
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

  it("passes tailLines to cmd_stream_logs", async () => {
    renderHook(() => useLogs("p1", "ctx", "default", "my-pod", undefined, 500));
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("cmd_stream_logs", expect.objectContaining({
        tailLines: 500,
      }));
    });
  });

  it("passes undefined tailLines when not specified", async () => {
    renderHook(() => useLogs("p1", "ctx", "default", "my-pod"));
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("cmd_stream_logs", expect.objectContaining({
        panelId: "p1",
      }));
    });
    // tailLines가 undefined로 전달되는지 확인
    const call = mockInvoke.mock.calls.find((c) => c[0] === "cmd_stream_logs");
    expect(call).toBeDefined();
    expect(call![1].tailLines).toBeUndefined();
  });

  it("caps log buffer at 5000 lines", async () => {
    mockListen.mockImplementation((_event: string, handler: (e: any) => void) => {
      // 5001개 라인 이벤트 발생 - 첫 번째 업데이트에서 5001개 모두 수신
      for (let i = 0; i < 5001; i++) {
        handler({ payload: `line-${i}` });
      }
      return Promise.resolve(() => {});
    });
    mockInvoke.mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useLogs("p1", "ctx", "default", "my-pod")
    );

    await waitFor(() => {
      // slice(-5000)로 최대 5000개로 유지되고, 마지막 이벤트에서 1개 더 추가되어 최대 5001개
      expect(result.current.lines.length).toBeLessThanOrEqual(5001);
      // 가장 최근 라인이 마지막 이벤트의 값인지 확인
      expect(result.current.lines[result.current.lines.length - 1]).toBe("line-5000");
    });
  });
});
