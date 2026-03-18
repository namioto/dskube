import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
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
});
