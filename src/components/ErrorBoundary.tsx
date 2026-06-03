import React, { Component, ErrorInfo, ReactNode, Suspense } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './molecules/Card';
import { FullPageLoading } from './common';

const isDev = import.meta.env.DEV;

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Only log full details in dev — avoid exposing stack traces in production logs
    if (isDev) {
      console.error('Uncaught error:', error, errorInfo);
    }
    this.setState({ error, errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-zinc-50 dark:bg-black">
          <Card className="max-w-lg w-full">
            <CardHeader>
              <CardTitle className="text-red-600 dark:text-red-400">
                Algo deu errado
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-zinc-600 dark:text-zinc-400">
                Ocorreu um erro inesperado. Tente recarregar a página.
              </p>

              {/* Show error details only in dev to avoid leaking internal info */}
              {isDev && this.state.error && (
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg overflow-auto">
                  <p className="text-sm font-mono text-red-800 dark:text-red-200">
                    {this.state.error.toString()}
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <Button onClick={this.handleReset} variant="primary">
                  Recarregar página
                </Button>
                <Button
                  onClick={() => window.location.href = '/'}
                  variant="secondary"
                >
                  Voltar ao início
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Lightweight fallback shown when a lazy page chunk fails to load (e.g. network
 * error or stale bundle hash after a deploy).  Wraps Suspense + ErrorBoundary so
 * a single chunk failure doesn't crash the entire app.
 */
const ChunkErrorFallback: React.FC<{ onRetry: () => void }> = ({ onRetry }) => (
  <div className="flex flex-col items-center justify-center h-64 gap-4 text-zinc-500 dark:text-zinc-400">
    <p className="text-sm">Falha ao carregar a página.</p>
    <Button onClick={onRetry} variant="secondary" size="sm">
      Tentar novamente
    </Button>
  </div>
);

class PageErrorBoundaryInner extends Component<Props, State> {
  public state: State = { hasError: false, error: null, errorInfo: null };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (isDev) console.error('[PageBoundary]', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render() {
    if (this.state.hasError) {
      return <ChunkErrorFallback onRetry={this.handleRetry} />;
    }
    return this.props.children;
  }
}

/**
 * Use this to wrap each lazy-loaded page instead of bare <Suspense>.
 * Catches both loading fallback and runtime errors without crashing the whole app.
 */
export const PageBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <PageErrorBoundaryInner>
    <Suspense fallback={<FullPageLoading />}>
      {children}
    </Suspense>
  </PageErrorBoundaryInner>
);
