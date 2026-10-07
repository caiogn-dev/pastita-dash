import React, { ReactNode, Component, ErrorInfo, Suspense } from 'react';
import { FullPageLoading } from './common';
import { reportarErro } from '../services/reportarErro';

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
    // O detalhe vai para o GlitchTip; a tela do lojista fica só com o que ele pode fazer.
    reportarErro(error, 'render', errorInfo.componentStack || '');
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
          <div className="w-full max-w-md superficie p-8 shadow-[var(--elev-flutuante)]">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-danger-soft mx-auto mb-4">
              <span className="text-2xl">⚠️</span>
            </div>

            <h1 className="mb-2 text-center font-brand text-2xl text-fg-token">
              Algo deu errado
            </h1>

            <p className="mb-4 text-center text-fg-muted-token">
              Tivemos um problema inesperado. Nada do seu trabalho foi perdido.
            </p>

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
