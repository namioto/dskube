import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { formatAge } from "../../utils/formatAge";

interface EventItem {
  type_: string;
  reason: string;
  message: string;
  object_name: string;
  object_kind: string;
  count: number;
  age: string | null;
  namespace: string | null;
}

interface Props {
  context: string;
  namespace?: string;
  resourceName?: string;
  resourceKind?: string;
}

export default function EventsViewer({ context, namespace, resourceName, resourceKind }: Props) {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!context) return;
    setIsLoading(true);
    setError(null);
    invoke<EventItem[]>("cmd_list_events", {
      context,
      namespace: namespace || null,
      resourceName: resourceName || null,
      resourceKind: resourceKind || null,
    })
      .then(setEvents)
      .catch((e) => setError(String(e)))
      .finally(() => setIsLoading(false));
  }, [context, namespace, resourceName, resourceKind]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 text-sm">
        <span className="animate-pulse">이벤트 로딩 중...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-400 text-sm">{error}</div>
    );
  }

  return (
    <div className="overflow-auto h-full">
      <table className="w-full text-xs text-left">
        <thead className="sticky top-0 bg-gray-800 text-gray-400 border-b border-gray-700">
          <tr>
            <th className="px-3 py-2 w-20">Type</th>
            <th className="px-3 py-2">Reason</th>
            <th className="px-3 py-2">Object</th>
            <th className="px-3 py-2 flex-1">Message</th>
            <th className="px-3 py-2 w-12 text-right">Count</th>
            <th className="px-3 py-2 w-12 text-right">Age</th>
          </tr>
        </thead>
        <tbody>
          {events.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-3 py-8 text-center text-gray-500">
                이벤트 없음
              </td>
            </tr>
          ) : (
            events.map((e, i) => (
              <tr key={`${e.object_kind}-${e.object_name}-${e.reason}-${i}`} className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
                <td className={`px-3 py-1.5 font-medium ${e.type_ === "Warning" ? "text-yellow-400" : "text-gray-400"}`}>
                  {e.type_}
                </td>
                <td className="px-3 py-1.5 text-gray-300">{e.reason}</td>
                <td className="px-3 py-1.5 text-gray-400">
                  <span className="text-gray-500">{e.object_kind}/</span>
                  <span className="text-gray-300">{e.object_name}</span>
                </td>
                <td className="px-3 py-1.5 text-gray-300 max-w-xs truncate" title={e.message}>
                  {e.message}
                </td>
                <td className="px-3 py-1.5 text-right text-gray-400">{e.count}</td>
                <td className="px-3 py-1.5 text-right text-gray-500">{formatAge(e.age)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
