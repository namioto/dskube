import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useClusterStore } from "../../store/clusterStore";
import { ContextInfo } from "../../types/k8s";

export default function TopBar() {
  const {
    contexts,
    currentContext,
    namespaces,
    setContexts,
    setCurrentContext,
    setNamespaces,
  } = useClusterStore();

  useEffect(() => {
    invoke<ContextInfo[]>("get_contexts")
      .then((ctxs) => {
        setContexts(ctxs);
        if (ctxs.length > 0 && !currentContext) {
          setCurrentContext(ctxs[0].name);
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!currentContext) return;
    invoke<string[]>("get_namespaces", { context: currentContext })
      .then(setNamespaces)
      .catch(console.error);
  }, [currentContext]);

  return (
    <div className="flex items-center gap-4 px-4 py-2 bg-gray-900 border-b border-gray-700 text-white text-sm select-none">
      <span className="font-bold text-blue-400 tracking-wide">dskube</span>
      <div className="flex items-center gap-2">
        <span className="text-gray-500 text-xs">cluster</span>
        <select
          value={currentContext}
          onChange={(e) => setCurrentContext(e.target.value)}
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
        <select className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500">
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
