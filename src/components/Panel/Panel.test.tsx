import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import Panel from "./Panel";
import { usePanelStore } from "../../store/panelStore";
import { useResourceStore } from "../../store/resourceStore";
import { useClusterStore } from "../../store/clusterStore";
import { PanelState } from "../../types/k8s";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockResolvedValue([]),
}));
vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn().mockResolvedValue(() => {}),
}));

const BASE_PANEL: PanelState = {
  id: "panel-abc",
  context: "k3s-default",
  namespace: "default",
  resourceType: "pods",
  selectedResource: null,
  viewMode: "list",
};

describe("Panel", () => {
  beforeEach(() => {
    useResourceStore.setState({ resources: {} });
    useClusterStore.setState({
      contexts: [{ name: "k3s-default", cluster: "k3s" }],
      namespaces: ["default", "kube-system"],
      currentContext: "k3s-default",
      currentNamespace: "default",
    });
    usePanelStore.setState({ panels: [BASE_PANEL] });
  });

  // ── 회귀 테스트 ──────────────────────────────────────────────────────────
  // Zustand v5 + React 18 useSyncExternalStore tearing 버그
  // selector 안에서 `?? []` 사용 시 매 호출마다 새 배열 참조 생성
  // → Object.is([], []) = false → React가 concurrent mutation으로 오인 → 무한 루프
  it("[regression] renders without crash when resources are empty", () => {
    expect(() => render(<Panel panel={BASE_PANEL} />)).not.toThrow();
  });

  it("[regression] renders without crash when resources exist", () => {
    useResourceStore.setState({
      resources: {
        "panel-abc": [
          { name: "nginx", namespace: "default", status: "Running", raw: {} },
        ],
      },
    });
    expect(() => render(<Panel panel={BASE_PANEL} />)).not.toThrow();
  });

  it("[regression] re-render does not cause infinite loop", () => {
    const { rerender } = render(<Panel panel={BASE_PANEL} />);
    expect(() => rerender(<Panel panel={{ ...BASE_PANEL }} />)).not.toThrow();
  });

  // ── 렌더링 ────────────────────────────────────────────────────────────────
  it("shows context in dropdown", () => {
    render(<Panel panel={BASE_PANEL} />);
    expect(screen.getByDisplayValue("k3s-default")).toBeInTheDocument();
  });

  it("shows namespace in dropdown", () => {
    render(<Panel panel={BASE_PANEL} />);
    expect(screen.getByDisplayValue("default")).toBeInTheDocument();
  });

  it("shows all view mode buttons", () => {
    render(<Panel panel={BASE_PANEL} />);
    expect(screen.getByText("list")).toBeInTheDocument();
    expect(screen.getByText("detail")).toBeInTheDocument();
    expect(screen.getByText("logs")).toBeInTheDocument();
  });

  it("shows resource items in list view", () => {
    useResourceStore.setState({
      resources: {
        "panel-abc": [
          { name: "my-pod", namespace: "default", status: "Running", raw: {} },
          { name: "other-pod", namespace: "default", status: "Pending", raw: {} },
        ],
      },
    });
    render(<Panel panel={BASE_PANEL} />);
    expect(screen.getByText("my-pod")).toBeInTheDocument();
    expect(screen.getByText("other-pod")).toBeInTheDocument();
  });

  it("shows detail placeholder when viewMode=detail and no selection", () => {
    render(<Panel panel={{ ...BASE_PANEL, viewMode: "detail" }} />);
    expect(screen.getByText(/리스트에서 리소스를 선택하세요/i)).toBeInTheDocument();
  });

  it("shows log placeholder when viewMode=logs and no pod selected", () => {
    render(<Panel panel={{ ...BASE_PANEL, viewMode: "logs" }} />);
    expect(screen.getByText(/Pod를 리스트에서 선택/i)).toBeInTheDocument();
  });

  it("hides sidebar in logs view", () => {
    render(<Panel panel={{ ...BASE_PANEL, viewMode: "logs" }} />);
    expect(screen.queryByText("Pods")).not.toBeInTheDocument();
  });

  it("shows sidebar in list view", () => {
    render(<Panel panel={BASE_PANEL} />);
    expect(screen.getByText("Pods")).toBeInTheDocument();
  });

  it("shows no-context selector when contexts is empty", () => {
    useClusterStore.setState({
      contexts: [],
      namespaces: [],
      currentContext: "",
      currentNamespace: "default",
    });
    render(<Panel panel={{ ...BASE_PANEL, context: "" }} />);
    expect(screen.getByText("no cluster")).toBeInTheDocument();
  });
});
