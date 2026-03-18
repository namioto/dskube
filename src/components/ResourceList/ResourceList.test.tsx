import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
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
        selectedName="app-pod"
      />
    );
    expect(screen.getByText("app-pod")).toBeInTheDocument();
  });
});
