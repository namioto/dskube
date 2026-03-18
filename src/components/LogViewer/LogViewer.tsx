import { useEffect, useRef, useState } from "react";

interface Props {
  lines: string[];
  error: string | null;
  filter?: string;
}

export default function LogViewer({ lines, error, filter }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (autoScroll) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [lines.length, autoScroll]);

  const filtered = filter
    ? lines.filter((l) => l.includes(filter))
    : lines;

  if (error) {
    return (
      <div className="p-4 text-red-400 text-sm">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-2 py-1 bg-gray-900 border-b border-gray-700 text-xs text-gray-400">
        <span>{filtered.length} lines</span>
        <label className="flex items-center gap-1 ml-auto cursor-pointer">
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
            className="accent-blue-500"
          />
          Auto-scroll
        </label>
      </div>
      <div className="flex-1 bg-black text-green-400 font-mono text-xs overflow-auto p-2">
        {filtered.map((line, i) => (
          <div key={i} className="whitespace-pre-wrap leading-5">
            {line}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
