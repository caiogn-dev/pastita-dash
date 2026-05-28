import React, { Component, ErrorInfo, ReactNode, Suspense } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './molecules/Card';

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
    console.error('Uncaught error:', error, errorInfo);
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
              
              {this.state.error && (
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

const PageLoadingFallback: React.FC = () => (
  <div className="flex items-center justify-center h-64">
    <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
  </div>
);

const PageErrorFallback: React.FC<{ error: Error | null; onRetry: () => void }> = ({ error, onRetry }) => (
  <div className="flex items-center justify-center min-h-[400px] p-4">
    <Card className="max-w-md w-full">
      <CardHeader>
        <CardTitle className="text-red-600 dark:text-red-400 text-base">
          Erro ao carregar a página
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Ocorreu um erro inesperado nesta seção. As outras partes do painel continuam funcionando.
        </p>
        {error && (
          <p className="text-xs font-mono text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 p-2 rounded truncate">
            {error.message}
          </p>
        )}
        <Button onClick={onRetry} variant="primary" size="sm">
          Tentar novamente
        </Button>
      </CardContent>
    </Card>
  </div>
);

class PageErrorBoundaryInner extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[PageErrorBoundary]', error, info.componentStack);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return <PageErrorFallback error={this.state.error} onRetry={this.handleRetry} />;
    }
    return this.props.children;
  }
}

export const PageWrapper: React.FC<{ children: ReactNode }> = ({ children }) => (
  <PageErrorBoundaryInner>
    <Suspense fallback={<PageLoadingFallback />}>
      {children}
    </Suspense>
  </PageErrorBoundaryInner>
);
