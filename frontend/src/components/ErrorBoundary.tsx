import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background dark:bg-gray-950">
          <AlertTriangle className="mb-4 h-12 w-12 text-danger/70" />
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Application Error
          </h1>
          <p className="mt-2 max-w-sm text-center text-sm text-gray-500 dark:text-gray-400">
            {this.state.error?.message ?? 'An unexpected error occurred.'}
          </p>
          <div className="mt-6 flex gap-3">
            <Button variant="primary" onClick={this.handleReset}>
              Try Again
            </Button>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Reload Page
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
