import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useEffect, useState, useCallback, useRef } from "react";

export function useExec(
  panelId: string,
  context: string,
  namespace: string,
  podName: string,
  container?: string
) {
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onDataRef = useRef<((data: string) => void) | null>(null);

  const start = useCallback(async (command: string[] = ["sh"]) => {
    try {
      await invoke("cmd_exec_pod", {
        context, namespace, podName, container, panelId, command
      });
      setIsRunning(true);
      setError(null);
    } catch (e) {
      setError(String(e));
    }
  }, [context, namespace, podName, container, panelId]);

  const sendInput = useCallback(async (input: string) => {
    await invoke("cmd_exec_send_input", { panelId, input });
  }, [panelId]);

  const stop = useCallback(async () => {
    await invoke("cmd_stop_exec", { panelId });
    setIsRunning(false);
  }, [panelId]);

  useEffect(() => {
    const unlisten = listen<string>(`exec-stdout-${panelId}`, (event) => {
      onDataRef.current?.(event.payload);
    });
    return () => {
      unlisten.then(fn => fn());
      stop();
    };
  }, [panelId]);

  return { isRunning, error, start, sendInput, stop, onDataRef };
}
