import { PanelState, ResourceItem } from "../../types/k8s";
import ResourceList from "../ResourceList/ResourceList";
import ResourceDetail from "../ResourceDetail/ResourceDetail";
import EventsViewer from "../Events/EventsViewer";

const resourceTypeToKind: Record<string, string> = {
  pods: "Pod",
  deployments: "Deployment",
  services: "Service",
  configmaps: "ConfigMap",
  secrets: "Secret",
  statefulsets: "StatefulSet",
  daemonsets: "DaemonSet",
  ingress: "Ingress",
  namespaces: "Namespace",
  nodes: "Node",
  jobs: "Job",
  cronjobs: "CronJob",
  persistentvolumes: "PersistentVolume",
  persistentvolumeclaims: "PersistentVolumeClaim",
};

interface Props {
  panel: PanelState;
  resources: ResourceItem[];
  isLoading: boolean;
  resourceError: string | null;
  resourceFilter: string;
  setResourceFilter: (v: string) => void;
  refetch: () => void;
  onSelectResource: (item: ResourceItem) => void;
  onClose: () => void;
  onEventsClick: () => void;
}

export default function ListView({
  panel,
  resources,
  isLoading,
  resourceError,
  resourceFilter,
  setResourceFilter,
  refetch,
  onSelectResource,
  onClose,
  onEventsClick,
}: Props) {
  if (panel.viewMode === "list") {
    const errorMessage = resourceError
      ? /403|forbidden|unauthorized/i.test(resourceError)
        ? "이 리소스를 볼 권한이 없습니다 (권한 부족)"
        : resourceError
      : null;

    const filteredResources = resourceFilter
      ? resources.filter((r) =>
          r.name.toLowerCase().includes(resourceFilter.toLowerCase()) ||
          (r.namespace ?? "").toLowerCase().includes(resourceFilter.toLowerCase())
        )
      : resources;

    return (
      <>
        <div className="flex items-center gap-2 px-3 py-1 bg-gray-800 border-b border-gray-700 shrink-0">
          <input
            type="text"
            placeholder="리소스 검색..."
            value={resourceFilter}
            onChange={(e) => setResourceFilter(e.target.value)}
            className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-0.5 text-xs outline-none focus:border-blue-500 text-gray-200 placeholder-gray-500"
          />
          <button
            onClick={refetch}
            className="px-2 py-0.5 text-gray-400 hover:text-white text-xs transition-colors"
            title="새로고침"
          >
            ↻
          </button>
        </div>
        {errorMessage && (
          <div className="flex items-center gap-2 px-4 py-2 text-red-400 text-xs bg-red-900/20 border-b border-red-800">
            <span className="flex-1">{errorMessage}</span>
            <button
              onClick={refetch}
              className="px-2 py-0.5 bg-red-800 rounded hover:bg-red-700 transition-colors shrink-0"
            >
              재시도
            </button>
          </div>
        )}
        {isLoading && resources.length === 0 ? (
          <div className="p-4 text-gray-500 text-sm flex items-center justify-center h-full">
            <span className="animate-pulse">로딩 중...</span>
          </div>
        ) : (
          <ResourceList
            items={filteredResources}
            selectedKey={panel.selectedResource ? `${panel.selectedResource.namespace ?? ""}-${panel.selectedResource.name}` : undefined}
            resourceType={panel.resourceType}
            onSelect={onSelectResource}
          />
        )}
      </>
    );
  }

  if (panel.viewMode === "detail") {
    if (!panel.selectedResource) {
      return (
        <div className="p-4 text-gray-500 text-sm">
          리스트에서 리소스를 선택하세요
        </div>
      );
    }
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-1 bg-gray-800 border-b border-gray-700 shrink-0">
          <span className="text-xs text-gray-400 truncate">{panel.selectedResource.name}</span>
          <button
            onClick={onEventsClick}
            className="ml-auto px-2 py-0.5 text-xs text-gray-400 hover:text-white transition-colors"
          >
            이벤트
          </button>
        </div>
        <div className="flex-1 overflow-auto">
          <ResourceDetail
            resource={panel.selectedResource}
            context={panel.context}
            onClose={onClose}
          />
        </div>
      </div>
    );
  }

  if (panel.viewMode === "events") {
    return (
      <EventsViewer
        context={panel.context}
        namespace={panel.namespace}
        resourceName={panel.selectedResource?.name}
        resourceKind={panel.selectedResource ? resourceTypeToKind[panel.resourceType] : undefined}
      />
    );
  }

  return null;
}
