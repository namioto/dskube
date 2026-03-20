import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ErrorBoundary } from "./ErrorBoundary";

// 에러를 발생시키는 컴포넌트
function ThrowError({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error("Test error message");
  }
  return <div>정상 렌더링</div>;
}

describe("ErrorBoundary", () => {
  it("renders children when there is no error", () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );
    expect(screen.getByText("정상 렌더링")).toBeInTheDocument();
  });

  it("renders error UI when child throws", () => {
    // vitest/jsdom은 console.error를 출력하므로 suppression
    const consoleError = console.error;
    console.error = () => {};

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText("앱 초기화 오류")).toBeInTheDocument();
    console.error = consoleError;
  });

  it("shows error message in error UI", () => {
    const consoleError = console.error;
    console.error = () => {};

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Test error message/)).toBeInTheDocument();
    console.error = consoleError;
  });

  it("does not show error UI when children render normally", () => {
    render(
      <ErrorBoundary>
        <div>정상 컨텐츠</div>
      </ErrorBoundary>
    );
    expect(screen.queryByText("앱 초기화 오류")).not.toBeInTheDocument();
  });
});
