import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import Onboarding from "./Onboarding";

describe("Onboarding", () => {
  it("renders the kubeconfig error title", () => {
    render(<Onboarding onRetry={vi.fn()} />);
    expect(screen.getByText("kubeconfig를 찾을 수 없습니다.")).toBeInTheDocument();
  });

  it("renders retry button", () => {
    render(<Onboarding onRetry={vi.fn()} />);
    expect(screen.getByText("다시 시도")).toBeInTheDocument();
  });

  it("calls onRetry when retry button is clicked", async () => {
    const onRetry = vi.fn();
    render(<Onboarding onRetry={onRetry} />);
    await act(async () => {
      fireEvent.click(screen.getByText("다시 시도"));
    });
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("renders all 3 step command hints", () => {
    render(<Onboarding onRetry={vi.fn()} />);
    expect(screen.getByText("kubectl config view")).toBeInTheDocument();
    expect(screen.getByText("~/.kube/config")).toBeInTheDocument();
    expect(screen.getByText("kubectl cluster-info")).toBeInTheDocument();
  });

  it("shows loading text while onRetry is pending", async () => {
    let resolveRetry!: () => void;
    const pendingRetry = () => new Promise<void>((resolve) => { resolveRetry = resolve; });
    render(<Onboarding onRetry={pendingRetry} />);
    fireEvent.click(screen.getByText("다시 시도"));
    expect(screen.getByText("연결 중...")).toBeInTheDocument();
    resolveRetry();
    await waitFor(() => expect(screen.getByText("다시 시도")).toBeInTheDocument());
  });

  it("button is disabled while loading", async () => {
    const pendingRetry = () => new Promise<void>(() => {});
    render(<Onboarding onRetry={pendingRetry} />);
    fireEvent.click(screen.getByText("다시 시도"));
    expect(screen.getByRole("button")).toBeDisabled();
  });
});
