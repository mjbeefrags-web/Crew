import { Component, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { failed: boolean; attempts: number };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false, attempts: 0 };

  static getDerivedStateFromError(): Partial<State> {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error("[crewww] route render failed", error);
    // A failed lazy chunk is the most common cause; a plain retry is the
    // highest-value recovery. Report to any globally installed tracker.
    window.dispatchEvent(
      new CustomEvent("crewww:error", { detail: { error } }),
    );
  }

  private retry = () => {
    this.setState((state) => ({ failed: false, attempts: state.attempts + 1 }));
  };

  render() {
    if (this.state.failed) {
      return (
        <RetryRouteBoundary
          attempts={this.state.attempts}
          onRetry={this.retry}
        />
      );
    }
    return this.props.children;
  }
}

function RetryRouteBoundary({
  attempts,
  onRetry,
}: {
  attempts: number;
  onRetry: () => void;
}) {
  return (
    <div className="catalog-skeleton" role="alert">
      <p>
        The page could not load right now.{" "}
        <button type="button" onClick={onRetry}>
          Retry.
        </button>
        {attempts > 0 && (
          <>
            {" "}
            Still stuck?{" "}
            <button
              type="button"
              onClick={() => window.location.reload()}
            >
              Reload the store.
            </button>
          </>
        )}
      </p>
    </div>
  );
}
