import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

export function useLogs(
  panelId: string,
  context: string,
  namespace: string,
  podName: string,
  container?: string,
  tailLines?: number
) {
  const [lines, setLines] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!podName) return;
    setLines([]);
    setError(null);

    invoke("cmd_stream_logs", {
      context,
      namespace,
      podName,
      container,
      panelId,
      tailLines,
    }).catch((e) => setError(String(e)));

    const unlisten = listen<string>(`log-line-${panelId}`, (event) => {
      setLines((prev) => [...prev.slice(-5000), event.payload]);
    });

    return () => {
      invoke("cmd_stop_logs", { panelId }).catch(console.error);
      unlisten.then((fn) => fn());
    };
  }, [panelId, context, namespace, podName, container, tailLines]);

  return { lines, error };
}
