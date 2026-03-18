import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { PanelState } from "../../types/k8s";
import { usePanelStore } from "../../store/panelStore";
import { useResourceStore } from "../../store/resourceStore";
import { useClusterStore } from "../../store/clusterStore";
import { useResources } from "../../hooks/useResources";
import { useLogs } from "../../hooks/useLogs";
import Sidebar from "../Sidebar/Sidebar";
import ResourceList from "../ResourceList/ResourceList";
import ResourceDetail from "../ResourceDetail/ResourceDetail";
import LogViewer from "../LogViewer/LogViewer";

interface Props {
  panel: PanelState;
}

export default function Panel({ panel }: Props) {
  const { updatePanel } = usePanelStore();
  const resources = useResourceStore((s) => s.resources[panel.id] ?? []);
  const { contexts, namespaces } = useClusterStore();
  const [logFilter, setLogFilter] = useState("");

  useResources(panel.id, panel.context, panel.resourceType, panel.namespace);

  const { lines, error: logError } = useLogs(
    panel.id,
    panel.context,
    panel.selectedResource?.namespace ?? panel.namespace,
    panel.viewMode === "logs" ? (panel.selectedResource?.name ?? "") : "",
  );

  const handleDetach = () => {
    invoke("open_panel_window", {
      panelId: panel.id,
      panelState: panel,
    }).catch(console.error);
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white overflow-hidden">
      {/* Panel toolbar */}
      <div className="flex items-center gap-2 px-3 py-1 bg-gray-800 border-b border-gray-700 text-xs shrink-0">
        <select
          value={panel.context}
          onChange={(e) => updatePanel(panel.id, { context: e.target.value })}
          className="bg-gray-700 border border-gray-600 rounded px-1 py-0.5 text-xs max-w-[120px] truncate"
        >
          {contexts.length === 0 ? (
            <option value={panel.context}>{panel.context || "no cluster"}</option>
          ) : (
            contexts.map((ctx) => (
              <option key={ctx.name} value={ctx.name}>{ctx.name}</option>
            ))
          )}
        </select>
        <select
          value={panel.namespace}
          onChange={(e) => updatePanel(panel.id, { namespace: e.target.value })}
          className="bg-gray-700 border border-gray-600 rounded px-1 py-0.5 text-xs"
        >
          {namespaces.length === 0 ? (
            <option value={panel.namespace}>{panel.namespace}</option>
          ) : (
            namespaces.map((ns) => (
              <option key={ns} value={ns}>{ns}</option>
            ))
          )}
        </select>
        <div className="flex gap-1 ml-auto">
          {["list", "detail", "logs"].map((mode) => (
            <button
              key={mode}
              onClick={() => updatePanel(panel.id, { viewMode: mode as PanelState["viewMode"] })}
              className={`px-1.5 py-0.5 rounded text-xs transition-colors ${
                panel.viewMode === mode
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {mode}
            </button>
          ))}
          <button
            onClick={handleDetach}
            className="px-1.5 py-0.5 text-gray-500 hover:text-white transition-colors"
            title="새 창으로 분리"
          >
            ⬡
          </button>
        </div>
      </div>

      {/* Panel content */}
      <div className="flex flex-1 overflow-hidden">
        {panel.viewMode !== "logs" && (
          <Sidebar
            selected={panel.resourceType}
            onSelect={(type) => updatePanel(panel.id, { resourceType: type, selectedResource: null })}
          />
        )}
        <div className="flex-1 overflow-auto">
          {panel.viewMode === "list" && (
            <ResourceList
              items={resources}
              selectedName={panel.selectedResource?.name}
              onSelect={(item) =>
                updatePanel(panel.id, { selectedResource: item })
              }
            />
          )}
          {panel.viewMode === "detail" && panel.selectedResource && (
            <ResourceDetail
              resource={panel.selectedResource}
              context={panel.context}
              onClose={() => updatePanel(panel.id, { selectedResource: null, viewMode: "list" })}
            />
          )}
          {panel.viewMode === "detail" && !panel.selectedResource && (
            <div className="p-4 text-gray-500 text-sm">
              리스트에서 리소스를 선택하세요
            </div>
          )}
          {panel.viewMode === "logs" && (
            <div className="flex flex-col h-full">
              {panel.selectedResource ? (
                <>
                  <div className="flex items-center gap-2 px-3 py-1 bg-gray-800 border-b border-gray-700 shrink-0">
                    <span className="text-xs text-gray-400">
                      {panel.selectedResource.name}
                    </span>
                    <input
                      type="text"
                      placeholder="filter logs..."
                      value={logFilter}
                      onChange={(e) => setLogFilter(e.target.value)}
                      className="ml-auto bg-gray-700 border border-gray-600 rounded px-2 py-0.5 text-xs w-40 outline-none focus:border-blue-500"
                    />
                  </div>
                  <LogViewer lines={lines} error={logError} filter={logFilter} />
                </>
              ) : (
                <div className="p-4 text-gray-500 text-sm">
                  로그를 볼 Pod를 리스트에서 선택 후 logs 모드로 전환하세요
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
