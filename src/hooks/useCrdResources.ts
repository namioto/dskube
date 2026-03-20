import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState, useCallback } from "react";
import { ResourceItem } from "../types/k8s";
import { CrdInfo } from "../types/k8s";
import { useResourceStore } from "../store/resourceStore";

export function useCrdResources(
  panelId: string,
  context: string,
  crd: CrdInfo | null,
  namespace: string,
  enabled = true,
) {
  const { setResources } = useResourceStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }
    if (!context || !crd) {
      setResources(panelId, []);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    invoke<ResourceItem[]>("cmd_list_custom_resources", {
      context,
      group: crd.group,
      version: crd.version,
      plural: crd.plural,
      kind: crd.kind,
      namespace,
    })
      .then((items) => setResources(panelId, items))
      .catch((e) => setError(String(e)))
      .finally(() => setIsLoading(false));
  }, [panelId, context, crd?.name, namespace, enabled, retryCount]);

  const refetch = useCallback(() => setRetryCount((c) => c + 1), []);

  return { isLoading, error, refetch };
}
