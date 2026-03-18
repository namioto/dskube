import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import PanelContainer from "./PanelContainer";
import { usePanelStore } from "../../store/panelStore";
import { useClusterStore } from "../../store/clusterStore";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockResolvedValue([]),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn().mockResolvedValue(() => {}),
}));

describe("PanelContainer", () => {
  it("shows empty state when no panels", () => {
    usePanelStore.setState({ panels: [] });
    useClusterStore.setState({ currentContext: "test-ctx" });
    render(<PanelContainer />);
    expect(screen.getByText(/패널을 추가/i)).toBeInTheDocument();
  });

  it("shows add panel button", () => {
    usePanelStore.setState({ panels: [] });
    render(<PanelContainer />);
    expect(screen.getAllByText(/패널 추가/i).length).toBeGreaterThan(0);
  });
});
