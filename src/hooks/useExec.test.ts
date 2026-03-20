import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useExec } from "./useExec";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));
vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(() => Promise.resolve(() => {})),
}));

import { invoke } from "@tauri-apps/api/core";
const mockInvoke = invoke as ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockInvoke.mockReset();
  mockInvoke.mockResolvedValue(undefined);
});

describe("useExec", () => {
  it("initializes with isRunning false and no error", () => {
    const { result } = renderHook(() =>
      useExec("panel-1", "ctx", "default", "my-pod")
    );
    expect(result.current.isRunning).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("start calls cmd_exec_pod and sets isRunning", async () => {
    mockInvoke.mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useExec("panel-1", "ctx", "default", "my-pod", "main")
    );
    await act(async () => {
      await result.current.start(["sh"]);
    });
    expect(mockInvoke).toHaveBeenCalledWith("cmd_exec_pod", expect.objectContaining({
      podName: "my-pod",
      command: ["sh"],
    }));
    expect(result.current.isRunning).toBe(true);
  });

  it("start sets error on failure", async () => {
    mockInvoke.mockRejectedValueOnce(new Error("exec failed"));
    const { result } = renderHook(() =>
      useExec("panel-2", "ctx", "default", "bad-pod")
    );
    await act(async () => {
      await result.current.start(["sh"]);
    });
    expect(result.current.error).toContain("exec failed");
    expect(result.current.isRunning).toBe(false);
  });

  it("sendInput calls cmd_exec_send_input", async () => {
    const { result } = renderHook(() =>
      useExec("panel-3", "ctx", "default", "my-pod")
    );
    await act(async () => {
      await result.current.sendInput("ls\n");
    });
    expect(mockInvoke).toHaveBeenCalledWith("cmd_exec_send_input", { panelId: "panel-3", input: "ls\n" });
  });

  it("stop calls cmd_stop_exec and sets isRunning false", async () => {
    const { result } = renderHook(() =>
      useExec("panel-4", "ctx", "default", "my-pod")
    );
    await act(async () => {
      await result.current.start(["sh"]);
      await result.current.stop();
    });
    expect(mockInvoke).toHaveBeenCalledWith("cmd_stop_exec", { panelId: "panel-4" });
    expect(result.current.isRunning).toBe(false);
  });
});
