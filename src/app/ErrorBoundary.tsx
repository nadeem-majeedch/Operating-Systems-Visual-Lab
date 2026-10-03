import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button, Card } from '@/components';

interface ErrorBoundaryProps {
  readonly children: ReactNode;
}

interface ErrorBoundaryState {
  readonly error: Error | null;
}

/**
 * Last line of defence: a rendering bug in one lab should never leave the learner
 * with a blank page. Provides a reload action instead.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // No telemetry by design — log locally so the failure is at least visible.
    console.error('Operating Systems Visual Lab crashed while rendering.', error, info);
  }

  private readonly handleReload = (): void => {
    window.location.reload();
  };

  override render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="page">
        <Card className="lab__panel">
          <h1 className="page-header__title">Something went wrong</h1>
          <p className="page-header__lead">
            The app hit an unexpected error while rendering. Your work is not stored anywhere, so a
            reload simply restarts the lab.
          </p>
          <pre className="code-card__error">{error.message}</pre>
          <div className="cta-card__actions">
            <Button variant="primary" onClick={this.handleReload}>
              Reload the lab
            </Button>
          </div>
        </Card>
      </div>
    );
  }
}
