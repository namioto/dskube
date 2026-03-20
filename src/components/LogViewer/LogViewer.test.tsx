import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import LogViewer from "./LogViewer";

describe("LogViewer", () => {
  it("renders log lines", () => {
    render(<LogViewer lines={["line1", "line2"]} error={null} />);
    expect(screen.getByText("line1")).toBeInTheDocument();
    expect(screen.getByText("line2")).toBeInTheDocument();
  });

  it("shows error message", () => {
    render(<LogViewer lines={[]} error="connection failed" />);
    expect(screen.getByText(/connection failed/i)).toBeInTheDocument();
  });

  it("shows line count", () => {
    render(<LogViewer lines={["a", "b", "c"]} error={null} />);
    expect(screen.getByText("3 lines")).toBeInTheDocument();
  });

  it("filters lines by keyword (case-insensitive)", () => {
    render(
      <LogViewer
        lines={["INFO: server started", "ERROR: connection failed", "info: ready"]}
        error={null}
        filter="error"
      />
    );
    expect(screen.getByText("ERROR: connection failed")).toBeInTheDocument();
    expect(screen.queryByText("INFO: server started")).not.toBeInTheDocument();
  });

  it("shows all lines when filter is empty", () => {
    render(<LogViewer lines={["line1", "line2"]} error={null} filter="" />);
    expect(screen.getByText("line1")).toBeInTheDocument();
    expect(screen.getByText("line2")).toBeInTheDocument();
  });

  it("renders auto-scroll checkbox checked by default", () => {
    render(<LogViewer lines={[]} error={null} />);
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeChecked();
  });

  it("auto-scroll checkbox can be unchecked", () => {
    render(<LogViewer lines={[]} error={null} />);
    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();
  });

  it("shows filtered line count when filter is applied", () => {
    render(
      <LogViewer
        lines={["INFO: start", "ERROR: fail", "INFO: end"]}
        error={null}
        filter="INFO"
      />
    );
    // INFO 포함 2개 라인
    expect(screen.getByText("2 lines")).toBeInTheDocument();
  });
});
