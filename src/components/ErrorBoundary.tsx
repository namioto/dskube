import React from "react";

interface State {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            height: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "#111827",
            color: "white",
            padding: "2rem",
            gap: "1rem",
            fontFamily: "monospace",
          }}
        >
          <div style={{ color: "#f87171", fontSize: "1.1rem", fontWeight: "bold" }}>
            앱 초기화 오류
          </div>
          <pre
            style={{
              fontSize: "0.75rem",
              color: "#d1d5db",
              background: "#1f2937",
              padding: "1rem",
              borderRadius: "0.5rem",
              maxWidth: "600px",
              overflow: "auto",
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
            }}
          >
            {this.state.error.message}
            {"\n\n"}
            {this.state.error.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
