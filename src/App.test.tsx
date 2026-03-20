import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import App from "./App";
import { usePanelStore } from "./store/panelStore";
import { useClusterStore } from "./store/clusterStore";
import { useResourceStore } from "./store/resourceStore";

const { mockInvoke } = vi.hoisted(() => ({
  mockInvoke: vi.fn(),
}));

vi.mock("@tauri-apps/api/core", () => ({ invoke: mockInvoke }));
vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn().mockResolvedValue(() => {}),
}));

const mockContexts = [{ name: "prod", cluster: "prod-cluster" }];

describe("App", () => {
  beforeEach(() => {
    usePanelStore.setState({ panels: [], splitDirection: "horizontal" });
    useClusterStore.setState({
      contexts: [],
      currentContext: "",
      namespaces: ["default"],
    });
    useResourceStore.setState({ resources: {} });
    mockInvoke.mockReset();
  });

  it("renders without crashing", async () => {
    mockInvoke.mockResolvedValue([]);
    render(<App />);
    await act(async () => {});
  });

  it("shows loading state before get_contexts resolves", () => {
    mockInvoke.mockImplementation(() => new Promise(() => {})); // never resolves
    render(<App />);
    expect(screen.getByText("연결 중...")).toBeInTheDocument();
  });

  it("shows onboarding when kubeconfig has no contexts", async () => {
    mockInvoke.mockResolvedValue([]);
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText(/kubeconfig를 찾을 수 없습니다/)).toBeInTheDocument();
    });
  });

  it("shows dskube brand in TopBar when contexts exist", async () => {
    mockInvoke.mockImplementation((cmd: string) => {
      if (cmd === "get_contexts") return Promise.resolve(mockContexts);
      if (cmd === "get_namespaces") return Promise.resolve(["default"]);
      return Promise.resolve([]);
    });
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText("dskube")).toBeInTheDocument();
    });
  });

  it("shows PanelContainer add button when contexts exist", async () => {
    mockInvoke.mockImplementation((cmd: string) => {
      if (cmd === "get_contexts") return Promise.resolve(mockContexts);
      if (cmd === "get_namespaces") return Promise.resolve(["default"]);
      return Promise.resolve([]);
    });
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText("+ 패널 추가")).toBeInTheDocument();
    });
  });

  it("renders loading state in DetachedWindow when panel not yet loaded", async () => {
    // window.location.search를 mock하여 panel=test-panel-id 설정
    Object.defineProperty(window, "location", {
      value: { search: "?panel=test-panel-id" },
      writable: true,
    });

    mockInvoke.mockImplementation((cmd: string) => {
      if (cmd === "get_panel_init_state") return new Promise(() => {}); // never resolves
      return Promise.resolve([]);
    });

    render(<App />);
    // panel이 로딩 중일 때 메시지
    expect(screen.getByText("패널 로딩 중...")).toBeInTheDocument();

    // 테스트 후 원래 location으로 복구
    Object.defineProperty(window, "location", {
      value: { search: "" },
      writable: true,
    });
  });
});
