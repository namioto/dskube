import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import TopBar from "./TopBar";
import { useClusterStore } from "../../store/clusterStore";
import { usePanelStore } from "../../store/panelStore";

const { mockInvoke } = vi.hoisted(() => ({
  mockInvoke: vi.fn().mockResolvedValue([]),
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: mockInvoke,
}));

describe("TopBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockResolvedValue([]);
    useClusterStore.setState({
      contexts: [],
      currentContext: "",
      namespaces: ["default"],
      currentNamespace: "default",
    });
    usePanelStore.setState({ panels: [], splitDirection: "horizontal" });
  });

  it("renders context selector", async () => {
    useClusterStore.setState({
      contexts: [{ name: "prod", cluster: "prod-cluster" }],
      currentContext: "prod",
    });
    mockInvoke.mockResolvedValue(["default"]);
    render(<TopBar />);
    await act(async () => {});
    expect(screen.getByText("prod")).toBeInTheDocument();
  });

  it("renders namespace selector", () => {
    // currentContext: "" → useEffect skips → no async update
    useClusterStore.setState({ namespaces: ["default", "kube-system"], currentContext: "" });
    render(<TopBar />);
    expect(screen.getByText("default")).toBeInTheDocument();
  });

  it("renders dskube brand", () => {
    render(<TopBar />);
    expect(screen.getByText("dskube")).toBeInTheDocument();
  });

  it("syncs namespace change to all panels", () => {
    usePanelStore.setState({
      panels: [
        { id: "p1", resourceType: "pods", namespace: "default", context: "prod", selectedResource: null, viewMode: "list" },
        { id: "p2", resourceType: "pods", namespace: "default", context: "prod", selectedResource: null, viewMode: "list" },
      ],
      splitDirection: "horizontal",
    });
    useClusterStore.setState({
      contexts: [{ name: "prod", cluster: "c" }],
      currentContext: "prod",
      namespaces: ["default", "kube-system"],
      currentNamespace: "default",
    });

    render(<TopBar />);
    const selects = screen.getAllByRole("combobox");
    // namespace select는 두 번째 combobox
    fireEvent.change(selects[1], { target: { value: "kube-system" } });

    const panels = usePanelStore.getState().panels;
    expect(panels[0].namespace).toBe("kube-system");
    expect(panels[1].namespace).toBe("kube-system");
  });

  it("syncs context change to all panels", async () => {
    usePanelStore.setState({
      panels: [
        { id: "p1", resourceType: "pods", namespace: "default", context: "prod", selectedResource: null, viewMode: "list" },
        { id: "p2", resourceType: "pods", namespace: "default", context: "prod", selectedResource: null, viewMode: "list" },
      ],
      splitDirection: "horizontal",
    });
    useClusterStore.setState({
      contexts: [
        { name: "prod", cluster: "c" },
        { name: "staging", cluster: "c2" },
      ],
      currentContext: "prod",
      namespaces: ["default"],
      currentNamespace: "default",
    });
    mockInvoke.mockResolvedValue(["default"]);

    render(<TopBar />);
    await act(async () => {}); // flush initial get_namespaces for "prod"

    const selects = screen.getAllByRole("combobox");
    // context select는 첫 번째 combobox
    await act(async () => {
      fireEvent.change(selects[0], { target: { value: "staging" } });
    });
    await act(async () => {}); // flush get_namespaces for "staging"

    const panels = usePanelStore.getState().panels;
    expect(panels[0].context).toBe("staging");
    expect(panels[1].context).toBe("staging");
  });

  it("calls get_namespaces when currentContext changes", async () => {
    useClusterStore.setState({
      contexts: [
        { name: "prod", cluster: "c1" },
        { name: "staging", cluster: "c2" },
      ],
      currentContext: "prod",
      namespaces: ["default"],
      currentNamespace: "default",
    });
    mockInvoke.mockResolvedValue(["default"]);

    render(<TopBar />);

    // currentContext를 직접 변경
    act(() => {
      useClusterStore.getState().setCurrentContext("staging");
    });

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("get_namespaces", { context: "staging" });
    });
  });

  it("updates panel namespaces when context changes and get_namespaces resolves", async () => {
    usePanelStore.setState({
      panels: [
        { id: "p1", resourceType: "pods", namespace: "default", context: "prod", selectedResource: null, viewMode: "list" },
        { id: "p2", resourceType: "pods", namespace: "default", context: "prod", selectedResource: null, viewMode: "list" },
      ],
      splitDirection: "horizontal",
    });
    useClusterStore.setState({
      contexts: [
        { name: "prod", cluster: "c1" },
        { name: "staging", cluster: "c2" },
      ],
      currentContext: "prod",
      namespaces: ["default"],
      currentNamespace: "default",
    });
    mockInvoke.mockResolvedValue(["staging-ns", "staging-system"]);

    render(<TopBar />);
    await act(async () => {}); // flush initial get_namespaces for "prod"

    act(() => {
      useClusterStore.getState().setCurrentContext("staging");
    });
    await act(async () => {}); // flush get_namespaces for "staging"

    await waitFor(() => {
      const panels = usePanelStore.getState().panels;
      expect(panels[0].namespace).toBe("staging-ns");
      expect(panels[1].namespace).toBe("staging-ns");
    });
  });
});
