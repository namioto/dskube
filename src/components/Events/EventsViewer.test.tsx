import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import EventsViewer from "./EventsViewer";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

import { invoke } from "@tauri-apps/api/core";
const mockInvoke = vi.mocked(invoke);

const mockEvents = [
  {
    type_: "Warning",
    reason: "BackOff",
    message: "Back-off restarting failed container",
    object_name: "my-pod",
    object_kind: "Pod",
    count: 5,
    age: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    namespace: "default",
  },
  {
    type_: "Normal",
    reason: "Pulled",
    message: "Successfully pulled image",
    object_name: "my-pod",
    object_kind: "Pod",
    count: 1,
    age: new Date(Date.now() - 60000).toISOString(), // 1 min ago
    namespace: "default",
  },
];

describe("EventsViewer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading state initially", () => {
    mockInvoke.mockImplementation(() => new Promise(() => {}));
    render(<EventsViewer context="test-ctx" />);
    expect(screen.getByText(/로딩/)).toBeDefined();
  });

  it("renders events table after loading", async () => {
    mockInvoke.mockResolvedValue(mockEvents);
    render(<EventsViewer context="test-ctx" />);
    await waitFor(() => {
      expect(screen.getByText("BackOff")).toBeDefined();
      expect(screen.getByText("Pulled")).toBeDefined();
    });
  });

  it("shows Warning type in yellow style", async () => {
    mockInvoke.mockResolvedValue(mockEvents);
    render(<EventsViewer context="test-ctx" />);
    await waitFor(() => {
      const warningCell = screen.getByText("Warning");
      expect(warningCell.className).toContain("yellow");
    });
  });

  it("shows empty state when no events", async () => {
    mockInvoke.mockResolvedValue([]);
    render(<EventsViewer context="test-ctx" />);
    await waitFor(() => {
      expect(screen.getByText(/이벤트 없음/)).toBeDefined();
    });
  });

  it("shows error state on fetch failure", async () => {
    mockInvoke.mockRejectedValue(new Error("connection refused"));
    render(<EventsViewer context="test-ctx" />);
    await waitFor(() => {
      expect(screen.getByText(/connection refused/)).toBeDefined();
    });
  });
});
