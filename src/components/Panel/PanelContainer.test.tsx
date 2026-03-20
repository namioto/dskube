import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import PanelContainer from "./PanelContainer";
import { usePanelStore } from "../../store/panelStore";
import { useClusterStore } from "../../store/clusterStore";
import { useResourceStore } from "../../store/resourceStore";
import { PanelState } from "../../types/k8s";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockResolvedValue([]),
}));
vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn().mockResolvedValue(() => {}),
}));

const makePanel = (id: string): PanelState => ({
  id,
  context: "ctx",
  namespace: "default",
  resourceType: "pods",
  selectedResource: null,
  viewMode: "list",
});

describe("PanelContainer", () => {
  beforeEach(() => {
    usePanelStore.setState({ panels: [], splitDirection: "horizontal" });
    useClusterStore.setState({
      contexts: [],
      currentContext: "ctx",
      namespaces: ["default"],
      currentNamespace: "default",
    });
    useResourceStore.setState({ resources: {} });
  });

  it("shows empty state when no panels", () => {
    render(<PanelContainer />);
    expect(screen.getByText(/패널을 추가하여 클러스터를 관리하세요/i)).toBeInTheDocument();
  });

  it("shows panel count 0/4 initially", () => {
    render(<PanelContainer />);
    expect(screen.getByText("0/4 panels")).toBeInTheDocument();
  });

  it("shows correct panel count when panels exist", async () => {
    usePanelStore.setState({ panels: [makePanel("p1"), makePanel("p2")], splitDirection: "horizontal" });
    render(<PanelContainer />);
    await act(async () => {});
    expect(screen.getByText("2/4 panels")).toBeInTheDocument();
  });

  it("add panel button is disabled at 4 panels", async () => {
    usePanelStore.setState({
      panels: [makePanel("p1"), makePanel("p2"), makePanel("p3"), makePanel("p4")],
      splitDirection: "horizontal",
    });
    render(<PanelContainer />);
    await act(async () => {});
    const addBtns = screen.getAllByText(/\+ 패널 추가/);
    const toolbarBtn = addBtns.find((el) => el.closest("button")?.disabled);
    expect(toolbarBtn).toBeTruthy();
  });

  it("renders split direction buttons", () => {
    render(<PanelContainer />);
    expect(screen.getByTitle("좌우 분할")).toBeInTheDocument();
    expect(screen.getByTitle("상하 분할")).toBeInTheDocument();
  });

  it("removes specific panel when × button is clicked", async () => {
    useClusterStore.setState({ currentContext: "ctx", contexts: [{ name: "ctx", cluster: "c" }] });
    usePanelStore.getState().addPanel("ctx");
    usePanelStore.getState().addPanel("ctx");
    render(<PanelContainer />);
    await act(async () => {});
    const closeButtons = screen.getAllByTitle("패널 닫기");
    expect(closeButtons).toHaveLength(2);
    fireEvent.click(closeButtons[0]);
    expect(usePanelStore.getState().panels).toHaveLength(1);
  });

  it("toggles split direction", () => {
    render(<PanelContainer />);
    expect(usePanelStore.getState().splitDirection).toBe("horizontal");

    // Click vertical split button
    const verticalButton = screen.getByTitle("상하 분할");
    fireEvent.click(verticalButton);
    expect(usePanelStore.getState().splitDirection).toBe("vertical");

    // Click horizontal split button
    const horizontalButton = screen.getByTitle("좌우 분할");
    fireEvent.click(horizontalButton);
    expect(usePanelStore.getState().splitDirection).toBe("horizontal");
  });
});
