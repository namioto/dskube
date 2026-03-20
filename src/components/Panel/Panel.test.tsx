import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
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
  it("[regression] renders without crash when resources are empty", async () => {
    expect(() => render(<Panel panel={BASE_PANEL} />)).not.toThrow();
    await act(async () => {});
  });

  it("[regression] renders without crash when resources exist", async () => {
    useResourceStore.setState({
      resources: {
        "panel-abc": [
          { name: "nginx", namespace: "default", status: "Running", raw: {} },
        ],
      },
    });
    expect(() => render(<Panel panel={BASE_PANEL} />)).not.toThrow();
    await act(async () => {});
  });

  it("[regression] re-render does not cause infinite loop", async () => {
    const { rerender } = render(<Panel panel={BASE_PANEL} />);
    await act(async () => {});
    expect(() => rerender(<Panel panel={{ ...BASE_PANEL }} />)).not.toThrow();
    await act(async () => {});
  });

  // ── 렌더링 ────────────────────────────────────────────────────────────────
  it("shows context in dropdown", async () => {
    render(<Panel panel={BASE_PANEL} />);
    await act(async () => {});
    expect(screen.getByDisplayValue("k3s-default")).toBeInTheDocument();
  });

  it("shows namespace in dropdown", async () => {
    render(<Panel panel={BASE_PANEL} />);
    await act(async () => {});
    expect(screen.getByDisplayValue("default")).toBeInTheDocument();
  });

  it("shows all view mode buttons", async () => {
    render(<Panel panel={BASE_PANEL} />);
    await act(async () => {});
    expect(screen.getByText("list")).toBeInTheDocument();
    expect(screen.getByText("detail")).toBeInTheDocument();
    expect(screen.getByText("logs")).toBeInTheDocument();
  });

  it("shows resource items in list view", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    const mockItems = [
      { name: "my-pod", namespace: "default", status: "Running", raw: {} },
      { name: "other-pod", namespace: "default", status: "Pending", raw: {} },
    ];
    (invoke as ReturnType<typeof vi.fn>).mockImplementation((cmd: string) => {
      if (cmd === "cmd_list_resources") return Promise.resolve({ items: mockItems, continue_token: undefined });
      return Promise.resolve([]);
    });
    render(<Panel panel={BASE_PANEL} />);
    await act(async () => {});
    expect(screen.getByText("my-pod")).toBeInTheDocument();
    expect(screen.getByText("other-pod")).toBeInTheDocument();
  });

  it("shows detail placeholder when viewMode=detail and no selection", async () => {
    render(<Panel panel={{ ...BASE_PANEL, viewMode: "detail" }} />);
    await act(async () => {});
    expect(screen.getByText(/리스트에서 리소스를 선택하세요/i)).toBeInTheDocument();
  });

  it("shows log placeholder when viewMode=logs and no pod selected", async () => {
    render(<Panel panel={{ ...BASE_PANEL, viewMode: "logs" }} />);
    await act(async () => {});
    expect(screen.getByText(/Pod를 리스트에서 선택/i)).toBeInTheDocument();
  });

  it("hides sidebar in logs view", async () => {
    render(<Panel panel={{ ...BASE_PANEL, viewMode: "logs" }} />);
    await act(async () => {});
    expect(screen.queryByText("Pods")).not.toBeInTheDocument();
  });

  it("shows sidebar in list view", async () => {
    render(<Panel panel={BASE_PANEL} />);
    await act(async () => {});
    expect(screen.getByText("Pods")).toBeInTheDocument();
  });

  it("shows no-context selector when contexts is empty", async () => {
    useClusterStore.setState({
      contexts: [],
      namespaces: [],
      currentContext: "",
      currentNamespace: "default",
    });
    render(<Panel panel={{ ...BASE_PANEL, context: "" }} />);
    await act(async () => {});
    expect(screen.getByText("no cluster")).toBeInTheDocument();
  });

  it("shows warning in logs mode for non-pod resource", async () => {
    const panelId = "warn-panel";
    usePanelStore.setState({
      panels: [{
        id: panelId,
        resourceType: "deployments", // pods가 아님
        namespace: "default",
        context: "ctx",
        selectedResource: { name: "my-deploy", namespace: "default", status: undefined, raw: {} },
        viewMode: "logs",
      }],
      splitDirection: "horizontal",
    });

    const panel = usePanelStore.getState().panels[0];
    render(<Panel panel={panel} />);
    await act(async () => {});
    expect(screen.getByText(/로그는 Pod에서만 지원됩니다/)).toBeInTheDocument();
  });

  it("switches to detail view when resource is selected from list", async () => {
    const panelId = "test-panel";
    usePanelStore.setState({
      panels: [{
        id: panelId,
        resourceType: "pods",
        namespace: "default",
        context: "ctx",
        selectedResource: null,
        viewMode: "list",
      }],
      splitDirection: "horizontal",
    });
    const { invoke } = await import("@tauri-apps/api/core");
    const mockItems = [{ name: "my-pod", namespace: "default", status: "Running", raw: {} }];
    (invoke as ReturnType<typeof vi.fn>).mockImplementation((cmd: string) => {
      if (cmd === "cmd_list_resources") return Promise.resolve({ items: mockItems, continue_token: undefined });
      return Promise.resolve([]);
    });

    const panel = usePanelStore.getState().panels[0];
    render(<Panel panel={panel} />);
    await act(async () => {});
    fireEvent.click(screen.getByText("my-pod"));
    expect(usePanelStore.getState().panels[0].viewMode).toBe("detail");
    expect(usePanelStore.getState().panels[0].selectedResource?.name).toBe("my-pod");
  });

  it("shows container select for multi-container pod in logs mode", async () => {
    const panelId = "mc-panel";
    usePanelStore.setState({
      panels: [{
        id: panelId,
        resourceType: "pods",
        namespace: "default",
        context: "ctx",
        selectedResource: {
          name: "multi-pod",
          namespace: "default",
          status: "Running",
          raw: {
            spec: {
              containers: [
                { name: "app" },
                { name: "sidecar" },
              ],
            },
          },
        },
        viewMode: "logs",
      }],
      splitDirection: "horizontal",
    });

    const panel = usePanelStore.getState().panels[0];
    render(<Panel panel={panel} />);
    await act(async () => {});
    expect(screen.getByText("all containers")).toBeInTheDocument();
    expect(screen.getByText("app")).toBeInTheDocument();
    expect(screen.getByText("sidecar")).toBeInTheDocument();
  });

  it("does not show container select for single-container pod", async () => {
    const panelId = "sc-panel";
    usePanelStore.setState({
      panels: [{
        id: panelId,
        resourceType: "pods",
        namespace: "default",
        context: "ctx",
        selectedResource: {
          name: "single-pod",
          namespace: "default",
          status: "Running",
          raw: {
            spec: {
              containers: [{ name: "app" }],
            },
          },
        },
        viewMode: "logs",
      }],
      splitDirection: "horizontal",
    });

    const panel = usePanelStore.getState().panels[0];
    render(<Panel panel={panel} />);
    await act(async () => {});
    expect(screen.queryByText("all containers")).not.toBeInTheDocument();
  });

  it("shows permission error message for 403 error", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    (invoke as ReturnType<typeof vi.fn>).mockImplementation((cmd: string) => {
      if (cmd === "cmd_list_resources") return Promise.reject("403 Forbidden");
      return Promise.resolve(undefined);
    });

    render(<Panel panel={BASE_PANEL} />);
    await act(async () => {});

    await waitFor(() => {
      expect(screen.getByText(/권한이 없습니다/i)).toBeInTheDocument();
    });
  });

  it("resets resourceFilter when resourceType changes", async () => {
    // panelStore에 pods 패널 추가
    const panelId = "filter-reset-panel";
    const initialPanel: PanelState = {
      id: panelId,
      resourceType: "pods",
      namespace: "default",
      context: "ctx",
      selectedResource: null,
      viewMode: "list",
    };
    usePanelStore.setState({ panels: [initialPanel], splitDirection: "horizontal" });

    const { rerender } = render(<Panel panel={initialPanel} />);
    await act(async () => {});

    // filter input에 값 입력
    const filterInput = screen.getByPlaceholderText("리소스 검색...");
    fireEvent.change(filterInput, { target: { value: "my-pod" } });
    expect(filterInput).toHaveValue("my-pod");

    // resourceType을 deployments로 변경한 패널로 rerender
    const updatedPanel: PanelState = { ...initialPanel, resourceType: "deployments" };
    rerender(<Panel panel={updatedPanel} />);
    await act(async () => {});

    // filter가 초기화되어야 함
    await waitFor(() => {
      expect(screen.getByPlaceholderText("리소스 검색...")).toHaveValue("");
    });
  });

  it("detach button is visible in list view", async () => {
    render(<Panel panel={BASE_PANEL} />);
    await act(async () => {});
    const detachBtn = screen.getByTitle("새 창으로 분리");
    expect(detachBtn).toBeInTheDocument();
    expect(detachBtn).not.toBeDisabled();
  });

  it("shows loading text when invoke never resolves and resources are empty", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    (invoke as ReturnType<typeof vi.fn>).mockImplementation(() => new Promise(() => {}));

    render(<Panel panel={BASE_PANEL} />);
    await act(async () => {});
    expect(screen.getByText("로딩 중...")).toBeInTheDocument();
  });

  it("does not show loading text when resources already exist", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    (invoke as ReturnType<typeof vi.fn>).mockImplementation(() => new Promise(() => {}));

    useResourceStore.setState({
      resources: {
        "panel-abc": [
          { name: "nginx", namespace: "default", status: "Running", raw: {} },
        ],
      },
    });
    render(<Panel panel={BASE_PANEL} />);
    await act(async () => {});
    expect(screen.queryByText("로딩 중...")).not.toBeInTheDocument();
  });

  it("detach button calls open_panel_window invoke", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    (invoke as ReturnType<typeof vi.fn>).mockImplementation((cmd: string) => {
      if (cmd === "open_panel_window") return Promise.resolve(undefined);
      return Promise.resolve([]);
    });

    render(<Panel panel={BASE_PANEL} />);
    await act(async () => {});
    const detachBtn = screen.getByTitle("새 창으로 분리");
    fireEvent.click(detachBtn);

    await waitFor(() => {
      expect(invoke as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(
        "open_panel_window",
        expect.objectContaining({ panelId: BASE_PANEL.id })
      );
    });
  });

  it("calls get_namespaces on mount with current context", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    (invoke as ReturnType<typeof vi.fn>).mockImplementation((cmd: string) => {
      if (cmd === "get_namespaces") return Promise.resolve(["default", "kube-system", "monitoring"]);
      return Promise.resolve([]);
    });

    render(<Panel panel={BASE_PANEL} />);
    await act(async () => {});

    await waitFor(() => {
      expect(invoke as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(
        "get_namespaces",
        { context: "k3s-default" }
      );
    });
  });

  it("shows fetched namespaces in namespace dropdown after get_namespaces resolves", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    const expectedNamespaces = ["default", "kube-system", "monitoring"];
    (invoke as ReturnType<typeof vi.fn>).mockImplementation((cmd: string) => {
      if (cmd === "get_namespaces") return Promise.resolve(expectedNamespaces);
      return Promise.resolve([]);
    });

    render(<Panel panel={BASE_PANEL} />);
    await act(async () => {});

    await waitFor(() => {
      const selects = screen.getAllByRole("combobox");
      // Panel toolbar: first = context select, second = namespace select
      const nsSelect = selects[1];
      const options = Array.from(nsSelect.querySelectorAll("option")).map((o) => o.textContent);
      expect(options).toEqual(expectedNamespaces);
    });
  });
});
