import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { ResourceItem, ResourcePage, ResourceType, PanelId } from "../types/k8s";
import { useResourceStore } from "../store/resourceStore";

export function useResources(
  panelId: PanelId,
  context: string,
  resourceType: ResourceType,
  namespace: string,
  enabled = true
) {
  const { setResources, updateResource, removeResource } = useResourceStore();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [continueToken, setContinueToken] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!context || !enabled) { setIsLoading(false); return; }
    setError(null);
    setIsLoading(true);
    setContinueToken(undefined);

    // 초기 목록 조회
    invoke<ResourcePage>("cmd_list_resources", {
      context,
      resourceType,
      namespace,
      limit: 100,
    })
      .then((page) => {
        setResources(panelId, page.items);
        setContinueToken(page.continue_token);
      })
      .catch((e) => setError(String(e)))
      .finally(() => setIsLoading(false));

    // watch 시작 (Pod는 live stream, 나머지는 30초 폴링)
    let watchRetryTimer: ReturnType<typeof setTimeout> | null = null;
    let retryDelay = 3000;

    const startWatch = () => {
      invoke("cmd_watch_resources", {
        context,
        resourceType,
        namespace,
        panelId,
      }).catch(() => {
        watchRetryTimer = setTimeout(() => {
          retryDelay = Math.min(retryDelay * 2, 30000);
          startWatch();
        }, retryDelay);
      });
    };

    startWatch();

    // watch 백그라운드 태스크 에러 수신
    const unlistenError = listen<string>(
      `resource-error-${panelId}`,
      (event) => setError(event.payload)
    );

    // watch 이벤트 수신
    const unlisten = listen<ResourceItem | { type: string }>(
      `resource-update-${panelId}`,
      (event) => {
        const payload = event.payload as Record<string, unknown>;
        if (payload.type === "refresh") {
          // 30초 폴링 refresh — 목록 재조회
          invoke<ResourcePage>("cmd_list_resources", {
            context,
            resourceType,
            namespace,
            limit: 100,
          })
            .then((page) => {
              setResources(panelId, page.items);
              setContinueToken(page.continue_token);
            })
            .catch(console.error);
        } else if (payload.type === "restarted") {
          setResources(panelId, payload.items as ResourceItem[]);
          setContinueToken(undefined);
        } else if (payload.type === "deleted") {
          removeResource(panelId, payload.name as string, payload.namespace as string | undefined);
        } else {
          updateResource(panelId, event.payload as ResourceItem);
        }
      }
    );

    return () => {
      if (watchRetryTimer) clearTimeout(watchRetryTimer);
      invoke("cmd_stop_watch", { panelId }).catch(console.error);
      unlisten.then((fn) => fn());
      unlistenError.then((fn) => fn());
    };
  }, [panelId, context, resourceType, namespace, retryCount, enabled]);

  const loadMore = useCallback(() => {
    if (!continueToken) return;
    invoke<ResourcePage>("cmd_list_resources", {
      context,
      resourceType,
      namespace,
      limit: 100,
      continueToken,
    })
      .then((page) => {
        const current = useResourceStore.getState().resources[panelId] ?? [];
        setResources(panelId, [...current, ...page.items]);
        setContinueToken(page.continue_token);
      })
      .catch(console.error);
  }, [continueToken, context, resourceType, namespace, panelId, setResources]);

  return { error, isLoading, refetch: () => setRetryCount((c) => c + 1), continueToken, loadMore };
}
