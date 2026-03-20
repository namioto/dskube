import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ResourceList from "./ResourceList";
import { ResourceItem } from "../../types/k8s";

const mockItems: ResourceItem[] = [
  { name: "app-pod", namespace: "default", status: "Running", raw: {} },
  { name: "db-pod", namespace: "default", status: "Pending", raw: {} },
];

describe("ResourceList", () => {
  it("renders resource items", () => {
    render(<ResourceList items={mockItems} onSelect={() => {}} />);
    expect(screen.getByText("app-pod")).toBeInTheDocument();
    expect(screen.getByText("db-pod")).toBeInTheDocument();
  });

  it("shows empty state when no items", () => {
    render(<ResourceList items={[]} onSelect={() => {}} />);
    expect(screen.getByText(/no resources/i)).toBeInTheDocument();
  });

  it("highlights selected item", () => {
    render(
      <ResourceList
        items={mockItems}
        onSelect={() => {}}
        selectedKey="default-app-pod"
      />
    );
    const appPodElement = screen.getByText("app-pod");
    expect(appPodElement).toBeInTheDocument();

    // Verify the row has bg-gray-700 class
    const selectedRow = appPodElement.closest("tr");
    expect(selectedRow).toHaveClass("bg-gray-700");
  });

  it("non-selected items do not have bg-gray-700 class", () => {
    render(
      <ResourceList
        items={mockItems}
        onSelect={() => {}}
        selectedKey="default-app-pod"
      />
    );
    const dbPodElement = screen.getByText("db-pod");
    const nonSelectedRow = dbPodElement.closest("tr");
    expect(nonSelectedRow).not.toHaveClass("bg-gray-700");
  });

  it("calls onSelect when a row is clicked", () => {
    const onSelect = vi.fn();
    render(<ResourceList items={mockItems} onSelect={onSelect} />);
    fireEvent.click(screen.getByText("app-pod"));
    expect(onSelect).toHaveBeenCalledWith(mockItems[0]);
  });

  it("renders age column for items with age field", () => {
    // 1시간 전 ISO 시간
    const oneHourAgo = new Date(Date.now() - 61 * 60 * 1000).toISOString();
    const items: ResourceItem[] = [
      { name: "aged-pod", namespace: "default", status: "Running", raw: {}, age: oneHourAgo },
    ];
    render(<ResourceList items={items} onSelect={() => {}} />);
    // "1h" 형태로 표시되어야 함
    expect(screen.getByText("1h")).toBeInTheDocument();
  });

  it("shows dash for items without age field", () => {
    const items: ResourceItem[] = [
      { name: "no-age-pod", namespace: "default", status: "Running", raw: {} },
    ];
    render(<ResourceList items={items} onSelect={() => {}} />);
    const dashElements = screen.getAllByText("-");
    expect(dashElements.length).toBeGreaterThan(0);
  });

  it("shows minutes for items aged less than 1 hour", () => {
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const items: ResourceItem[] = [
      { name: "new-pod", namespace: "default", status: "Running", raw: {}, age: thirtyMinsAgo },
    ];
    render(<ResourceList items={items} onSelect={() => {}} />);
    expect(screen.getByText("30m")).toBeInTheDocument();
  });

  it("shows days for items aged more than 24 hours", () => {
    const twoDaysAgo = new Date(Date.now() - 49 * 60 * 60 * 1000).toISOString();
    const items: ResourceItem[] = [
      { name: "old-pod", namespace: "default", status: "Running", raw: {}, age: twoDaysAgo },
    ];
    render(<ResourceList items={items} onSelect={() => {}} />);
    expect(screen.getByText("2d")).toBeInTheDocument();
  });

  it("highlights node item where namespace is undefined using selectedKey with empty prefix", () => {
    const nodeItems: ResourceItem[] = [
      { name: "my-node", namespace: undefined, status: "Ready", raw: {} },
    ];
    render(
      <ResourceList
        items={nodeItems}
        onSelect={() => {}}
        selectedKey="-my-node"
      />
    );
    const nodeElement = screen.getByText("my-node");
    const selectedRow = nodeElement.closest("tr");
    expect(selectedRow).toHaveClass("bg-gray-700");
  });

  it("no rows are highlighted when selectedKey is undefined", () => {
    render(
      <ResourceList
        items={mockItems}
        onSelect={() => {}}
        selectedKey={undefined}
      />
    );
    const rows = document.querySelectorAll("tr");
    rows.forEach((row) => {
      expect(row).not.toHaveClass("bg-gray-700");
    });
  });
});
