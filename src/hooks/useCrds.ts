import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { CrdInfo } from "../types/k8s";
export type { CrdInfo };

export function useCrds(context: string) {
  const [crds, setCrds] = useState<CrdInfo[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!context) return;
    setLoading(true);
    invoke<CrdInfo[]>("cmd_list_crds", { context })
      .then(setCrds)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [context]);

  return { crds, loading };
}
