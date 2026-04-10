import { Component, type ReactNode, type ErrorInfo } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="flex flex-col items-center justify-center h-full gap-3 p-8"
          style={{ background: 'var(--bg-primary)' }}
        >
          <AlertTriangle size={36} style={{ color: 'var(--danger)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--danger)' }}>
            {this.props.fallbackMessage ?? 'Something went wrong rendering this chart'}
          </p>
          <p className="text-xs max-w-md text-center" style={{ color: 'var(--text-muted)' }}>
            {this.state.error?.message}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-3 py-1.5 rounded text-xs font-medium mt-2"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
