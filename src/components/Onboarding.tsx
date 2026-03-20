import { useState } from "react";

interface Props {
  onRetry: () => void | Promise<void>;
  error?: string;
}

const steps = [
  {
    cmd: "kubectl config view",
    desc: "현재 kubeconfig 상태 확인",
  },
  {
    cmd: "~/.kube/config",
    desc: "kubeconfig 파일 경로 확인",
  },
  {
    cmd: "kubectl cluster-info",
    desc: "클러스터 연결 후 재시도",
  },
];

export default function Onboarding({ onRetry, error }: Props) {
  const [loading, setLoading] = useState(false);

  const handleRetry = async () => {
    setLoading(true);
    try {
      await onRetry();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white">
      <div className="w-full max-w-md mx-auto px-6">
        {/* Header */}
        <div className="flex flex-col items-center mb-8 gap-3">
          <span className="text-5xl leading-none text-gray-500 select-none">⎈</span>
          <div className="text-center">
            <h1 className="text-lg font-semibold text-white mb-1">
              kubeconfig를 찾을 수 없습니다.
            </h1>
            <p className="text-sm text-gray-400">
              ~/.kube/config 파일이 없거나 올바르지 않습니다.
            </p>
            {error && (
              <p className="text-xs text-red-400 mt-2 font-mono break-all max-w-xs text-center">
                {error}
              </p>
            )}
          </div>
        </div>

        {/* Checklist card */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg divide-y divide-gray-700 mb-6">
          {steps.map((step, i) => (
            <div key={i} className="flex items-start gap-3 px-4 py-3">
              <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border border-gray-600 flex items-center justify-center">
                <span className="text-xs text-gray-500 font-mono">{i + 1}</span>
              </span>
              <div className="min-w-0">
                <code className="block text-xs font-mono text-blue-300 mb-0.5 break-all">
                  {step.cmd}
                </code>
                <span className="text-xs text-gray-400">{step.desc}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Retry button */}
        <button
          onClick={handleRetry}
          disabled={loading}
          className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed rounded text-sm font-medium transition-colors"
        >
          {loading ? "연결 중..." : "다시 시도"}
        </button>
      </div>
    </div>
  );
}
