import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled error in component tree:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ textAlign: 'center', maxWidth: 420 }}>
            <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: 40, color: 'var(--danger)', marginBottom: 16, display: 'block' }}></i>
            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Something went wrong</h2>
            <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 20 }}>
              An unexpected error occurred. Try reloading the page — if it keeps happening, please contact support.
            </p>
            <button onClick={() => window.location.reload()} className="btn-primary btn-inline">
              <i className="fa-solid fa-rotate-right"></i> Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
