import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import TopBar from "./TopBar";
import { useClusterStore } from "../../store/clusterStore";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockResolvedValue([]),
}));

describe("TopBar", () => {
  it("renders context selector", () => {
    useClusterStore.setState({
      contexts: [{ name: "prod", cluster: "prod-cluster" }],
      currentContext: "prod",
    });
    render(<TopBar />);
    expect(screen.getByText("prod")).toBeInTheDocument();
  });

  it("renders namespace selector", () => {
    useClusterStore.setState({ namespaces: ["default", "kube-system"] });
    render(<TopBar />);
    expect(screen.getByText("default")).toBeInTheDocument();
  });

  it("renders dskube brand", () => {
    render(<TopBar />);
    expect(screen.getByText("dskube")).toBeInTheDocument();
  });
});
