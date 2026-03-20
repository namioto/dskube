import { PanelState } from "../../types/k8s";
import LogViewer from "../LogViewer/LogViewer";

interface Props {
  panel: PanelState;
  lines: string[];
  logError: string | null;
  logFilter: string;
  setLogFilter: (v: string) => void;
  selectedContainer: string;
  setSelectedContainer: (v: string) => void;
}

export default function LogsView({
  panel,
  lines,
  logError,
  logFilter,
  setLogFilter,
  selectedContainer,
  setSelectedContainer,
}: Props) {
  return (
    <div className="flex flex-col h-full">
      {panel.selectedResource ? (
        <>
          {panel.resourceType !== "pods" && (
            <div className="px-4 py-2 text-yellow-400 text-xs bg-yellow-900/20 border-b border-yellow-800">
              ⚠ 로그는 Pod에서만 지원됩니다.
            </div>
          )}
          <div className="flex items-center gap-2 px-3 py-1 bg-gray-800 border-b border-gray-700 shrink-0">
            <span className="text-xs text-gray-400">
              {panel.selectedResource.name}
            </span>
            {(() => {
              const specContainers = (panel.selectedResource?.raw as any)?.spec?.containers?.map((c: any) => c.name as string) ?? [];
              const initContainers = (panel.selectedResource?.raw as any)?.spec?.initContainers?.map((c: any) => c.name as string) ?? [];
              const containers = [...specContainers, ...initContainers];
              return containers.length > 1 && (
                <select
                  value={selectedContainer}
                  onChange={(e) => setSelectedContainer(e.target.value)}
                  className="bg-gray-700 border border-gray-600 rounded px-2 py-0.5 text-xs outline-none"
                >
                  <option value="">all containers</option>
                  {containers.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              );
            })()}
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
  );
}
