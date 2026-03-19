import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "./App";
import { usePanelStore } from "./store/panelStore";
import { useClusterStore } from "./store/clusterStore";
import { useResourceStore } from "./store/resourceStore";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockResolvedValue([]),
}));
vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn().mockResolvedValue(() => {}),
}));

describe("App", () => {
  beforeEach(() => {
    usePanelStore.setState({ panels: [], splitDirection: "horizontal" });
    useClusterStore.setState({
      contexts: [],
      currentContext: "",
      namespaces: ["default"],
      currentNamespace: "default",
    });
    useResourceStore.setState({ resources: {} });
  });

  it("renders without crashing", () => {
    expect(() => render(<App />)).not.toThrow();
  });

  it("shows dskube brand in TopBar", () => {
    render(<App />);
    expect(screen.getByText("dskube")).toBeInTheDocument();
  });

  it("shows empty panel state on first load", () => {
    render(<App />);
    expect(screen.getByText(/패널을 추가하여 클러스터를 관리하세요/i)).toBeInTheDocument();
  });

  it("shows cluster selector in TopBar", () => {
    render(<App />);
    expect(screen.getByText("cluster")).toBeInTheDocument();
  });

  it("shows namespace selector in TopBar", () => {
    render(<App />);
    expect(screen.getByText("namespace")).toBeInTheDocument();
  });

  it("shows 0/4 panels initially", () => {
    render(<App />);
    expect(screen.getByText("0/4 panels")).toBeInTheDocument();
  });
});
