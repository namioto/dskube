import { useState } from "react";
import { ResourceType } from "../../types/k8s";
import { useCrds, CrdInfo } from "../../hooks/useCrds";

const RESOURCE_TYPES: { label: string; value: ResourceType }[] = [
  { label: "Pods", value: "pods" },
  { label: "Deployments", value: "deployments" },
  { label: "Services", value: "services" },
  { label: "ConfigMaps", value: "configmaps" },
  { label: "Secrets", value: "secrets" },
  { label: "StatefulSets", value: "statefulsets" },
  { label: "DaemonSets", value: "daemonsets" },
  { label: "Ingress", value: "ingress" },
  { label: "Namespaces", value: "namespaces" },
  { label: "Nodes", value: "nodes" },
  { label: "Jobs", value: "jobs" },
  { label: "CronJobs", value: "cronjobs" },
  { label: "PersistentVolumes", value: "persistentvolumes" },
  { label: "PersistentVolumeClaims", value: "persistentvolumeclaims" },
];

interface Props {
  selected: ResourceType;
  onSelect: (type: ResourceType) => void;
  onEventsClick?: () => void;
  onSelectCrd?: (crd: CrdInfo) => void;
  context?: string;
}

export default function Sidebar({ selected, onSelect, onEventsClick, onSelectCrd, context }: Props) {
  const [crdOpen, setCrdOpen] = useState(false);
  const { crds, loading } = useCrds(context ?? "");

  return (
    <div className="w-40 bg-gray-900 border-r border-gray-700 flex flex-col py-1 shrink-0">
      {RESOURCE_TYPES.map(({ label, value }) => (
        <button
          key={value}
          onClick={() => onSelect(value)}
          className={`px-3 py-1.5 text-left text-xs hover:bg-gray-700 transition-colors ${
            selected === value
              ? "bg-gray-700 text-blue-400 font-medium"
              : "text-gray-400"
          }`}
        >
          {label}
        </button>
      ))}
      <div className="border-t border-gray-700 my-1" />
      <button
        onClick={onEventsClick}
        className="px-3 py-1.5 text-left text-xs hover:bg-gray-700 transition-colors text-gray-400"
      >
        Events
      </button>
      <div className="border-t border-gray-700 my-1" />
      <button
        onClick={() => setCrdOpen(o => !o)}
        className="px-3 py-1.5 text-left text-xs hover:bg-gray-700 transition-colors text-gray-500 flex items-center justify-between"
      >
        <span>Custom</span>
        <span>{crdOpen ? "▲" : "▼"}</span>
      </button>
      {crdOpen && (
        loading
          ? <span className="px-3 py-1 text-xs text-gray-600">로딩 중...</span>
          : crds.length === 0
            ? <span className="px-3 py-1 text-xs text-gray-600">CRD 없음</span>
            : crds.map(crd => (
              <button
                key={crd.name}
                onClick={() => { onSelect("custom"); onSelectCrd?.(crd); }}
                className="px-4 py-1 text-left text-xs hover:bg-gray-700 transition-colors text-gray-400 truncate"
                title={crd.name}
              >
                {crd.kind}
              </button>
            ))
      )}
    </div>
  );
}
