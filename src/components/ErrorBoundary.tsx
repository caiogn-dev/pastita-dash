import React, { ReactNode, Component, ErrorInfo } from 'react';

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
        <div className="min-h-screen flex items-center justify-center bg-red-50 p-4">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-4">
              <span className="text-2xl">⚠️</span>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">
              Something went wrong
            </h1>

            <p className="text-gray-600 text-center mb-4">
              An unexpected error occurred.
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
                <summary className="text-sm text-gray-600 cursor-pointer">
                  Technical details
                </summary>
                <pre className="text-xs text-gray-600 mt-2 p-2 bg-gray-100 rounded overflow-auto max-h-32">
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}

            <button
              onClick={this.handleRetry}
              className="w-full bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
