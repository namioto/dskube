import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { PanelState } from "../../types/k8s";
import { usePanelStore } from "../../store/panelStore";
import { useResourceStore } from "../../store/resourceStore";
import { useClusterStore } from "../../store/clusterStore";
import { useResources } from "../../hooks/useResources";
import { useCrdResources } from "../../hooks/useCrdResources";
import { useLogs } from "../../hooks/useLogs";
import Sidebar from "../Sidebar/Sidebar";
import Terminal from "../Terminal/Terminal";
import LogsView from "./LogsView";
import ListView from "./ListView";

interface Props {
  panel: PanelState;
}

export default function Panel({ panel }: Props) {
  const { updatePanel } = usePanelStore();
  const resources = useResourceStore((s) => s.resources[panel.id]) ?? [];
  const { contexts } = useClusterStore();
  const [localNamespaces, setLocalNamespaces] = useState<string[]>([]);
  const [logFilter, setLogFilter] = useState("");
  const [selectedContainer, setSelectedContainer] = useState("");
  const [resourceFilter, setResourceFilter] = useState("");

  useEffect(() => {
    setResourceFilter("");
  }, [panel.resourceType]);

  useEffect(() => {
    if (!panel.context) return;
    invoke<string[]>("get_namespaces", { context: panel.context })
      .then((ns) => {
        if (ns?.length > 0) setLocalNamespaces(ns);
      })
      .catch(console.error);
  }, [panel.context]);

  const isCrd = panel.resourceType === "custom";
  const listActive = panel.viewMode === "list" || panel.viewMode === "detail";

  const { error: _resError, isLoading: _resLoading, refetch: _resRefetch } = useResources(
    panel.id, panel.context, panel.resourceType, panel.namespace,
    listActive && !isCrd
  );

  const { error: _crdError, isLoading: _crdLoading, refetch: _crdRefetch } = useCrdResources(
    panel.id, panel.context, panel.selectedCrd ?? null, panel.namespace,
    listActive && isCrd
  );

  const isLoading = isCrd ? _crdLoading : _resLoading;
  const resourceError = isCrd ? _crdError : _resError;
  const refetch = isCrd ? _crdRefetch : _resRefetch;

  const { lines, error: logError } = useLogs(
    panel.id,
    panel.context,
    panel.selectedResource?.namespace ?? panel.namespace,
    panel.viewMode === "logs" ? (panel.selectedResource?.name ?? "") : "",
    selectedContainer || undefined,
  );

  const [detached, setDetached] = useState(false);
  const isListMode = panel.viewMode === "list" || panel.viewMode === "detail" || panel.viewMode === "events";
  const handleDetach = () => {
    if (detached) return;
    invoke("open_panel_window", { panelId: panel.id, panelState: panel })
      .then(() => setDetached(true))
      .catch(console.error);
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white overflow-hidden">
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
          {localNamespaces.length === 0 ? (
            <option value={panel.namespace}>{panel.namespace}</option>
          ) : (
            localNamespaces.map((ns) => (
              <option key={ns} value={ns}>{ns}</option>
            ))
          )}
        </select>
        <div className="flex gap-1 ml-auto">
          {["list", "detail", "logs", "events"].map((mode) => (
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
            onClick={() => updatePanel(panel.id, { viewMode: "terminal" })}
            disabled={panel.resourceType !== "pods" || !panel.selectedResource}
            className={`px-1.5 py-0.5 rounded text-xs transition-colors ${
              panel.viewMode === "terminal"
                ? "bg-blue-600 text-white"
                : panel.resourceType !== "pods" || !panel.selectedResource
                ? "text-gray-600 cursor-not-allowed"
                : "text-gray-400 hover:text-white"
            }`}
          >
            터미널
          </button>
          <button
            onClick={handleDetach}
            disabled={detached}
            className={`px-1.5 py-0.5 transition-colors ${
              detached ? "text-gray-600 cursor-not-allowed" : "text-gray-500 hover:text-white"
            }`}
            title={detached ? "이미 분리됨" : "새 창으로 분리"}
          >
            ⬡
          </button>
        </div>
      </div>
      <div className="flex flex-1 overflow-hidden">
        {isListMode && (
          <Sidebar
            selected={panel.resourceType}
            context={panel.context}
            onSelect={(type) => updatePanel(panel.id, { resourceType: type, selectedResource: null, selectedCrd: null })}
            onEventsClick={() => updatePanel(panel.id, { viewMode: "events" })}
            onSelectCrd={(crd) => updatePanel(panel.id, { resourceType: "custom", selectedCrd: crd, selectedResource: null, viewMode: "list" })}
          />
        )}
        <div className="flex-1 overflow-auto">
          {isListMode && (
            <ListView
              panel={panel}
              resources={resources}
              isLoading={isLoading}
              resourceError={resourceError}
              resourceFilter={resourceFilter}
              setResourceFilter={setResourceFilter}
              refetch={refetch}
              onSelectResource={(item) => updatePanel(panel.id, { selectedResource: item, viewMode: "detail" })}
              onClose={() => updatePanel(panel.id, { selectedResource: null, viewMode: "list" })}
              onEventsClick={() => updatePanel(panel.id, { viewMode: "events" })}
            />
          )}
          {panel.viewMode === "terminal" && (
            panel.selectedResource && panel.resourceType === "pods" ? (
              <Terminal
                panelId={panel.id}
                context={panel.context}
                namespace={panel.selectedResource.namespace ?? panel.namespace}
                podName={panel.selectedResource.name}
                container={selectedContainer || undefined}
              />
            ) : (
              <div className="p-4 text-gray-500 text-sm">
                터미널을 열 Pod를 리스트에서 선택하세요
              </div>
            )
          )}
          {panel.viewMode === "logs" && (
            <LogsView
              panel={panel}
              lines={lines}
              logError={logError}
              logFilter={logFilter}
              setLogFilter={setLogFilter}
              selectedContainer={selectedContainer}
              setSelectedContainer={setSelectedContainer}
            />
          )}
        </div>
      </div>
    </div>
  );
}
