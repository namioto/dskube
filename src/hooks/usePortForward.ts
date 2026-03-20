import { invoke } from "@tauri-apps/api/core";
import { useState, useEffect } from "react";

export interface PortForwardInfo {
  key: string;
  local_port: number;
  pod_name: string;
  pod_port: number;
  namespace: string;
}

export function usePortForward() {
  const [forwards, setForwards] = useState<PortForwardInfo[]>([]);

  const refresh = async () => {
    const list = await invoke<PortForwardInfo[]>("cmd_list_port_forwards");
    setForwards(list);
  };

  const start = async (
    context: string,
    namespace: string,
    podName: string,
    podPort: number,
    localPort?: number
  ): Promise<number> => {
    const port = await invoke<number>("cmd_start_port_forward", {
      context, namespace, podName, podPort, localPort
    });
    await refresh();
    return port;
  };

  const stop = async (key: string) => {
    await invoke("cmd_stop_port_forward", { key });
    await refresh();
  };

  useEffect(() => { refresh(); }, []);

  return { forwards, start, stop, refresh };
}
