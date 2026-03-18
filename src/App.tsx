import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import TopBar from "./components/TopBar/TopBar";
import PanelContainer from "./components/Panel/PanelContainer";
import Panel from "./components/Panel/Panel";
import { usePanelStore } from "./store/panelStore";
import { useClusterStore } from "./store/clusterStore";
import { PanelState } from "./types/k8s";

// 분리된 창 컴포넌트
function DetachedWindow({ panelId }: { panelId: string }) {
  const panels = usePanelStore((s) => s.panels);

  useEffect(() => {
    invoke<PanelState | null>("get_panel_init_state", { panelId }).then(
      (state) => {
        if (state) usePanelStore.setState({ panels: [state] });
      }
    );
  }, [panelId]);

  const panel = panels[0];
  return panel ? (
    <div className="h-screen bg-gray-900 overflow-hidden">
      <Panel panel={panel} />
    </div>
  ) : (
    <div className="h-screen flex items-center justify-center text-gray-500 bg-gray-900">
      패널 로딩 중...
    </div>
  );
}

// 메인 앱
function MainApp() {
  const { addPanel, panels } = usePanelStore();
  const currentContext = useClusterStore((s) => s.currentContext);

  useEffect(() => {
    if (currentContext && panels.length === 0) {
      addPanel(currentContext);
    }
  }, [currentContext]);

  return (
    <div className="flex flex-col h-screen bg-gray-900 overflow-hidden">
      <TopBar />
      <PanelContainer />
    </div>
  );
}

export default function App() {
  const params = new URLSearchParams(window.location.search);
  const detachedPanelId = params.get("panel");

  if (detachedPanelId) {
    return <DetachedWindow panelId={detachedPanelId} />;
  }

  return <MainApp />;
}
