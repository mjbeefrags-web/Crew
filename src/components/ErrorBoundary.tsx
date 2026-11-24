import { Component, type ReactNode } from 'react';

type Props = { children: ReactNode };

export class ErrorBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() { return { failed: true }; }

  componentDidCatch(error: unknown) {
    console.error('[crewww] route render failed', error);
    // A failed lazy chunk is the most common cause; a plain retry is the
    // highest-value recovery. Report to any globally installed tracker.
    window.dispatchEvent(new CustomEvent('crewww:error', { detail: { error } }));
  }

  render() {
    if (this.state.failed) {
      return <RetryRouteBoundary onRetry={() => this.setState({ failed: false })} />;
    }
    return this.props.children;
  }
}

function RetryRouteBoundary({ onRetry }: { onRetry: () => void }) {
  return <div className="catalog-skeleton" role="alert">
    <p>The page could not load right now. <button type="button" onClick={onRetry}>Retry.</button></p>
  </div>;
}
