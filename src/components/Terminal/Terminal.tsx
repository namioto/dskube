import React, { useEffect, useRef } from "react";
import type { Terminal as XTermTerminal } from "@xterm/xterm";
import { useExec } from "../../hooks/useExec";

interface Props {
  panelId: string;
  context: string;
  namespace: string;
  podName: string;
  container?: string;
}

export default function Terminal({ panelId, context, namespace, podName, container }: Props) {
  const termRef = useRef<HTMLDivElement>(null);
  const { start, sendInput, stop, onDataRef, error } = useExec(
    panelId, context, namespace, podName, container
  );

  useEffect(() => {
    let term: XTermTerminal | null = null;

    const init = async () => {
      try {
        const { Terminal: XTerm } = await import("@xterm/xterm");
        const { FitAddon } = await import("@xterm/addon-fit");

        term = new XTerm({
          theme: { background: "#0d1117", foreground: "#e6edf3", cursor: "#58a6ff" },
          fontSize: 13,
          fontFamily: "monospace",
          cursorBlink: true,
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);

        if (termRef.current) {
          term.open(termRef.current);
          fitAddon.fit();
        }

        onDataRef.current = (data: string) => term?.write(data);
        term.onData((input: string) => sendInput(input));

        await start(["sh"]);
      } catch {
        // xterm not yet installed — no-op
      }
    };

    init();
    return () => {
      stop();
      term?.dispose();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelId, podName]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-400 text-sm">
        터미널 연결 실패: {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-950">
      <div className="px-3 py-1.5 border-b border-gray-800 flex items-center gap-2">
        <span className="text-xs text-gray-400">터미널</span>
        <span className="text-xs text-gray-600">— {podName}</span>
        {container && <span className="text-xs text-gray-600">({container})</span>}
      </div>
      <div ref={termRef} className="flex-1 p-2" />
    </div>
  );
}
