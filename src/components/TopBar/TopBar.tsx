import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useClusterStore } from "../../store/clusterStore";
import { usePanelStore } from "../../store/panelStore";

export default function TopBar() {
  const {
    contexts,
    currentContext,
    namespaces,
    currentNamespace,
    setCurrentContext,
    setNamespaces,
    setCurrentNamespace,
  } = useClusterStore();

  const { panels, updatePanel } = usePanelStore();

  useEffect(() => {
    if (!currentContext) return;
    invoke<string[]>("get_namespaces", { context: currentContext })
      .then((ns) => {
        setNamespaces(ns);
        if (ns.length > 0) {
          setCurrentNamespace(ns[0]);
          const { panels, updatePanel } = usePanelStore.getState();
          panels
            .filter((panel) => panel.context === currentContext)
            .forEach((panel) => updatePanel(panel.id, { namespace: ns[0] }));
        }
      })
      .catch(console.error);
  }, [currentContext]);

  return (
    <div className="flex items-center gap-4 px-4 py-2 bg-gray-900 border-b border-gray-700 text-white text-sm select-none">
      <span className="font-bold text-blue-400 tracking-wide">dskube</span>
      <div className="flex items-center gap-2">
        <span className="text-gray-500 text-xs">cluster</span>
        <select
          value={currentContext}
          onChange={(e) => {
            const ctx = e.target.value;
            setCurrentContext(ctx);
            panels.forEach((panel) => updatePanel(panel.id, { context: ctx }));
          }}
          className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500"
        >
          {contexts.length === 0 && (
            <option value="">No clusters</option>
          )}
          {contexts.map((ctx) => (
            <option key={ctx.name} value={ctx.name}>
              {ctx.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-gray-500 text-xs">namespace</span>
        <select
          value={currentNamespace}
          onChange={(e) => {
            const ns = e.target.value;
            setCurrentNamespace(ns);
            panels
              .filter((panel) => panel.context === currentContext)
              .forEach((panel) => updatePanel(panel.id, { namespace: ns }));
          }}
          className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500"
        >
          {namespaces.map((ns) => (
            <option key={ns} value={ns}>
              {ns}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
