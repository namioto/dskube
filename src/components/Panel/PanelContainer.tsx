import { invoke } from "@tauri-apps/api/core";
import { usePanelStore } from "../../store/panelStore";
import { useClusterStore } from "../../store/clusterStore";
import { useResourceStore } from "../../store/resourceStore";
import Panel from "./Panel";

export default function PanelContainer() {
  const { panels, splitDirection, addPanel, removePanel, setSplitDirection } =
    usePanelStore();
  const { currentContext, currentNamespace } = useClusterStore();
  const clearPanel = useResourceStore((s) => s.clearPanel);

  const handleAddPanel = () => {
    addPanel(currentContext, currentNamespace);
  };

  const handleRemovePanel = (panelId: string) => {
    invoke("cmd_stop_watch", { panelId }).catch(console.error);
    invoke("cmd_stop_logs", { panelId }).catch(console.error);
    clearPanel(panelId);
    removePanel(panelId);
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div
        className={`flex flex-1 overflow-hidden ${
          splitDirection === "horizontal" ? "flex-row" : "flex-col"
        }`}
      >
        {panels.map((panel, idx) => (
          <div
            key={panel.id}
            className={`relative flex-1 overflow-hidden ${
              splitDirection === "horizontal" && idx < panels.length - 1
                ? "border-r border-gray-700"
                : ""
            } ${
              splitDirection === "vertical" && idx < panels.length - 1
                ? "border-b border-gray-700"
                : ""
            }`}
            style={{ minWidth: 0, minHeight: 0 }}
          >
            <button
              onClick={() => handleRemovePanel(panel.id)}
              className="absolute top-1 right-1 z-10 w-5 h-5 flex items-center justify-center text-gray-500 hover:text-white hover:bg-gray-700 rounded text-xs"
              title="패널 닫기"
            >
              ×
            </button>
            <Panel panel={panel} />
          </div>
        ))}
        {panels.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500 gap-4">
            <span className="text-4xl">⎈</span>
            <p className="text-sm">패널을 추가하여 클러스터를 관리하세요</p>
            <button
              onClick={handleAddPanel}
              className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-500 text-white text-sm transition-colors"
            >
              + 첫 패널 추가
            </button>
          </div>
        )}
      </div>

      {/* Bottom toolbar */}
      <div className="flex items-center gap-2 px-4 py-1.5 bg-gray-800 border-t border-gray-700 text-xs shrink-0">
        <button
          onClick={handleAddPanel}
          disabled={panels.length >= 4}
          className="px-2 py-1 bg-blue-600 rounded disabled:opacity-40 hover:bg-blue-500 transition-colors text-white"
        >
          + 패널 추가
        </button>
        <div className="flex gap-1 ml-4">
          <button
            onClick={() => setSplitDirection("horizontal")}
            className={`px-2 py-1 rounded transition-colors ${
              splitDirection === "horizontal"
                ? "bg-gray-600 text-white"
                : "text-gray-400 hover:text-white"
            }`}
            title="좌우 분할"
          >
            ⟺
          </button>
          <button
            onClick={() => setSplitDirection("vertical")}
            className={`px-2 py-1 rounded transition-colors ${
              splitDirection === "vertical"
                ? "bg-gray-600 text-white"
                : "text-gray-400 hover:text-white"
            }`}
            title="상하 분할"
          >
            ⟟
          </button>
        </div>
        <span className="ml-auto text-gray-500">
          {panels.length}/4 panels
        </span>
      </div>
    </div>
  );
}
