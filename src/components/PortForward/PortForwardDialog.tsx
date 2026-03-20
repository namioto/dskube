import React, { useState } from "react";
import { usePortForward } from "../../hooks/usePortForward";

interface Props {
  context: string;
  namespace: string;
  podName: string;
  onClose: () => void;
}

export default function PortForwardDialog({ context, namespace, podName, onClose }: Props) {
  const [podPort, setPodPort] = useState("8080");
  const [localPort, setLocalPort] = useState("");
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { forwards, start, stop } = usePortForward();

  const handleStart = async () => {
    setLoading(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      const port = await start(
        context, namespace, podName,
        parseInt(podPort),
        localPort ? parseInt(localPort) : undefined
      );
      setSuccessMsg(`localhost:${port} 에서 포워딩 중`);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const myForwards = forwards.filter(f => f.pod_name === podName && f.namespace === namespace);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 w-96">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-white font-semibold">Port Forward — {podName}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>

        <div className="space-y-3 mb-4">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Pod 포트</label>
            <input
              type="number"
              value={podPort}
              onChange={e => setPodPort(e.target.value)}
              className="w-full bg-gray-800 text-white border border-gray-600 rounded px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">로컬 포트 (비워두면 자동)</label>
            <input
              type="number"
              value={localPort}
              onChange={e => setLocalPort(e.target.value)}
              placeholder="자동"
              className="w-full bg-gray-800 text-white border border-gray-600 rounded px-3 py-1.5 text-sm"
            />
          </div>
        </div>

        <button
          onClick={handleStart}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded px-3 py-2 text-sm mb-4"
        >
          {loading ? "연결 중..." : "시작"}
        </button>

        {errorMsg && (
          <div className="px-3 py-2 text-red-400 text-xs bg-red-900/20 border border-red-800 rounded mb-3">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <p className="text-xs text-green-400 mb-3">{successMsg}</p>
        )}

        {myForwards.length > 0 && (
          <div>
            <p className="text-xs text-gray-400 mb-2">활성 포워드</p>
            {myForwards.map(f => (
              <div key={f.key} className="flex justify-between items-center bg-gray-800 rounded px-3 py-1.5 mb-1">
                <span className="text-xs text-white">localhost:{f.local_port} → {f.pod_port}</span>
                <button onClick={() => stop(f.key)} className="text-xs text-red-400 hover:text-red-300">중지</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
