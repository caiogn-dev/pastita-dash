import React, { ReactNode, Component, ErrorInfo, Suspense } from 'react';
import { FullPageLoading } from './common';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary catches errors from child components
 * and displays fallback UI instead of crashing the whole page.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-bg-token p-4">
          <div className="w-full max-w-md rounded-xl border border-border-token bg-surface-token p-8 shadow-[var(--elev-flutuante)]">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-4">
              <span className="text-2xl">⚠️</span>
            </div>

            <h1 className="mb-2 text-center font-brand text-2xl text-fg-token">
              Algo deu errado
            </h1>

            <p className="mb-4 text-center text-fg-muted-token">
              Tivemos um problema inesperado. Nada do seu trabalho foi perdido.
            </p>

            {this.state.error && (
              <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
                <p className="text-sm text-red-700 font-mono break-words">
                  {this.state.error.message}
                </p>
              </div>
            )}

            {this.state.errorInfo && (
              <details className="mb-4">
                <summary className="cursor-pointer text-sm text-fg-muted-token">
                  Detalhes técnicos
                </summary>
                <pre className="mt-2 max-h-32 overflow-auto rounded bg-bg-token p-2 text-xs text-fg-muted-token">
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}

            <button
              onClick={this.handleRetry}
              className="w-full rounded-lg bg-brand px-4 py-2 font-semibold text-on-brand hover:bg-brand-hover"
            >
              Tentar de novo
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * PageBoundary combines ErrorBoundary with Suspense for lazy-loaded page routes.
 * Wraps each lazy page to handle both loading and error states gracefully.
 */
export const PageBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary>
    <Suspense fallback={<FullPageLoading />}>
      {children}
    </Suspense>
  </ErrorBoundary>
);
