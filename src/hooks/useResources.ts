import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { ResourceItem, ResourceType, PanelId } from "../types/k8s";
import { useResourceStore } from "../store/resourceStore";

export function useResources(
  panelId: PanelId,
  context: string,
  resourceType: ResourceType,
  namespace: string
) {
  const { setResources, updateResource } = useResourceStore();

  useEffect(() => {
    if (!context) return;

    // 초기 목록 조회
    invoke<ResourceItem[]>("cmd_list_resources", {
      context,
      resourceType,
      namespace,
    })
      .then((items) => setResources(panelId, items))
      .catch(console.error);

    // watch 시작 (Pod는 live stream, 나머지는 30초 폴링)
    invoke("cmd_watch_resources", {
      context,
      resourceType,
      namespace,
      panelId,
    }).catch(console.error);

    // watch 이벤트 수신
    const unlisten = listen<ResourceItem | { type: string }>(
      `resource-update-${panelId}`,
      (event) => {
        const payload = event.payload as Record<string, unknown>;
        if (payload.type === "refresh") {
          // 30초 폴링 refresh — 목록 재조회
          invoke<ResourceItem[]>("cmd_list_resources", {
            context,
            resourceType,
            namespace,
          })
            .then((items) => setResources(panelId, items))
            .catch(console.error);
        } else {
          updateResource(panelId, event.payload as ResourceItem);
        }
      }
    );

    return () => {
      invoke("cmd_stop_watch", { panelId }).catch(console.error);
      unlisten.then((fn) => fn());
    };
  }, [panelId, context, resourceType, namespace]);
}
