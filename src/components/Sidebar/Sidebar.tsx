import { ResourceType } from "../../types/k8s";

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
];

interface Props {
  selected: ResourceType;
  onSelect: (type: ResourceType) => void;
}

export default function Sidebar({ selected, onSelect }: Props) {
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
    </div>
  );
}
