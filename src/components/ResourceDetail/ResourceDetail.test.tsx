import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ResourceDetail from "./ResourceDetail";

const { mockInvoke } = vi.hoisted(() => ({
  mockInvoke: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@tauri-apps/api/core", () => ({ invoke: mockInvoke }));

vi.mock("js-yaml", () => ({
  default: { dump: (obj: unknown) => "name: test-resource\n" },
}));

vi.mock("../../hooks/useRbac", () => ({
  useRbac: vi.fn().mockReturnValue(true),
}));

vi.mock("../PortForward/PortForwardDialog", () => ({
  default: () => null,
}));

const mockResource = {
  name: "test-pod",
  namespace: "default",
  raw: { apiVersion: "v1", kind: "Pod" },
};

describe("ResourceDetail", () => {
  beforeEach(() => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });
  it("renders resource.name", () => {
    render(
      <ResourceDetail
        resource={mockResource}
        context="test-ctx"
        onClose={() => {}}
      />
    );
    expect(screen.getByText("test-pod")).toBeInTheDocument();
  });

  it("displays YAML text in textarea", () => {
    render(
      <ResourceDetail
        resource={mockResource}
        context="test-ctx"
        onClose={() => {}}
      />
    );
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    expect(textarea.value).toBe("name: test-resource\n");
  });

  it("calls onClose when Close button is clicked", () => {
    const onClose = vi.fn();
    render(
      <ResourceDetail
        resource={mockResource}
        context="test-ctx"
        onClose={onClose}
      />
    );
    fireEvent.click(screen.getByText("Close"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls invoke with correct args when Apply is clicked", async () => {
    mockInvoke.mockResolvedValueOnce(undefined);
    render(
      <ResourceDetail
        resource={mockResource}
        context="test-ctx"
        onClose={() => {}}
      />
    );
    fireEvent.click(screen.getByText("Apply"));
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("cmd_apply_resource", {
        context: "test-ctx",
        yaml: "name: test-resource\n",
      });
    });
  });

  it("shows error message when invoke rejects", async () => {
    mockInvoke.mockRejectedValueOnce("apply failed");
    render(
      <ResourceDetail
        resource={mockResource}
        context="test-ctx"
        onClose={() => {}}
      />
    );
    fireEvent.click(screen.getByText("Apply"));
    await waitFor(() => {
      expect(screen.getByText("apply failed")).toBeInTheDocument();
    });
  });

  it("disables Close button while saving", async () => {
    mockInvoke.mockImplementation(() => new Promise(() => {})); // never resolves
    render(
      <ResourceDetail
        resource={mockResource}
        context="prod"
        onClose={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText("Apply"));
    await waitFor(() => {
      expect(screen.getByText("Close")).toBeDisabled();
    });
  });

  it("shows Applied feedback after successful save", async () => {
    mockInvoke.mockResolvedValue(undefined);
    render(
      <ResourceDetail resource={mockResource} context="prod" onClose={vi.fn()} />
    );
    fireEvent.click(screen.getByText("Apply"));
    await waitFor(() => {
      expect(screen.getByText(/Applied/)).toBeInTheDocument();
    });
  });
});
