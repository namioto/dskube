import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Sidebar from "./Sidebar";

describe("Sidebar", () => {
  it("renders all resource type labels", () => {
    const onSelect = vi.fn();
    render(<Sidebar selected="pods" onSelect={onSelect} />);

    expect(screen.getByText("Pods")).toBeInTheDocument();
    expect(screen.getByText("Deployments")).toBeInTheDocument();
    expect(screen.getByText("Services")).toBeInTheDocument();
    expect(screen.getByText("ConfigMaps")).toBeInTheDocument();
    expect(screen.getByText("Secrets")).toBeInTheDocument();
    expect(screen.getByText("StatefulSets")).toBeInTheDocument();
    expect(screen.getByText("DaemonSets")).toBeInTheDocument();
    expect(screen.getByText("Ingress")).toBeInTheDocument();
    expect(screen.getByText("Namespaces")).toBeInTheDocument();
    expect(screen.getByText("Nodes")).toBeInTheDocument();
    expect(screen.getByText("Jobs")).toBeInTheDocument();
    expect(screen.getByText("CronJobs")).toBeInTheDocument();
    expect(screen.getByText("PersistentVolumes")).toBeInTheDocument();
    expect(screen.getByText("PersistentVolumeClaims")).toBeInTheDocument();
    expect(screen.getByText("Events")).toBeInTheDocument();
  });

  it("renders 15 buttons", () => {
    const onSelect = vi.fn();
    render(<Sidebar selected="pods" onSelect={onSelect} />);

    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(16);
  });

  it("applies active class to selected button", () => {
    const onSelect = vi.fn();
    render(<Sidebar selected="pods" onSelect={onSelect} />);

    const podsButton = screen.getByText("Pods");
    expect(podsButton).toHaveClass("text-blue-400");
  });

  it("calls onSelect with correct value on button click", () => {
    const onSelect = vi.fn();
    render(<Sidebar selected="pods" onSelect={onSelect} />);

    const deploymentsButton = screen.getByText("Deployments");
    fireEvent.click(deploymentsButton);

    expect(onSelect).toHaveBeenCalledWith("deployments");
  });
});
