import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import yaml from "js-yaml";
import { ResourceItem } from "../../types/k8s";
import { useRbac } from "../../hooks/useRbac";
import PortForwardDialog from "../PortForward/PortForwardDialog";

interface Props {
  resource: ResourceItem;
  context: string;
  onClose: () => void;
}

const KIND_TO_RESOURCE_TYPE: Record<string, string> = {
  Pod: "pods",
  Deployment: "deployments",
  StatefulSet: "statefulsets",
  DaemonSet: "daemonsets",
  Job: "jobs",
  CronJob: "cronjobs",
  Service: "services",
  ConfigMap: "configmaps",
  Secret: "secrets",
  Ingress: "ingress",
  Namespace: "namespaces",
  Node: "nodes",
  PersistentVolume: "persistentvolumes",
  PersistentVolumeClaim: "persistentvolumeclaims",
};

const SCALABLE_KINDS = ["Deployment", "StatefulSet"];

export default function ResourceDetail({ resource, context, onClose }: Props) {
  const yamlText = yaml.dump(resource.raw);
  const [editedYaml, setEditedYaml] = useState(yamlText);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showPortForward, setShowPortForward] = useState(false);

  const kind = resource.raw.kind as string | undefined;
  const namespace = resource.namespace;
  const resourceType = KIND_TO_RESOURCE_TYPE[kind ?? ""] ?? kind?.toLowerCase() + "s";
  const isScalable = kind != null && SCALABLE_KINDS.includes(kind);
  const initialReplicas =
    isScalable
      ? ((resource.raw as Record<string, unknown>).spec as Record<string, unknown> | undefined)?.replicas as number | undefined ?? 1
      : 1;
  const [replicas, setReplicas] = useState(initialReplicas);

  const canDelete = useRbac(context, resourceType, "delete", namespace);
  const canUpdate = useRbac(context, resourceType, "update", namespace);

  const handleApply = async () => {
    if (!window.confirm("정말 적용하시겠습니까?")) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await invoke("cmd_apply_resource", { context, yaml: editedYaml });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("정말 삭제하시겠습니까?")) return;
    setIsDeleting(true);
    try {
      await invoke("cmd_delete_resource", {
        context,
        resourceType,
        name: resource.name,
        namespace,
      });
      onClose();
    } catch (e) {
      alert(String(e));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleScale = async () => {
    try {
      await invoke("cmd_scale_resource", {
        context,
        resourceType,
        name: resource.name,
        namespace,
        replicas,
      });
      alert("스케일 조정 완료");
    } catch (e) {
      alert(String(e));
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700 shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{resource.name}</span>
          {resource.namespace && (
            <span className="text-xs text-gray-400 bg-gray-700 px-1.5 py-0.5 rounded">
              {resource.namespace}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {saved && (
            <span className="text-xs text-green-400 flex items-center">
              ✓ Applied
            </span>
          )}
          <button
            onClick={handleApply}
            disabled={saving || isDeleting || !canUpdate}
            className="px-3 py-1 text-xs bg-blue-600 rounded hover:bg-blue-500 disabled:opacity-40 transition-colors"
          >
            {saving ? "Applying..." : "Apply"}
          </button>
          {kind === "Pod" && (
            <button
              onClick={() => setShowPortForward(true)}
              disabled={saving || isDeleting}
              className="px-3 py-1 text-xs bg-purple-700 rounded hover:bg-purple-600 disabled:opacity-40 transition-colors"
            >
              Port Forward
            </button>
          )}
          <button
            onClick={handleDelete}
            disabled={saving || isDeleting || !canDelete}
            className="px-3 py-1 text-xs bg-red-700 rounded hover:bg-red-600 disabled:opacity-40 transition-colors"
          >
            {isDeleting ? "삭제 중..." : "삭제"}
          </button>
          <button
            onClick={onClose}
            disabled={saving || isDeleting}
            className="px-3 py-1 text-xs bg-gray-700 rounded hover:bg-gray-600 disabled:opacity-40 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
      {error && (
        <div className="px-4 py-2 text-red-400 text-xs bg-red-900/20 border-b border-red-800">
          {error}
        </div>
      )}
      {isScalable && (
        <div className="flex items-center gap-2 px-4 py-2 bg-gray-800 border-b border-gray-700 shrink-0">
          <span className="text-xs text-gray-400">Replicas:</span>
          <input
            type="number"
            min={0}
            value={replicas}
            onChange={(e) => setReplicas(Number(e.target.value))}
            className="w-16 px-2 py-0.5 text-xs bg-gray-700 text-white rounded outline-none border border-gray-600 focus:border-blue-500"
          />
          <button
            onClick={handleScale}
            className="px-3 py-1 text-xs bg-green-700 rounded hover:bg-green-600 transition-colors"
          >
            스케일 적용
          </button>
        </div>
      )}
      <textarea
        value={editedYaml}
        onChange={(e) => setEditedYaml(e.target.value)}
        className="flex-1 p-4 bg-gray-950 text-green-300 font-mono text-xs resize-none outline-none"
        spellCheck={false}
      />
      {showPortForward && kind === "Pod" && namespace && (
        <PortForwardDialog
          context={context}
          namespace={namespace}
          podName={resource.name}
          onClose={() => setShowPortForward(false)}
        />
      )}
    </div>
  );
}
