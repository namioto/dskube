import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import yaml from "js-yaml";
import { ResourceItem } from "../../types/k8s";

interface Props {
  resource: ResourceItem;
  context: string;
  onClose: () => void;
}

export default function ResourceDetail({ resource, context, onClose }: Props) {
  const yamlText = yaml.dump(resource.raw);
  const [editedYaml, setEditedYaml] = useState(yamlText);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleApply = async () => {
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
            disabled={saving}
            className="px-3 py-1 text-xs bg-blue-600 rounded hover:bg-blue-500 disabled:opacity-40 transition-colors"
          >
            {saving ? "Applying..." : "Apply"}
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1 text-xs bg-gray-700 rounded hover:bg-gray-600 transition-colors"
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
      <textarea
        value={editedYaml}
        onChange={(e) => setEditedYaml(e.target.value)}
        className="flex-1 p-4 bg-gray-950 text-green-300 font-mono text-xs resize-none outline-none"
        spellCheck={false}
      />
    </div>
  );
}
